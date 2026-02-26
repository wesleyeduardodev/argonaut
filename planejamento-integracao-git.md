# Plano: Integração Git (GitHub) - Deploy de Branches via Chat

## Contexto

O usuário quer poder dizer no chat algo como "suba a branch task-123 no ambiente de dev do projeto mentor-web" e o Argonaut executar o fluxo completo:

1. Descobrir qual branch corresponde ao ambiente (dev, hom, prod)
2. Verificar se já existe PR aberto da branch task-123 → branch do ambiente
3. Se não existe: pedir permissão e criar o PR
4. Verificar conflitos
5. Pedir confirmação e fazer merge
6. Acompanhar a GitHub Action (CI/CD)
7. Encontrar o app no ArgoCD (ex: mentor-web-dev) e fazer sync
8. Acompanhar até ficar Healthy
9. Para prod: confirmação extra e resumo de tudo que será feito

A arquitetura deve suportar múltiplos providers Git (iniciar com GitHub, preparar para GitLab/Bitbucket).

---

## Fase 1: Model GitServer no Prisma

**Arquivo:** `prisma/schema.prisma`

Adicionar model `GitServer` seguindo o padrão do `ArgoServer`:

```prisma
model GitServer {
  id            Int      @id @default(autoincrement())
  name          String
  platform      String   // "github" (futuro: "gitlab", "bitbucket")
  url           String   // "https://api.github.com" ou self-hosted
  token         String   // Encrypted (PAT)
  defaultOwner  String?  // Org/owner padrão (ex: "minha-org")
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
  userId        Int      @map("user_id")
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("git_servers")
}
```

Adicionar relação no model `User`:
```prisma
gitServers GitServer[]
```

Rodar: `npx prisma migrate dev --name add-git-server`

---

## Fase 2: CRUD GitServer (API + Settings UI)

### 2.1 API Routes

**Novo arquivo:** `src/app/api/git-servers/route.ts`
- GET: listar servidores do userId (mask token)
- POST: criar (encrypt token)
- PUT: atualizar (re-encrypt só se token novo)
- DELETE: deletar com ownership check
- Seguir exatamente o padrão de `src/app/api/argo-servers/route.ts`

**Novo arquivo:** `src/app/api/git-servers/test/route.ts`
- POST: testar conexão chamando `GET /user` (GitHub) ou `GET /api/v4/user` (GitLab)
- Retorna nome do usuário autenticado + escopo do token

### 2.2 Settings Page

**Novo arquivo:** `src/app/settings/git/page.tsx`
- Mesmo layout de `/settings/argo/page.tsx`
- Header com links para providers e argo settings
- Renderiza `<GitServerList />`

### 2.3 Components

**Novo arquivo:** `src/components/settings/GitServerList.tsx`
- Mesmo padrão de `ArgoServerList.tsx`
- Cards com: icone do platform, nome, URL, owner padrão, badges (padrão)
- CRUD: fetch → list → create/edit form → delete com confirmação

**Novo arquivo:** `src/components/settings/GitServerForm.tsx`
- Mesmo padrão de `ArgoServerForm.tsx`
- Campos: name, platform (selector: GitHub/GitLab/Bitbucket - só GitHub habilitado por ora), url, token (PAT), defaultOwner, isDefault
- Botão "Testar Conexão" → POST `/api/git-servers/test`

### 2.4 Navegação

Atualizar links de navegação nas pages de settings existentes para incluir link para `/settings/git`:
- `src/app/settings/providers/page.tsx`
- `src/app/settings/argo/page.tsx`

---

## Fase 3: GitHub Client

### 3.1 Tipos

**Novo arquivo:** `src/lib/git/types.ts`

