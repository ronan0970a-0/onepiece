-- =====================================================================
--  Ficha RPG One Piece — ATUALIZAÇÃO 2: NPCs / Bosses + quadro de Procurados (Marinha)
--
--  Quem JÁ rodou o schema.sql: rode só este arquivo (SQL Editor → cole tudo → Run).
--  Instalação nova: rode primeiro o schema.sql e depois este.
--  É seguro rodar de novo (if not exists / or replace / drop ... if exists).
--
--  O que muda nas permissões:
--    • NPCs: o dono (jogador ou mestre) vê e edita os seus; o mestre vê e edita TODOS.
--    • Só o mestre cria Boss e "revela" um NPC aos jogadores.
--    • Jogadores NÃO veem as fichas dos NPCs de ninguém. Quando o mestre revela um NPC,
--      todos veem só a identidade dele (foto, nome, recompensa) — nunca HP nem status.
--    • Quadro de Procurados: só quem tem ficha da Marinha (e o mestre) enxerga os piratas,
--      e apenas nome, foto, patente e recompensa — nunca a ficha completa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) NPCs (mesmo formato de dados da ficha, em outra tabela)
--    name / klass / bounty são cópias de campos do JSON "data" (para listar e ordenar).
-- ---------------------------------------------------------------------
create table if not exists public.npcs (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  by_master   boolean not null default false,            -- criado por um mestre?
  kind        text not null default 'npc' check (kind in ('npc', 'boss')),
  revealed    boolean not null default false,            -- identidade visível aos jogadores?
  name        text not null default '',
  klass       text not null default 'outros' check (klass in ('pirata', 'marinha', 'outros')),
  bounty      bigint not null default 0 check (bounty >= 0),
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);
create index if not exists npcs_owner_idx on public.npcs (owner);
create index if not exists npcs_revealed_idx on public.npcs (revealed) where revealed;

-- Guarda as regras que o cliente não pode burlar:
--  • ninguém "transfere" um NPC;
--  • jogador só cria NPC comum (não Boss) e não consegue revelar;
--  • limite de 50 NPCs por jogador (evita lotar o banco);
--  • quando o SQL Editor (sem login) edita, nada é forçado.
create or replace function public.npcs_guard()
returns trigger
language plpgsql
as $$
declare
  v_player boolean := auth.uid() is not null and not public.is_master();
begin
  if tg_op = 'INSERT' then
    new.by_master := public.is_master();
    if v_player then
      new.kind := 'npc';
      new.revealed := false;
      if (select count(*) from public.npcs n where n.owner = new.owner) >= 50 then
        raise exception 'Limite de 50 NPCs por jogador atingido.';
      end if;
    end if;
  else
    new.owner := old.owner;
    new.by_master := old.by_master;
    if v_player then
      new.kind := old.kind;
      new.revealed := old.revealed;
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists npcs_guard on public.npcs;
create trigger npcs_guard
  before insert or update on public.npcs
  for each row execute function public.npcs_guard();

alter table public.npcs enable row level security;

drop policy if exists npcs_select on public.npcs;
create policy npcs_select on public.npcs for select to authenticated
  using (owner = auth.uid() or public.is_master());

drop policy if exists npcs_insert on public.npcs;
create policy npcs_insert on public.npcs for insert to authenticated
  with check (owner = auth.uid());

drop policy if exists npcs_update on public.npcs;
create policy npcs_update on public.npcs for update to authenticated
  using (owner = auth.uid() or public.is_master())
  with check (owner = auth.uid() or public.is_master());

drop policy if exists npcs_delete on public.npcs;
create policy npcs_delete on public.npcs for delete to authenticated
  using (owner = auth.uid() or public.is_master());

-- ---------------------------------------------------------------------
-- 2) NPCs REVELADOS: todo jogador logado vê só a identidade (sem HP/status/itens).
-- ---------------------------------------------------------------------
create or replace function public.revealed_npcs()
returns table (
  id        uuid,
  kind      text,
  name      text,
  klass     text,
  bounty    bigint,
  photo_url text,
  rank      text,
  race      text
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.kind, n.name, n.klass, n.bounty,
         coalesce(n.data ->> 'photoUrl', ''),
         coalesce(n.data ->> 'rank', ''),
         coalesce(n.data ->> 'race', '')
  from public.npcs n
  where n.revealed and auth.uid() is not null
  order by n.updated_at desc;
$$;
revoke all on function public.revealed_npcs() from public;
grant execute on function public.revealed_npcs() to authenticated;

-- ---------------------------------------------------------------------
-- 3) QUADRO DE PROCURADOS (Marinha): piratas jogadores + NPCs piratas revelados.
--    Só quem tem ficha da Marinha (ou o mestre) consegue chamar; devolve o mínimo necessário.
-- ---------------------------------------------------------------------
create or replace function public.wanted_board()
returns table (
  source    text,      -- 'player' | 'npc'
  id        uuid,
  name      text,
  bounty    bigint,
  photo_url text,
  rank      text,
  kind      text       -- '' para jogador; 'npc' | 'boss' para NPC
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not (
    public.is_master()
    or exists (select 1 from public.sheets s where s.owner = auth.uid() and s.klass = 'marinha')
  ) then
    raise exception 'Somente a Marinha pode ver o quadro de procurados.';
  end if;

  return query
    select 'player'::text, s.id, s.name, s.bounty,
           coalesce(s.data ->> 'photoUrl', ''), coalesce(s.data ->> 'rank', ''), ''::text
    from public.sheets s
    where s.klass = 'pirata'
    union all
    select 'npc'::text, n.id, n.name, n.bounty,
           coalesce(n.data ->> 'photoUrl', ''), coalesce(n.data ->> 'rank', ''), n.kind
    from public.npcs n
    where n.klass = 'pirata' and n.revealed
    order by 4 desc, 3;
end;
$$;
revoke all on function public.wanted_board() from public;
grant execute on function public.wanted_board() to authenticated;

-- ---------------------------------------------------------------------
-- 4) TEMPO REAL
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'npcs') then
    alter publication supabase_realtime add table public.npcs;
  end if;
end $$;
