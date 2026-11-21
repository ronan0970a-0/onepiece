# Ficha RPG — One Piece

React + TypeScript (Vite) · Supabase (login, banco, tempo real, fotos) · Vercel (host).

- **Jogador:** cria a ficha escolhendo **Pirata / Marinha / Outros**, edita tudo (salva sozinho), rola dados, importa/exporta JSON.
- **Pirata:** cartaz *WANTED* com foto, nome e recompensa ao lado da ficha.
- **Marinha:** logo Marine no header + cartão de identificação + aba **Procurados** (cartazes de todos os piratas, com nível de perigo).
- **NPCs:** todo jogador tem uma aba **NPCs** (cria NPCs com ficha completa); o mestre tem uma seção própria **NPCs e Bosses**, separada dos jogadores.
- **Outros:** tema preto/branco com **cor de destaque** e modo claro/escuro à escolha.
- **Mestre:** vê e edita todas as fichas, tem o **histórico geral de dados** em tempo real e o quadro de **Procurados**. O botão **Minha ficha** (no painel) abre a ficha pessoal do mestre, com as mesmas abas dos jogadores (Ficha / Procurados / NPCs); o botão **← Painel do Mestre** volta ao painel.
- **Temas translúcidos:** Pirata e Marinha mostram o barco (`public/assets/pirate-ship.jpg` / `marine-ship.jpg`) como fundo fixo, com painéis em “vidro fosco”.

## 1. Supabase

1. Crie um projeto em <https://supabase.com>.
2. **SQL Editor → New query** → cole o conteúdo de `supabase/schema.sql` → **Run**. Depois faça o mesmo com `supabase/02-npcs-e-procurados.sql` (NPCs, Bosses e quadro de Procurados).
   - Já tinha rodado o `schema.sql` antes? Rode **só o `02-…`**. Os dois são seguros de rodar de novo.
   - Sem o `02-…`, o resto do app funciona normalmente; as abas **NPCs** e **Procurados** mostram um aviso pedindo para rodá-lo.
3. **Authentication → Providers → Email:** deixe **"Confirm email" LIGADO** (a segurança do mestre depende disso, veja "Decisões").
4. **Project Settings → API:** copie a *Project URL* e a chave *anon / publishable*.

## 2. Rodar local

```bash
npm install
cp .env.example .env.local    # preencha as duas variáveis
npm run dev
```

## 3. Vercel

1. Suba o projeto no GitHub e importe na Vercel (detecta Vite sozinho).
2. **Settings → Environment Variables:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Depois, no Supabase: **Authentication → URL Configuration** → coloque o endereço da Vercel em *Site URL* (para o link do email de confirmação).

## 4. Cadastrar o mestre (quando você tiver o email)

1. A pessoa cria conta no site normalmente e **confirma o email**.
2. No SQL Editor:

```sql
insert into public.masters (email) values ('email-do-mestre@exemplo.com');  -- em minúsculas
```

Na próxima vez que ela entrar, aparece o **Painel do Mestre**. Para remover: `delete from public.masters where email = '...';`

> Se essa conta já tinha criado uma ficha de jogador, ela continua no banco (o mestre só deixa de vê-la como jogador).

## NPCs, Bosses e Procurados

**Quem vê o quê**

| | Jogador | Marinha | Mestre |
|---|---|---|---|
| Ficha completa dos **próprios** NPCs | sim | sim | sim |
| Ficha completa dos NPCs **de outros** | não | não | **sim (todos)** |
| Criar **Boss** e **revelar** NPC aos jogadores | não | não | **sim** |
| NPC revelado | só identidade (foto, nome, raça, patente, recompensa) | idem | tudo |
| Quadro de **Procurados** | não | **sim** | sim (no painel e na própria ficha) |
| Ficha pessoal própria (jogar) | sim | sim | **sim (“Minha ficha”)** |

- **Revelar** é um botão na ficha do NPC (só o mestre vê). Um NPC revelado nunca expõe HP, status nem itens.
- **Procurados** lista todos os piratas jogadores + NPCs piratas revelados, do mais ao menos perigoso. O perigo vem só da recompensa: *Baixo* (até 29.999.999), *Perigoso* (30 mi), *Muito perigoso* (300 mi), *Ameaça extrema* (1 bi) e *Sem recompensa*. Para mudar os limites, edite `DANGER_LIMITS` em `src/lib/danger.ts`.
- O quadro só devolve **nome, foto, patente e recompensa**: a ficha completa do pirata continua privada. Quem troca a ficha para Marinha passa a ver o quadro (a classe é livre para trocar, como você pediu).
- Cada jogador pode ter até **50 NPCs** (limite no banco; mude em `npcs_guard`, no `02-…sql`).
- Rolar dados na ficha de um NPC entra no histórico com o nome dele ("Guarda Bob: Teste de Força"). Para o jogador, aparece como rolagem do personagem dele; para o mestre, como rolagem "Mestre".