```typescript
export interface GitServerConfig {
  platform: string;
  url: string;
  token: string;
  defaultOwner?: string;
}

export interface GitProvider {
  // Repositórios
  searchRepositories(query: string): Promise<Repository[]>;
  listBranches(owner: string, repo: string): Promise<Branch[]>;

  // Pull Requests
  listPullRequests(owner: string, repo: string, params?: PRListParams): Promise<PullRequest[]>;
  getPullRequest(owner: string, repo: string, prNumber: number): Promise<PullRequestDetail>;
  createPullRequest(owner: string, repo: string, params: CreatePRParams): Promise<PullRequest>;
  mergePullRequest(owner: string, repo: string, prNumber: number, method?: string): Promise<MergeResult>;

  // CI/CD
  listWorkflowRuns(owner: string, repo: string, params?: WorkflowRunParams): Promise<WorkflowRun[]>;
  getWorkflowRun(owner: string, repo: string, runId: number): Promise<WorkflowRunDetail>;
}
```

(+ interfaces auxiliares: Repository, Branch, PullRequest, PullRequestDetail, WorkflowRun, etc.)

### 3.2 GitHub Client

**Novo arquivo:** `src/lib/git/github-client.ts`

- Implementa `GitProvider`
- Usa `fetch` direto (sem dependência externa) - mesmo padrão do `ArgoClient`
- Base URL configurável (github.com ou enterprise)
- Headers: `Authorization: Bearer {token}`, `Accept: application/vnd.github+json`
- Métodos mapeiam 1:1 com a GitHub REST API:
  - `searchRepositories` → `GET /search/repositories?q={query}`
  - `listBranches` → `GET /repos/{owner}/{repo}/branches`
  - `listPullRequests` → `GET /repos/{owner}/{repo}/pulls`
  - `getPullRequest` → `GET /repos/{owner}/{repo}/pulls/{number}` (inclui `mergeable`, `mergeable_state`)
  - `createPullRequest` → `POST /repos/{owner}/{repo}/pulls`
  - `mergePullRequest` → `PUT /repos/{owner}/{repo}/pulls/{number}/merge`
  - `listWorkflowRuns` → `GET /repos/{owner}/{repo}/actions/runs`
  - `getWorkflowRun` → `GET /repos/{owner}/{repo}/actions/runs/{id}`

### 3.3 Factory

**Novo arquivo:** `src/lib/git/client-factory.ts`

```typescript
export function createGitProvider(config: GitServerConfig): GitProvider {
  switch (config.platform) {
    case "github":
      return new GitHubClient(config);
    default:
      throw new Error(`Git platform not supported: ${config.platform}`);
  }
}
```

---

## Fase 4: Git Tools (Definições + Executor)

### 4.1 Definições de Tools

**Editar:** `src/lib/tools/definitions.ts`

Adicionar array `GIT_TOOLS` com 8 tools:

| Tool | Descrição | Args obrigatórios | Args opcionais |
|------|-----------|-------------------|----------------|
| `search_repositories` | Buscar repos por nome | query | owner |
| `list_branches` | Listar branches de um repo | owner, repo | - |
| `list_pull_requests` | Listar PRs abertos | owner, repo | state, head, base |
| `get_pull_request` | Detalhes do PR (conflitos, checks) | owner, repo, pr_number | - |
| `create_pull_request` | Criar PR | owner, repo, title, head, base | body |
| `merge_pull_request` | Mergear PR | owner, repo, pr_number | merge_method (enum: merge/squash/rebase) |
| `list_workflow_runs` | Listar runs do GitHub Actions | owner, repo | branch, status, per_page |
| `get_workflow_run` | Status de um workflow run | owner, repo, run_id | - |

Exportar função para combinar tools dinamicamente:

```typescript
export function getAllTools(options: { git?: boolean }): ToolDefinition[] {
  return [...ARGOCD_TOOLS, ...(options.git ? GIT_TOOLS : [])];
}
```

### 4.2 Executor

**Editar:** `src/lib/tools/executor.ts`

Refatorar para usar um `ToolContext` ao invés de receber `ArgoClient` direto:

```typescript
export interface ToolContext {
  argoClient: ArgoClient;
  gitClient?: GitProvider;
}

export async function executeTool(
  context: ToolContext,
  toolName: string,
  args: Record<string, unknown>,
  onProgress?: OnToolProgress
): Promise<string>
```

