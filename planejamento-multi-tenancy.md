# Multi-Tenancy — Cadastro de Usuários e Isolamento de Dados

## Contexto

O Argonaut hoje é single-tenant: um único usuário (admin/admin) e todos os AIProviders e ArgoServers são globais. Qualquer usuário autenticado vê e modifica tudo. Precisamos:

1. Permitir que novos usuários se cadastrem (signup)
2. Isolar AIProviders e ArgoServers por usuário (User A não vê dados de User B)
3. Validar ownership em todas as operações (CRUD + chat)

**Stack atual**: Next.js 16, Prisma + SQLite, JWT (jose), bcrypt, AES-256-GCM. **SQLite é suficiente** — multi-tenancy por userId não exige Postgres. O volume de dados é baixo (poucos providers/servers por user).

## Diagnóstico atual

- `AIProvider` e `ArgoServer` **não têm FK para User** — tabelas sem dono
- `AIProvider.provider` tem `@unique` global — só pode existir 1 Claude no sistema inteiro
- Middleware (`src/proxy.ts`) valida JWT mas **não passa userId** para os routes
- Nenhuma API route chama `getSession()` — todos os queries são globais
- `getSession()` já existe em `src/lib/auth.ts` e já extrai `userId` do JWT — só não é usado
- Não existe rota nem página de registro

---

## Plano de Execução (7 passos)

### Passo 1 — Schema Prisma + Migration

**Arquivo**: `prisma/schema.prisma`

- Adicionar `userId Int` + `@relation(fields: [userId], references: [id], onDelete: Cascade)` em `AIProvider` e `ArgoServer`
- Adicionar `providers AIProvider[]` e `argoServers ArgoServer[]` no model `User`
- Trocar `@unique` em `AIProvider.provider` por `@@unique([userId, provider])`
- Rodar: `npx prisma migrate dev --name add-user-tenancy`
- Migration adiciona `userId` com DEFAULT 1 nos registros existentes (preserva dados do admin)

### Passo 2 — Helper `getUserId()`

**Arquivo**: `src/lib/auth.ts`

Adicionar:
```ts
export async function getUserId(): Promise<number> {
  const session = await getSession(); // já existe, extrai userId do JWT cookie
  if (!session) throw new Error("Unauthorized");
  return session.userId;
}
```

### Passo 3 — Middleware: liberar rotas de registro

**Arquivo**: `src/proxy.ts`

```ts
// Antes:
const PUBLIC_PATHS = ["/login", "/api/auth"];
// Depois:
const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/register"];
```

### Passo 4 — API de Registro

**Novo arquivo**: `src/app/api/register/route.ts`

- POST: recebe `{ username, password, confirmPassword }`
- Valida: username 3-30 chars, password min 6 chars, senhas coincidem
- Checa username único (`prisma.user.findUnique`)
- Hash com `hashPassword()` (de `src/lib/auth.ts`)
- Cria user + auto-login via `createSession(user.id)` (de `src/lib/auth.ts`)
- Retorna `{ success: true }` status 201

### Passo 5 — UI de Registro + Link no Login

**Novo**: `src/app/register/page.tsx`
- Mesmo layout visual da login page (background effects, ArgonautLogo, card-gradient)
- Título: "Criar Conta" com subtítulo
- Link "Já tem uma conta? Entrar" → `/login`

**Novo**: `src/components/auth/RegisterForm.tsx`
- Campos: username, password, confirmPassword (com toggle show/hide)
- Mesmos estilos do LoginForm (`.field-input .field-with-icon`)
- POST para `/api/register`, on success → `router.push("/")`

**Modificar**: `src/app/login/page.tsx`
- Adicionar abaixo do card: "Não tem uma conta? [Registre-se](/register)"

### Passo 6 — Isolamento nas API Routes

Estes 4 arquivos são atualizados **juntos** (deploy atômico):

#### `src/app/api/providers/route.ts`
- **GET**: `findMany({ where: { userId } })`
- **POST**: `create({ data: { ...fields, userId } })` + isDefault toggle com `where: { userId }`
- **PUT**: `findFirst({ where: { id, userId } })` → 404 se não pertence ao user
- **DELETE**: `deleteMany({ where: { id, userId } })`

#### `src/app/api/argo-servers/route.ts`
- Mesmo padrão dos providers para GET/POST/PUT/DELETE

#### `src/app/api/argo-servers/test/route.ts`
- Quando `existingId`: `findFirst({ where: { id: existingId, userId } })`

#### `src/app/api/chat/route.ts`
- `findUnique` → `findFirst({ where: { id, userId } })` para provider E server
- Se qualquer um não pertence ao user → 404

**Padrão de auth em todos os handlers:**
```ts
const userId = await getUserId(); // throws se não autenticado
```
Com catch → 401 no handler externo.

### Passo 7 — Seed (sem mudanças obrigatórias)

`prisma/seed.ts` só cria o User admin. A migration atribui registros existentes ao admin via DEFAULT 1. Nada a mudar.

---

## Arquivos

| # | Arquivo | Ação |
|---|---------|------|
| 1 | `prisma/schema.prisma` | MODIFICAR — userId FK + relations + @@unique |
| 2 | `src/lib/auth.ts` | MODIFICAR — adicionar `getUserId()` |
| 3 | `src/proxy.ts` | MODIFICAR — PUBLIC_PATHS += register |
| 4 | `src/app/api/register/route.ts` | CRIAR |
| 5 | `src/app/register/page.tsx` | CRIAR |
| 6 | `src/components/auth/RegisterForm.tsx` | CRIAR |
| 7 | `src/app/login/page.tsx` | MODIFICAR — link registro |
| 8 | `src/app/api/providers/route.ts` | MODIFICAR — userId filtering |
| 9 | `src/app/api/argo-servers/route.ts` | MODIFICAR — userId filtering |
| 10 | `src/app/api/argo-servers/test/route.ts` | MODIFICAR — ownership check |
| 11 | `src/app/api/chat/route.ts` | MODIFICAR — ownership validation |

**Sem mudanças**: `src/components/chat/*`, `src/components/settings/*`, `src/lib/ai/*`, `src/lib/argocd/*`, `src/lib/tools/*`, `src/lib/encryption.ts`
— O frontend envia IDs que agora são validados server-side. Nenhum componente de UI precisa saber sobre multi-tenancy.

## Verificação

1. `npx prisma migrate dev` — migration aplica sem erros
2. `npm run build` — compila sem erros
3. `/register` — criar novo usuário, auto-login, redirecionado para `/`
4. Novo usuário vê 0 providers e 0 servers (isolado)
5. Criar provider + server com novo usuário → só ele vê
6. Login como admin → vê apenas seus dados originais
7. Chat: admin não consegue usar provider de outro user (404)
8. `/login` tem link para registro, `/register` tem link para login
