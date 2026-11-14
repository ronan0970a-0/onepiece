# Ficha RPG — One Piece

React + TypeScript (Vite) · Supabase (login, banco, tempo real, fotos) · Vercel (host).

- **Jogador:** cria a ficha escolhendo **Pirata / Marinha / Outros**, edita tudo (salva sozinho), rola dados, importa/exporta JSON.
- **Pirata:** cartaz *WANTED* com foto, nome e recompensa ao lado da ficha.
- **Marinha:** logo Marine no header + cartão de identificação.
- **Outros:** tema preto/branco com **cor de destaque** e modo claro/escuro à escolha.
- **Mestre:** vê e edita todas as fichas, e tem o **histórico geral de dados** em tempo real.

## 1. Supabase

1. Crie um projeto em <https://supabase.com>.
2. **SQL Editor → New query** → cole o conteúdo de `supabase/schema.sql` → **Run**.
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

## Decisões de projeto (leia!)

| Decisão | Por quê / como mudar |
|---|---|
| **Mestre definido por email na tabela `masters`**, só pelo SQL Editor | Nada no código fica com o email. Só vale com **email confirmado**, senão qualquer um criaria conta com o email do mestre. Não desligue "Confirm email". |
| **Uma ficha por conta** | Simples e combina com o bot (1 email = 1 jogador). Para várias fichas por conta, remova `unique` de `sheets.owner` e adicione uma lista de personagens no app. |
| **Dados sorteados no servidor** (`roll_dice`) | O cliente não consegue inserir no histórico, então ninguém falsifica resultado. Jogador só rola na própria ficha. |
| **Jogador vê só as próprias rolagens; mestre vê todas** | Para a mesa toda ver tudo, troque a policy `rolls_select` por `using (true)`. |
| **Mestre pode editar qualquer ficha** (ex.: tirar HP); o jogador vê a mudança em tempo real | Para somente leitura, remova `or public.is_master()` da policy `sheets_update`. |
| **Cartaz de recompensa só para Pirata**; Marinha/Outros usam cartão de identificação | Seguindo seu pedido ("molde para piratas"). |
| **Botão 🎲 nos status rola 1d20 + valor do status** | Ajuste a regra em `SheetEditor.tsx` (`rollStat`) se sua mesa usar outra fórmula. |
| **Fotos no Supabase Storage** (bucket `character-photos`, leitura pública por link) | Reduzidas para ≤800px no navegador. O link é longo e difícil de adivinhar, mas quem tiver o link vê a foto. |
| **Imagens de One Piece** (barcos, logo Marine, cartaz) em `public/assets/` | São material protegido por direitos autorais; ok para a sua mesa, mas pense nisso se o site for público. O cartaz foi limpo: janela da foto transparente e valor fixo removido. |

## Estrutura

```
supabase/schema.sql         tabelas, RLS, função de dados, realtime, bucket de fotos
src/lib/sheet.ts            modelo da ficha, valores padrão, import/export JSON
src/lib/dice.ts             chamada da rolagem (RPC)
src/hooks/                  login, ficha com autosave + tempo real, histórico de dados
src/components/             Header, WantedPoster, IdCard, SheetEditor, DicePanel, MasterPanel…
src/styles.css              temas por classe e layout responsivo (PC, tablet, celular)
public/assets/              barcos, logo Marine e molde do cartaz
```