Adicionar cases no switch para os 8 git tools. Se `context.gitClient` for null e um git tool for chamado, retornar erro: `{ error: "Nenhum servidor Git configurado" }`.

### 4.3 Format Converters

**Editar:** `src/lib/tools/claude-format.ts`, `openai-format.ts`, `gemini-format.ts`

Alterar para receber `ToolDefinition[]` como parâmetro ao invés de importar `ARGOCD_TOOLS` direto:

```typescript
// Antes:
export function getClaudeTools(): Tool[] {
  return ARGOCD_TOOLS.map(...)
}

// Depois:
export function getClaudeTools(tools: ToolDefinition[]): Tool[] {
  return tools.map(...)
}
```

---

## Fase 5: Integração no Chat

### 5.1 Chat Route

**Editar:** `src/app/api/chat/route.ts`

- Aceitar `gitServerId` opcional no body do request
- Se fornecido: carregar GitServer do DB (scoped by userId), decrypt token, criar GitProvider via factory
- Montar tools dinamicamente: `getAllTools({ git: !!gitClient })`
- Passar tools para o AI provider (ver 5.2)
- Passar `gitClient` para o executor: `executeTool({ argoClient, gitClient }, ...)`

### 5.2 AI Providers - Aceitar tools dinâmicos

**Editar:** `src/lib/ai/provider-factory.ts`

Alterar factory para aceitar `ToolDefinition[]`:

```typescript
export function createAIProvider(
  providerType: string,
  apiKey: string,
  model: string,
  tools: ToolDefinition[]  // NOVO
): AIProvider
```

**Editar:** `src/lib/ai/claude-provider.ts`, `openai-provider.ts`, `gemini-provider.ts`

Cada provider recebe `ToolDefinition[]` no construtor e formata internamente:

```typescript
constructor(apiKey: string, model: string, tools: ToolDefinition[]) {
  this.client = new Anthropic({ apiKey });
  this.model = model;
  this.tools = getClaudeTools(tools); // formata uma vez
}
```

### 5.3 System Prompt

**Editar:** `src/lib/ai/system-prompt.ts`

Adicionar seção condicional (só quando Git server está configurado) com instruções de deployment flow:

```markdown
## Deploy de Branches (Git Integration)

Quando o usuário pedir para subir/deployar uma branch em um ambiente:

1. **Identificar o repositório**: Use `search_repositories` com o nome do projeto.
   Se o GitServer tem um defaultOwner, busque nesse owner primeiro.

2. **Identificar a branch do ambiente**: Use `list_branches` para ver as branches disponíveis.
   Pergunte ao usuário qual branch corresponde ao ambiente desejado se não for óbvio.
   Convenções comuns: dev→develop/dev, hom→homolog/hom/staging, prod→main/master

3. **Verificar PRs existentes**: Use `list_pull_requests` com head={branch-origem} e base={branch-destino}.
   Se já existe PR aberto, informe e pergunte se quer usar ele.

4. **Criar PR**: Se não existe, peça permissão ao usuário, então use `create_pull_request`.

5. **Verificar conflitos**: Use `get_pull_request` para checar `mergeable`.
   Se há conflitos, informe o usuário e pare (conflitos precisam ser resolvidos manualmente).

6. **Merge**: Peça confirmação ao usuário, então use `merge_pull_request`.

7. **Acompanhar CI/CD**: Use `list_workflow_runs` com branch={branch-destino} para encontrar o run.
   Use `get_workflow_run` para acompanhar o status até completar.
   Informe o usuário sobre o progresso.

8. **Sync ArgoCD**: Busque o app no ArgoCD usando `list_applications`.
   O nome do app geralmente segue o padrão: {projeto}-{ambiente} (ex: mentor-web-dev).
   Use `sync_application` e acompanhe até ficar Healthy.

### Regras para Produção
- SEMPRE mostrar um resumo completo do que será feito ANTES de executar qualquer ação
- Pedir confirmação EXPLÍCITA do usuário para CADA etapa
- Resumo deve incluir: branch origem → destino, repo, app ArgoCD que será sincronizado
```

