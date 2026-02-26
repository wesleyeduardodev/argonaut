# Argonaut

Interface de chat com IA para gerenciamento de aplicações ArgoCD via linguagem natural.

O Argonaut conecta provedores de IA (Claude, OpenAI, Gemini) ao ArgoCD, permitindo que você gerencie deploys, monitore aplicações e execute operações no Kubernetes conversando com um assistente inteligente.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5.9**
- **Tailwind CSS 4**
- **PostgreSQL** + **Prisma ORM**
- **JWT** (jose) + **bcrypt** para autenticação
- **AES-256-GCM** para criptografia de credenciais
- **SSE** (Server-Sent Events) para streaming em tempo real

## Pré-requisitos

- Node.js 20+
- Docker (para o banco de dados local)

## Setup Local

### 1. Clonar e instalar

```bash
git clone https://github.com/seu-usuario/argonaut.git
cd argonaut
npm install
```

### 2. Subir o banco de dados

```bash
docker compose up -d
```

Isso inicia um PostgreSQL na porta `5436` com usuário/senha `argonaut`.

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
DATABASE_URL=postgresql://argonaut:argonaut@localhost:5436/argonaut
ENCRYPTION_KEY=<chave-hex-64-chars>
JWT_SECRET=<chave-hex-64-chars>
```

Para gerar as chaves:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Execute duas vezes, uma para cada variável.

### 4. Rodar as migrations

```bash
npm run db:migrate
```

### 5. (Opcional) Seed do banco

```bash
npm run db:seed
```

Cria um usuário `admin` com senha `admin`. Não é necessário — a aplicação tem registro self-service.

### 6. Iniciar o dev server

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Primeiro Uso

1. Acesse `/register` e crie sua conta
2. Vá em **Settings > Provedores de IA** e configure pelo menos um provedor (Claude, OpenAI ou Gemini) com sua API key
3. Vá em **Settings > Servidores ArgoCD** e conecte seu servidor ArgoCD
4. Volte para o chat e comece a conversar com o assistente

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Criar/aplicar migrations (dev) |
| `npm run db:seed` | Seed do banco (usuário admin) |
| `npm run db:studio` | Prisma Studio (GUI do banco) |

## O que o Assistente Consegue Fazer

| Operação | Descrição |
|----------|-----------|
| Listar aplicações | Ver todas as apps com status de sync e saúde |
| Detalhes da aplicação | Info completa de uma app específica |
| Sincronizar aplicação | Disparar sync/deploy |
| Rollback | Voltar para versão anterior |
| Ver logs | Logs dos pods da aplicação |
| Árvore de recursos | Hierarquia de recursos Kubernetes |
| Recursos gerenciados | Diffs entre live e desired state |
| Eventos | Eventos Kubernetes da aplicação |
| Cancelar operação | Abortar operações travadas |
| Deletar aplicação | Remover app e recursos K8s |
| Restart | Rolling restart de Deployments/StatefulSets |
| Listar projetos | Projetos ArgoCD |
| Listar clusters | Clusters Kubernetes registrados |
| Listar repositórios | Conexões de repositórios Git |

## Deploy na Vercel

### 1. Banco de dados

O Argonaut precisa de um PostgreSQL acessível pela internet. Opções:

- [Supabase](https://supabase.com) (free tier generoso)
- [Neon](https://neon.tech)
- [Railway](https://railway.app)
- Qualquer PostgreSQL hospedado

### 2. Variáveis de ambiente na Vercel

No dashboard da Vercel, vá em **Settings > Environment Variables** e adicione:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | URL de conexão do seu PostgreSQL remoto |
| `ENCRYPTION_KEY` | Chave hex de 64 caracteres |
| `JWT_SECRET` | Chave hex de 64 caracteres |

### 3. Build e migrations

O build já está configurado para rodar as migrations automaticamente:

```
prisma generate && prisma migrate deploy && next build
```

O `prisma migrate deploy` é seguro e idempotente — ele consulta a tabela `_prisma_migrations` e só aplica migrations pendentes. Não tenta recriar o que já existe.

### 4. Deploy

Conecte o repositório na Vercel e faça push. O deploy é automático.

## Multi-Tenancy

Cada usuário tem seus próprios provedores de IA e servidores ArgoCD isolados. Usuário A não consegue ver nem acessar os dados do Usuário B. Todas as queries no banco são filtradas por `userId`.

## Segurança

- API keys e credenciais do ArgoCD são criptografadas com **AES-256-GCM** antes de serem salvas no banco
- Senhas de usuários são hasheadas com **bcrypt**
- Sessões utilizam **JWT** com cookie HttpOnly
- Validação de ownership em todas as rotas — recursos de outro usuário retornam 404

## Licença

MIT
