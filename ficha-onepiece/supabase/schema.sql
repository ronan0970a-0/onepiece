-- =====================================================================
--  Ficha RPG One Piece — schema do Supabase
--  Cole TUDO isto no SQL Editor do Supabase e execute uma vez.
--  É seguro rodar de novo (usa "if not exists" / "or replace" / "drop policy if exists").
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) MESTRES: quem é mestre é decidido por esta tabela (por email).
--    Ninguém consegue ler nem alterar pela API: só pelo SQL Editor.
--    Para cadastrar o mestre depois (troque pelo email real):
--
--      insert into public.masters (email) values ('email-do-mestre@exemplo.com');
--
--    Para remover:  delete from public.masters where email = 'email-do-mestre@exemplo.com';
-- ---------------------------------------------------------------------
create table if not exists public.masters (
  email text primary key check (email = lower(email))
);
alter table public.masters enable row level security;
-- (sem policies de propósito: a tabela fica fechada para a API)

-- Só vale como mestre quem TEM O EMAIL CONFIRMADO. Isso impede que alguém
-- crie uma conta com o email do mestre sem ser dono dele.
create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    join public.masters m on m.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_master() from public;
grant execute on function public.is_master() to authenticated;

-- ---------------------------------------------------------------------
-- 2) FICHAS: uma ficha por conta de jogador.
--    name / klass / bounty são cópias de campos do JSON "data",
--    só para o painel do mestre listar sem baixar tudo.
-- ---------------------------------------------------------------------
create table if not exists public.sheets (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null unique references auth.users (id) on delete cascade,
  name        text not null default '',
  klass       text not null default 'pirata' check (klass in ('pirata', 'marinha', 'outros')),
  bounty      bigint not null default 0 check (bounty >= 0),
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

create or replace function public.touch_sheet()
returns trigger
language plpgsql
as $$
begin
  new.owner      := old.owner;      -- ninguém "transfere" a ficha
  new.updated_at := now();
  new.updated_by := auth.uid();     -- o app usa isto para saber quem editou por último
  return new;
end;
$$;

drop trigger if exists sheets_touch on public.sheets;
create trigger sheets_touch
  before update on public.sheets
  for each row execute function public.touch_sheet();

alter table public.sheets enable row level security;

drop policy if exists sheets_select on public.sheets;
create policy sheets_select on public.sheets for select to authenticated
  using (owner = auth.uid() or public.is_master());

drop policy if exists sheets_insert on public.sheets;
create policy sheets_insert on public.sheets for insert to authenticated
  with check (owner = auth.uid());

drop policy if exists sheets_update on public.sheets;
create policy sheets_update on public.sheets for update to authenticated
  using (owner = auth.uid() or public.is_master())
  with check (owner = auth.uid() or public.is_master());

drop policy if exists sheets_delete on public.sheets;
create policy sheets_delete on public.sheets for delete to authenticated
  using (owner = auth.uid() or public.is_master());

-- ---------------------------------------------------------------------
-- 3) HISTÓRICO DE DADOS
--    O cliente NÃO consegue inserir direto na tabela: toda rolagem passa por
--    roll_dice(), que sorteia no servidor. Assim ninguém falsifica resultado.
--    Jogador vê só as próprias rolagens; o mestre vê todas.
-- ---------------------------------------------------------------------
create table if not exists public.rolls (
  id              bigint generated always as identity primary key,
  sheet_id        uuid references public.sheets (id) on delete set null,
  owner           uuid not null references auth.users (id) on delete cascade,
  character_name  text not null,
  label           text not null default '',
  dice_count      int  not null,
  dice_sides      int  not null,
  modifier        int  not null default 0,
  results         int[] not null,
  total           int  not null,
  created_at      timestamptz not null default now()
);
create index if not exists rolls_created_idx on public.rolls (created_at desc);
create index if not exists rolls_owner_idx on public.rolls (owner, created_at desc);

alter table public.rolls enable row level security;

drop policy if exists rolls_select on public.rolls;
create policy rolls_select on public.rolls for select to authenticated
  using (owner = auth.uid() or public.is_master());
-- (sem policy de insert/update/delete de propósito)

create or replace function public.roll_dice(
  p_sheet    uuid,
  p_label    text,
  p_count    int,
  p_sides    int,
  p_modifier int
)
returns public.rolls
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_name    text;
  v_results int[] := '{}';
  v_i       int;
  v_row     public.rolls;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_count < 1 or p_count > 20 then raise exception 'invalid dice count'; end if;
  if p_sides not in (2, 4, 6, 8, 10, 12, 20, 100) then raise exception 'invalid dice sides'; end if;
  if p_modifier < -9999 or p_modifier > 9999 then raise exception 'invalid modifier'; end if;

  if p_sheet is null then
    -- rolagem "do Mestre" (sem ficha)
    if not public.is_master() then raise exception 'sheet required'; end if;
    v_name := 'Mestre';
  else
    -- jogador só rola na PRÓPRIA ficha
    select coalesce(nullif(s.name, ''), 'Sem nome') into v_name
    from public.sheets s
    where s.id = p_sheet and s.owner = v_uid;
    if not found then raise exception 'sheet not found'; end if;
  end if;

  for v_i in 1 .. p_count loop
    v_results := v_results || (floor(random() * p_sides)::int + 1);
  end loop;

  insert into public.rolls (sheet_id, owner, character_name, label, dice_count, dice_sides, modifier, results, total)
  values (
    p_sheet, v_uid, v_name, left(coalesce(p_label, ''), 60),
    p_count, p_sides, p_modifier, v_results,
    (select coalesce(sum(x), 0) from unnest(v_results) as x) + p_modifier
  )
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.roll_dice(uuid, text, int, int, int) from public;
grant execute on function public.roll_dice(uuid, text, int, int, int) to authenticated;

-- ---------------------------------------------------------------------
-- 4) TEMPO REAL (o painel do mestre e o histórico atualizam sozinhos)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sheets') then
    alter publication supabase_realtime add table public.sheets;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rolls') then
    alter publication supabase_realtime add table public.rolls;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5) FOTOS DOS PERSONAGENS (Storage)
--    Bucket público para leitura (o link da foto funciona direto no <img>).
--    Só o dono (pasta com o próprio id) ou o mestre podem enviar/apagar.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('character-photos', 'character-photos', true)
on conflict (id) do nothing;

drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'character-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_master())
  );

drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'character-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_master())
  );
