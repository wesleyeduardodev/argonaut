# Plano: ArgoCD Chat - Interface de Chat para Gerenciamento ArgoCD

## Contexto

O usuário gerencia suas aplicações via ArgoCD (https://devquote.com.br/argocd) com login/senha. Quer uma interface de chat web onde possa dar comandos em linguagem natural ("reiniciar a pod do backend", "listar apps fora de sync") e a IA executa as ações no ArgoCD. O ArgoCD funciona como camada de abstração sobre a infra (AWS, GCP, DO), eliminando a necessidade de integrar com cada cloud provider.

A ferramenta permite cadastrar **múltiplos agentes IA** e **múltiplos servidores ArgoCD**, com telas de configuração dedicadas. Na hora de usar o chat, o usuário seleciona qual agente e qual ArgoCD quer usar.

## Arquitetura

```
Browser (Next.js + Tailwind)
  │
  ├─ /login          → Tela de login (usuário/senha)
  ├─ /settings/agents → CRUD de agentes IA (API keys encriptadas)
  ├─ /settings/argo   → CRUD de conexões ArgoCD (credenciais encriptadas)
  └─ / (chat)         → Chat com selectors de agente + ArgoCD server
       │
       ▼ POST /api/chat (SSE streaming)
  Next.js API Route
       │
       ├─ AI Provider (dinâmico, baseado no agente selecionado)
       │    └─ Interpreta linguagem natural → Tool calling
       │
       ├─ Tool Executor → ArgoCD Client (dinâmico, baseado no server selecionado)
       │
       └─ SQLite + Prisma (config, credenciais encriptadas, sessões)
```

## Stack

- **Frontend**: Next.js 15 + Tailwind CSS + TypeScript
- **Backend**: Next.js API Routes (SSE streaming)
- **Database**: SQLite + Prisma ORM (VPS com filesystem persistente)
- **Auth app**: bcrypt (hash de senhas) + JWT sessions (jose)
- **Encryption**: AES-256-GCM para API keys e credenciais ArgoCD
- **AI SDKs**: @anthropic-ai/sdk (inicial), openai e @google/genai (futuros)
- **ArgoCD**: REST API v1
- **Deploy**: VPS/servidor próprio (SQLite precisa de filesystem persistente)

## Decisões Técnicas Importantes

1. **Truncation de respostas**: Limitar outputs do ArgoCD a ~4000 chars antes de enviar para a IA. Evita custo excessivo com tokens.
2. **Começar com Claude**: Primeiro provider implementado. Arquitetura já suporta adicionar OpenAI/Gemini depois sem refatorar.
3. **Flag insecure**: Cadastro de ArgoCD server inclui toggle para ignorar certificados self-signed (comum em clusters internos).
4. **Restart via patch**: O restart de pods usa PATCH no Deployment com annotation `kubectl.kubernetes.io/restartedAt` via ArgoCD resource API.

## Estrutura de Pastas

```
mcp-argo/
├── .env.local                    # ENCRYPTION_KEY, JWT_SECRET (gitignored)
├── .env.example
├── prisma/
│   └── schema.prisma             # User, AIAgent, ArgoServer
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx              # Chat principal (protegido)
│   │   ├── login/
│   │   │   └── page.tsx          # Tela de login
│   │   ├── settings/
│   │   │   ├── agents/
│   │   │   │   └── page.tsx      # CRUD agentes IA
│   │   │   └── argo/
│   │   │       └── page.tsx      # CRUD conexões ArgoCD
│   │   └── api/
│   │       ├── auth/
│   │       │   └── route.ts      # Login/logout
│   │       ├── agents/
│   │       │   └── route.ts      # CRUD agentes IA
│   │       ├── argo-servers/
│   │       │   └── route.ts      # CRUD conexões ArgoCD
│   │       └── chat/
│   │           └── route.ts      # SSE endpoint principal
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── AgentSelector.tsx     # Dropdown de agentes cadastrados
│   │   │   ├── ArgoSelector.tsx      # Dropdown de servidores ArgoCD
│   │   │   └── ToolCallDisplay.tsx
│   │   ├── settings/
│   │   │   ├── AgentForm.tsx         # Form criar/editar agente
│   │   │   ├── AgentList.tsx
│   │   │   ├── ArgoServerForm.tsx    # Form criar/editar ArgoCD server
│   │   │   └── ArgoServerList.tsx
│   │   └── auth/
│   │       └── LoginForm.tsx
│   ├── lib/
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── encryption.ts         # AES-256-GCM encrypt/decrypt
│   │   ├── auth.ts               # JWT session helpers (jose + bcrypt)
│   │   ├── argocd/
│   │   │   ├── client.ts         # HTTP client com auth + token cache
│   │   │   └── types.ts
│   │   ├── ai/
│   │   │   ├── types.ts          # Interface unificada AIProvider
│   │   │   ├── provider-factory.ts
│   │   │   ├── claude-provider.ts
│   │   │   ├── openai-provider.ts
│   │   │   ├── gemini-provider.ts
│   │   │   └── system-prompt.ts
│   │   └── tools/
│   │       ├── definitions.ts    # 15 tools ArgoCD
│   │       ├── executor.ts       # Despacha tool → ArgoCD client
│   │       ├── claude-format.ts
│   │       ├── openai-format.ts
│   │       └── gemini-format.ts
│   ├── middleware.ts             # Proteção de rotas (verifica JWT)
│   └── types/
│       └── index.ts
```

## Modelo de Dados (Prisma)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String   // bcrypt hash
  createdAt DateTime @default(now())
}

