# Financeiro

App pessoal de controle financeiro (lançamentos, posição de caixa, análises) feito em Next.js, com Supabase como banco de dados.

Este projeto é um **template**: cada pessoa que for usar deve criar seu próprio banco de dados (Supabase) e sua própria conta na Vercel para hospedar. Ninguém compartilha banco nem hosting com ninguém.

## O que você vai precisar

- Node.js instalado
- Uma conta gratuita em [supabase.com](https://supabase.com) (banco de dados)
- Uma conta gratuita em [vercel.com](https://vercel.com) (hospedagem), opcional até você querer publicar

## Passo a passo

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o banco de dados no Supabase

1. Crie um projeto novo em [supabase.com](https://supabase.com) (plano gratuito).
2. Abra **SQL Editor** no menu lateral.
3. Cole o conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql) e execute (**RUN**).
4. Isso cria as tabelas `categories`, `transactions`, `cash_positions` e `notes`, já com uma lista inicial de categorias.

> **Personalize antes de rodar, se quiser:** o `schema.sql` tem uma lista de categorias de exemplo e um campo `person` limitado a `'pedro'`, `'ana'`, `'casal'` (via `CHECK`). Se os nomes das pessoas que vão usar o app forem outros, edite essa lista e o `CHECK` do campo `person` no arquivo antes de rodar o script.

### 3. Pegar as chaves do Supabase

No painel do projeto: **Project Settings → API**.
- `Project URL` → vai virar `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → vai virar `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha:
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` — do passo 3
- `LOGIN_PASSWORD` — a senha que você vai usar para entrar no app (não há cadastro de usuário, é uma senha única compartilhada)
- `AUTH_SECRET` — uma string aleatória qualquer, por exemplo gerada com `openssl rand -hex 32`
- `GROQ_API_KEY` — pode deixar em branco, é resquício de uma feature de chatbot que foi removida e não é usada hoje

### 5. Rodar localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), faça login com o `LOGIN_PASSWORD` que você definiu, e teste as telas (lançamento, posição de caixa, análise, painel).

### 6. Publicar na Vercel

1. Suba este projeto para o **seu próprio** repositório no GitHub (não use o repositório original).
2. Importe o repositório em [vercel.com/new](https://vercel.com/new).
3. Em **Environment Variables**, adicione as mesmas variáveis do `.env.local` (passo 4).
4. Deploy.

---

## Instruções para o Claude Code (ou outro agente de IA)

Se você (agente) foi chamado para configurar este projeto para o dono dele, siga esta ordem e confirme cada etapa com o usuário antes de agir quando envolver contas externas (Supabase, Vercel, GitHub) — você não tem como criar essas contas sozinho, então peça para o usuário criar e colar as credenciais:

1. Rode `npm install`.
2. Peça ao usuário para criar um projeto no Supabase e rodar o `supabase/schema.sql` no SQL Editor de lá (você pode ajudar a editar o arquivo antes, se ele quiser mudar categorias/nomes das pessoas — campo `person` tem um `CHECK` fixo em `'pedro'/'ana'/'casal'`).
3. Peça a `Project URL` e a `anon public key` do Supabase (Project Settings → API).
4. Crie `.env.local` a partir de `.env.example` e preencha com os valores acima. Gere um `AUTH_SECRET` aleatório você mesmo (ex.: via `openssl rand -hex 32` ou equivalente) em vez de perguntar ao usuário. Pergunte ao usuário apenas qual `LOGIN_PASSWORD` ele quer usar. Deixe `GROQ_API_KEY` em branco — não é usada.
5. Rode `npm run dev` e valide que o login e as páginas principais carregam.
6. Só depois disso, se o usuário pedir para publicar: ajude a criar/configurar o repositório GitHub dele e o projeto na Vercel, e confirme com ele antes de fazer qualquer push ou deploy.

Não reutilize nem sugira reutilizar as credenciais do projeto original — cada instância deve ter seu próprio banco e suas próprias chaves.