---

## Fase 6: Git Server Selector no Chat

### 6.1 Componente

**Novo arquivo:** `src/components/chat/GitServerSelector.tsx`

- Mesmo padrão do `ArgoSelector.tsx`
- Dropdown com servidores Git do usuário
- Ícone do GitHub (ou GitLab) baseado no `platform`
- Health check via `/api/git-servers/test` (ou endpoint health simples)
- Opção "Nenhum" (permite usar chat sem Git - apenas ArgoCD)
- Auto-seleciona o servidor padrão

### 6.2 Chat Interface

**Editar:** `src/components/chat/ChatInterface.tsx`

- Adicionar `gitServerRef` (mesmo padrão do `argoRef`)
- Adicionar `handleGitServerSelect(id)` callback
- Renderizar `<GitServerSelector>` ao lado do `<ArgoSelector>` no header
- Incluir `gitServerId` no body do POST `/api/chat` (se selecionado)

---

## Arquivos Impactados (Resumo)

### Novos (10 arquivos):
1. `src/lib/git/types.ts`
2. `src/lib/git/github-client.ts`
3. `src/lib/git/client-factory.ts`
4. `src/app/api/git-servers/route.ts`
5. `src/app/api/git-servers/test/route.ts`
6. `src/app/settings/git/page.tsx`
7. `src/components/settings/GitServerList.tsx`
8. `src/components/settings/GitServerForm.tsx`
9. `src/components/chat/GitServerSelector.tsx`
10. Prisma migration file (gerado automaticamente)

### Editados (11 arquivos):
1. `prisma/schema.prisma` - Adicionar model GitServer
2. `src/lib/tools/definitions.ts` - Adicionar GIT_TOOLS + getAllTools()
3. `src/lib/tools/executor.ts` - Refatorar para ToolContext + git tool cases
4. `src/lib/tools/claude-format.ts` - Aceitar tools como parâmetro
5. `src/lib/tools/openai-format.ts` - Aceitar tools como parâmetro
6. `src/lib/tools/gemini-format.ts` - Aceitar tools como parâmetro
7. `src/lib/ai/provider-factory.ts` - Aceitar tools no factory
8. `src/lib/ai/claude-provider.ts` - Receber tools no construtor
9. `src/lib/ai/openai-provider.ts` - Receber tools no construtor
10. `src/lib/ai/gemini-provider.ts` - Receber tools no construtor
11. `src/lib/ai/system-prompt.ts` - Adicionar seção de deployment flow
12. `src/app/api/chat/route.ts` - Carregar GitServer + criar GitProvider
13. `src/components/chat/ChatInterface.tsx` - Adicionar GitServerSelector
14. `src/app/settings/providers/page.tsx` - Link para /settings/git
15. `src/app/settings/argo/page.tsx` - Link para /settings/git

---

## Verificação / Testes

1. **CRUD GitServer**: Criar, editar, deletar servidor Git na tela de settings. Testar conexão com token válido.
2. **Chat sem Git**: Verificar que o chat funciona normalmente sem selecionar Git server (apenas ArgoCD tools disponíveis).
3. **Chat com Git**: Selecionar um Git server e verificar que os git tools aparecem nas chamadas da AI.
4. **Fluxo completo**: No chat, pedir "suba a branch task-123 no dev do mentor-web" e verificar:
   - AI busca o repo
   - AI verifica PRs existentes
   - AI pede permissão e cria PR
   - AI verifica conflitos
   - AI pede permissão e faz merge
   - AI acompanha GitHub Action
   - AI encontra app no ArgoCD e faz sync
5. **Fluxo prod**: Verificar que para prod a AI mostra resumo e pede confirmação extra.
6. **Build**: `npm run build` passa sem erros.
7. **Lint**: `npm run lint` passa sem erros.