model AIAgent {
  id        Int      @id @default(autoincrement())
  name      String               // ex: "Claude Sonnet", "GPT-4o"
  provider  String               // "claude" | "openai" | "gemini"
  model     String               // "claude-sonnet-4-20250514", "gpt-4o", etc
  apiKey    String               // encriptado com AES-256-GCM
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
}

model ArgoServer {
  id        Int      @id @default(autoincrement())
  name      String               // ex: "Produção", "Staging"
  url       String               // ex: "https://devquote.com.br/argocd"
  username  String               // encriptado
  password  String               // encriptado
  insecure  Boolean  @default(false) // ignorar cert self-signed
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

## Segurança

- **Senhas de usuário**: hash com bcrypt (salt rounds=12)
- **API keys e credenciais ArgoCD**: encriptadas com AES-256-GCM
  - `ENCRYPTION_KEY` no `.env.local` (32 bytes hex)
  - Cada campo encriptado armazena: `iv:authTag:ciphertext`
  - Decrypt apenas no momento de uso (server-side)
- **Sessão**: JWT assinado com `JWT_SECRET`, armazenado em httpOnly cookie
- **Middleware**: Todas as rotas exceto `/login` verificam JWT válido
- **API keys nunca expostas ao frontend** (retorna apenas `****...últimos4`)

## Tools ArgoCD (15 operações)

| Tool | Descrição | Params obrigatórios |
|------|-----------|-------------------|
| `list_applications` | Listar todas as apps | - |
| `get_application` | Detalhes de uma app | name |
| `sync_application` | Deploy/sync com Git | name |
| `rollback_application` | Rollback para versão anterior | name, id |
| `get_application_logs` | Logs dos pods | name |
| `get_resource_tree` | Árvore de recursos K8s | name |
| `get_managed_resources` | Recursos gerenciados com diff | name |
| `get_application_events` | Eventos K8s | name |
| `terminate_operation` | Cancelar operação em andamento | name |
| `delete_application` | Deletar app (destructive) | name |
| `restart_application` | Rolling restart dos pods | name |
| `list_projects` | Listar projetos | - |
| `get_project` | Detalhes do projeto | name |
| `list_clusters` | Listar clusters | - |
| `list_repositories` | Listar repos Git | - |

## Fluxo de Dados (Chat)

1. Usuário seleciona agente "Claude Sonnet" + ArgoCD "Produção"
2. Digita "quero reiniciar a pod do backend"
3. Frontend → POST /api/chat `{ messages, agentId: 3, argoServerId: 1 }`
4. API Route busca no DB: agente (decripta API key) + ArgoCD server (decripta credenciais)
5. Cria provider Claude com a API key + ArgoCD client com as credenciais
6. Claude recebe system prompt + tools + mensagem → decide chamar tools
7. Tool executor usa o ArgoCD client específico para executar
8. Cada passo é enviado via SSE para o frontend
9. Frontend renderiza mensagem com tool calls colapsáveis

## Telas da Aplicação

### /login
- Input usuário + senha, botão entrar
- Redirect para / após login

### / (Chat)
- Header: logo + selectors (agente IA + ArgoCD server) + botão settings
- Área de mensagens com scroll
- Input de texto + botão enviar
- Tool calls aparecem como cards colapsáveis dentro das mensagens

### /settings/agents
- Lista de agentes cadastrados (nome, provider, modelo, flag padrão)
- Botão adicionar novo
- Modal/form: nome, provider (dropdown), modelo (dropdown dinâmico), API key, flag padrão
- Editar/excluir

### /settings/argo
- Lista de servidores ArgoCD (nome, URL, flag padrão)
- Botão adicionar novo
- Modal/form: nome amigável, URL, usuário, senha, flag padrão
- Botão "testar conexão"
- Editar/excluir

## Ordem de Implementação

### Fase 1: Bootstrap
- `npx create-next-app` com TypeScript + Tailwind + App Router
- `npm install @prisma/client prisma @anthropic-ai/sdk openai @google/genai bcrypt jose`
- Setup Prisma com SQLite, criar schema, rodar migration
- `.env.local` com ENCRYPTION_KEY e JWT_SECRET

### Fase 2: Auth + DB
- `src/lib/encryption.ts` - AES-256-GCM
- `src/lib/db.ts` - Prisma client singleton
- `src/lib/auth.ts` - bcrypt + JWT helpers
- `src/middleware.ts` - proteção de rotas
- `src/app/api/auth/route.ts` - endpoint de login
- `src/app/login/page.tsx` + `LoginForm.tsx`
- Script seed para criar primeiro usuário

### Fase 3: Settings - CRUD
- API routes: `/api/agents` e `/api/argo-servers` (GET, POST, PUT, DELETE)
- Componentes de settings (forms + listas)
- Páginas `/settings/agents` e `/settings/argo`

### Fase 4: ArgoCD Client
- `src/lib/argocd/types.ts` - tipos da API
- `src/lib/argocd/client.ts` - client dinâmico (recebe URL + credenciais)

### Fase 5: Tools + AI Provider (Claude)
- Tool definitions + executor + claude-format converter
- Claude provider + factory (preparado para adicionar outros)
- System prompt
- Truncation de respostas grandes (max ~4000 chars para tool results)

### Fase 6: Chat
- `src/app/api/chat/route.ts` - SSE endpoint
- Componentes de chat (interface, mensagens, selectors, input)
- `src/app/page.tsx` - página principal

### Fase 7: Polish
- Loading states, error handling, toasts
- Testar conexão ArgoCD na tela de settings
- Responsividade mobile

## Verificação

1. `npx prisma migrate dev` + `npm run dev`
2. Acessar http://localhost:3000 → redirect para /login
3. Fazer login → redirect para chat
4. Ir em /settings/agents → cadastrar agente Claude com API key
5. Ir em /settings/argo → cadastrar servidor ArgoCD + testar conexão
6. Voltar ao chat → selecionar agente + ArgoCD server nos dropdowns
7. Digitar "listar minhas aplicações" → deve retornar lista real
8. Digitar "reiniciar o backend" → deve executar rolling restart
9. Trocar para outro agente (OpenAI/Gemini) → mesmo comportamento
10. Verificar no DB que API keys estão encriptadas (não em plaintext)