## Decisões de projeto (leia!)

| Decisão | Por quê / como mudar |
|---|---|
| **Mestre definido por email na tabela `masters`**, só pelo SQL Editor | Nada no código fica com o email. Só vale com **email confirmado**, senão qualquer um criaria conta com o email do mestre. Não desligue "Confirm email". |
| **Uma ficha por conta** (vale também para o mestre: 1 ficha pessoal + NPCs/Bosses ilimitados até 50) | Simples e combina com o bot (1 email = 1 jogador). Outras “fichas” do mestre são NPCs/Bosses. Para várias fichas por conta, remova `unique` de `sheets.owner` e adicione uma lista de personagens no app. |
| **Dados sorteados no servidor** (`roll_dice`) | O cliente não consegue inserir no histórico, então ninguém falsifica resultado. Jogador só rola na própria ficha. |
| **Jogador vê só as próprias rolagens; mestre vê todas** | Para a mesa toda ver tudo, troque a policy `rolls_select` por `using (true)`. |
| **Mestre pode editar qualquer ficha** (ex.: tirar HP); o jogador vê a mudança em tempo real | Para somente leitura, remova `or public.is_master()` da policy `sheets_update`. |
| **Cartaz de recompensa só para Pirata**; Marinha/Outros usam cartão de identificação | Seguindo seu pedido ("molde para piratas"). |
| **Botão 🎲 nos status rola 1d20 + valor do status** | Ajuste a regra em `SheetEditor.tsx` (`rollStat`) se sua mesa usar outra fórmula. |
| **Fotos no Supabase Storage** (bucket `character-photos`, leitura pública por link) | Reduzidas para ≤800px no navegador. O link é longo e difícil de adivinhar, mas quem tiver o link vê a foto. |
| **Cartaz: foto inteira sobre fundo preto + botão "Baixar cartaz (PNG)"** | A foto não é mais cortada: o que sobrar da janela fica preto. Para voltar a preencher cortando, troque `contain` por `cover` em `.poster-photo` (`styles.css`) e use `Math.max` no lugar de `Math.min` em `src/lib/poster.ts`. O PNG sai em 1332×1988 e busca a foto do Supabase Storage (o link público já permite isso). |
| **Foto em cada fruta e acessório** (Hakis ficam sem foto) | Miniatura quadrada em cada item; ≤600px, mesmo bucket e mesmas regras da foto do personagem. Para liberar em Hakis, passe `photos={{ ownerId, sheetId }}` ao `EntryList` de Hakis em `SheetEditor.tsx`. Fotos antigas não são apagadas do Storage ao trocar/remover (só o link some da ficha). |
| **Fundo translúcido nos temas Pirata/Marinha** | O barco fica fixo atrás de tudo (`.app::before` em `styles.css`); a transparência vem de `--panel`/`--panel-2` e o véu de `--veil`. Para ver mais o barco, reduza o alfa de `--panel` (ex.: `0.74` → `0.6`); para ler melhor, aumente. O tema “Outros” não muda. |
| **Imagens de One Piece** (barcos, logo Marine, cartaz) em `public/assets/` | São material protegido por direitos autorais; ok para a sua mesa, mas pense nisso se o site for público. O cartaz foi limpo: janela da foto transparente e valor fixo removido. |

## Estrutura

```
supabase/schema.sql         tabelas, RLS, função de dados, realtime, bucket de fotos
supabase/02-npcs-e-procurados.sql   tabela de NPCs, permissões, quadro de Procurados
src/lib/sheet.ts            modelo da ficha, valores padrão, import/export JSON
src/lib/dice.ts             chamada da rolagem (RPC)
src/hooks/                  login, ficha com autosave + tempo real, histórico de dados
src/components/             Header, WantedPoster, IdCard, SheetEditor, DicePanel, MasterPanel…
                            WantedBoard (Procurados), NpcTab / MasterNpcsTab / NpcView (NPCs)
src/lib/danger.ts           níveis de perigo por recompensa
src/styles.css              temas por classe e layout responsivo (PC, tablet, celular)
public/assets/              barcos, logo Marine e molde do cartaz
```
