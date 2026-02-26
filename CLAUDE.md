# Argonaut - ArgoCD + Git Management Chat Interface

## What is this project?

Argonaut is a multi-tenant web-based chat interface that lets users manage ArgoCD applications and Git (GitHub) repositories using natural language. Users talk to an AI (Claude, OpenAI, or Gemini) which translates requests into ArgoCD and GitHub API calls. Think of it as a conversational DevOps assistant for Kubernetes deployments and Git workflows. Each user has their own isolated AI providers, ArgoCD servers, and Git servers — User A cannot see or use User B's data.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5.9
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT (jose) + bcrypt for passwords + self-service registration
- **Encryption**: AES-256-GCM (Node crypto) for API keys and credentials
- **AI SDKs**: @anthropic-ai/sdk, openai, @google/genai
- **Streaming**: Server-Sent Events (SSE) for real-time chat

## Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run db:migrate   # Prisma migrations
npm run db:seed      # Seed DB (creates admin/admin user — optional, users can self-register)
npm run db:studio    # Prisma Studio GUI
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main chat page (protected)
│   ├── layout.tsx                  # Root layout
│   ├── login/page.tsx              # Login page (+ link to register)
│   ├── register/page.tsx           # Registration page (+ link to login)
│   ├── settings/
│   │   ├── providers/page.tsx      # AI Provider CRUD (with SettingsTabs)
│   │   ├── argo/page.tsx           # ArgoCD Server CRUD (with SettingsTabs)
│   │   └── git/page.tsx            # Git Server CRUD (with SettingsTabs)
│   └── api/
│       ├── auth/route.ts           # POST login, DELETE logout
│       ├── register/route.ts       # POST register (self-service signup + auto-login)
│       ├── providers/route.ts      # AI Provider CRUD API (userId-scoped)
│       ├── argo-servers/route.ts   # ArgoCD Server CRUD API (userId-scoped)
│       ├── argo-servers/test/      # POST test ArgoCD connection
│       ├── argo-servers/[id]/health/ # GET health check (polling)
│       ├── git-servers/route.ts    # Git Server CRUD API (userId-scoped)
│       ├── git-servers/test/       # POST test GitHub connection
│       ├── git-servers/[id]/health/ # GET health check (polling)
│       └── chat/route.ts           # SSE chat streaming endpoint (userId-scoped)
├── components/
│   ├── chat/                       # ChatInterface, MessageList, MessageBubble,
│   │                               # ChatInput, ProviderSelector, ArgoSelector,
│   │                               # GitServerSelector, ToolCallDisplay, MessageDebugLog
│   ├── settings/                   # ProviderList/Form, ArgoServerList/Form,
│   │                               # GitServerList/Form, SettingsTabs
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── lib/
│   ├── db.ts                       # Prisma client singleton
│   ├── auth.ts                     # JWT + bcrypt helpers + getUserId()
│   ├── encryption.ts               # AES-256-GCM encrypt/decrypt
│   ├── proxy.ts                    # Auth middleware (protects all routes except /login, /register, /api/auth, /api/register)
│   ├── ai/
│   │   ├── types.ts                # AIProvider interface, AIMessage, ToolCall, StreamEvent
│   │   ├── provider-factory.ts     # Factory: createAIProvider(type, key, model, tools)
│   │   ├── claude-provider.ts      # Anthropic Claude implementation
│   │   ├── openai-provider.ts      # OpenAI implementation
│   │   ├── gemini-provider.ts      # Google Gemini implementation
│   │   ├── models.ts               # Supported models per provider
│   │   └── system-prompt.ts        # ArgoCD + Git assistant system prompt (conditional sections)
│   ├── tools/
│   │   ├── definitions.ts          # ARGOCD_TOOLS + GIT_TOOLS + getAllTools()
│   │   ├── executor.ts             # Tool name -> client method dispatcher (ToolContext)
│   │   ├── suggestions.ts          # Tool-specific follow-up suggestions
│   │   ├── claude-format.ts        # Tool defs -> Claude API format
│   │   ├── openai-format.ts        # Tool defs -> OpenAI API format
│   │   └── gemini-format.ts        # Tool defs -> Gemini API format
│   ├── argocd/
│   │   ├── client.ts               # ArgoCD REST API client (token/userpass auth, JWT cache)
│   │   └── types.ts                # ArgoCD TypeScript interfaces
│   └── git/
│       ├── types.ts                # GitProvider interface, Repository, Branch, PullRequest, WorkflowRun
│       ├── github-client.ts        # GitHub REST API client (implements GitProvider)
│       └── client-factory.ts       # Factory: createGitProvider(config) -> GitProvider
└── types/index.ts                  # Shared types
prisma/
├── schema.prisma                   # User, AIProvider, ArgoServer, GitServer, ChatSession, ChatMessage
├── migrations/                     # Migration history
└── seed.ts                         # Seeds admin user
```

## Architecture

### Data Flow

```
User input -> ChatInterface -> POST /api/chat (SSE stream)
  -> Decrypt credentials from DB
  -> getAllTools({ git: !!gitClient })          # Combine ArgoCD + Git tools if Git server selected
  -> createAIProvider(type, apiKey, model, tools)
  -> new ArgoClient(argoConfig)
  -> createGitProvider(gitConfig)               # Optional, only if gitServerId provided
  -> buildSystemPrompt({ appContext, gitEnabled, gitDefaultOwner })
  -> aiProvider.chat(messages, onEvent, getToolResult)
    -> AI returns tool_use -> executeTool(toolContext, name, args)
    -> ArgoClient calls ArgoCD REST API  |  GitHubClient calls GitHub REST API
    -> Result sent back to AI (loop until end_turn)
  -> SSE events streamed to frontend: text | tool_call_start | tool_call_result | error | done
```

### Key Patterns

- **Multi-Tenancy by userId**: AIProviders, ArgoServers, and GitServers are scoped per user via `userId` FK. All API routes call `getUserId()` and filter queries by userId. The unique constraint on AIProvider is `@@unique([userId, provider])` — each user can have one provider per type (claude, openai, gemini)
- **Factory Pattern**: `provider-factory.ts` instantiates the correct AI provider; `client-factory.ts` instantiates the correct Git provider
- **AIProvider Interface**: All providers implement `chat(messages, onEvent, getToolResult)` — a streaming loop that calls tools until the AI is done. Providers receive `ToolDefinition[]` in constructor and format tools internally
- **ToolContext**: `executeTool()` receives `{ argoClient, gitClient? }` — Git tools gracefully return error if `gitClient` is undefined
- **Dynamic Tool Loading**: `getAllTools({ git?: boolean })` combines ArgoCD + Git tools based on whether a Git server is selected
- **Tool Truncation**: Tool outputs are capped at 4000 chars to control token costs (`executor.ts`)
- **Credential Encryption**: All API keys, tokens, and passwords are AES-256-GCM encrypted before storage; decrypted at request time
- **ArgoCD Auth**: Supports both token and username/password; username/password auth caches the JWT token for 23 hours
- **Ownership Validation**: Every CRUD and chat API route validates that the requested resource belongs to the authenticated user. Mismatched ownership returns 404 (not 403) to avoid leaking resource existence
- **Settings Navigation**: Tabs/pills component (`SettingsTabs.tsx`) shared across all 3 settings pages

### Database Models (Prisma/PostgreSQL)

- **User**: id, username, password (bcrypt hash), providers[], argoServers[], gitServers[], chatSessions[]
- **AIProvider**: id, name, provider, apiKey (encrypted), defaultModel, isDefault, **userId** (FK -> User, onDelete: Cascade) — `@@unique([userId, provider])`
- **ArgoServer**: id, name, url, authType (token|userpass), token/username/password (encrypted), insecure, isDefault, **userId** (FK -> User, onDelete: Cascade)
- **GitServer**: id, name, platform ("github"), url, token (encrypted PAT), defaultOwner, isDefault, **userId** (FK -> User, onDelete: Cascade)
- **ChatSession**: id, title, provider, model, userId, messages[]
- **ChatMessage**: id, role, content, toolCalls, sessionId

### SSE Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `text` | `{ text }` | AI text chunk |
| `tool_call_start` | `{ id, name, input }` | Tool execution started |
| `tool_call_result` | `{ id, name, output }` | Tool execution result |
| `error` | `{ error }` | Error message |
| `done` | `{}` | Stream complete |

## ArgoCD Tools (16 total)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `list_applications` | List all apps with sync/health status | - |
| `get_application` | Detailed app info | name |
| `sync_application` | Trigger sync/deploy | name |
| `rollback_application` | Rollback to previous version | name, id |
| `get_application_logs` | Pod logs | name (optional: container, tail_lines) |
| `get_resource_tree` | K8s resource hierarchy | name |
| `get_managed_resources` | Resources with live/desired diffs | name |
| `get_application_events` | K8s events | name |
| `terminate_operation` | Cancel stuck operations | name |
| `delete_application` | Delete app + K8s resources | name |
| `restart_application` | Rolling restart (Deployments/StatefulSets) | name |
| `list_projects` | List ArgoCD projects | - |
| `get_project` | Project details | name |
| `list_clusters` | Registered K8s clusters | - |
| `list_repositories` | Git repo connections | - |
| `batch_sync` | Sync multiple apps in controlled batches | pattern or apps |

## Git Tools (8 total)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `search_repositories` | Search repos by name/keyword | query |
| `list_branches` | List repository branches | owner, repo |
| `list_pull_requests` | List PRs (default: open) | owner, repo |
| `get_pull_request` | PR details with diff stats | owner, repo, number |
| `create_pull_request` | Create a new PR | owner, repo, title, head, base |
| `merge_pull_request` | Merge a PR | owner, repo, number |
| `list_workflow_runs` | GitHub Actions runs | owner, repo |
| `get_workflow_run` | Workflow run details | owner, repo, run_id |

## Adding a New AI Provider

1. Create `src/lib/ai/<name>-provider.ts` implementing the `AIProvider` interface (receives `ToolDefinition[]` in constructor)
2. Add case to `src/lib/ai/provider-factory.ts`
3. Add models to `src/lib/ai/models.ts`
4. Create `src/lib/tools/<name>-format.ts` to convert tool definitions (receives `ToolDefinition[]` as parameter)

## Adding a New ArgoCD Tool

1. Add tool definition to `src/lib/tools/definitions.ts` (in `ARGOCD_TOOLS` array)
2. Add corresponding method to `src/lib/argocd/client.ts`
3. Add case to `src/lib/tools/executor.ts`
4. Optionally add suggestions to `src/lib/tools/suggestions.ts`

## Adding a New Git Tool

1. Add tool definition to `src/lib/tools/definitions.ts` (in `GIT_TOOLS` array)
2. Add method to `src/lib/git/types.ts` (`GitProvider` interface) and implement in `src/lib/git/github-client.ts`
3. Add case to `src/lib/tools/executor.ts` (under git tools section, with `!gitClient` guard)
4. Optionally add suggestions to `src/lib/tools/suggestions.ts`

## Adding a New Git Platform (e.g. GitLab, Bitbucket)

1. Create `src/lib/git/<name>-client.ts` implementing the `GitProvider` interface
2. Add case to `src/lib/git/client-factory.ts`
3. Add platform option to `GitServerForm.tsx` (currently only "github" is enabled)

## Environment Variables

```bash
ENCRYPTION_KEY=<64-char-hex>    # AES-256 key (32 bytes hex). Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<64-char-hex>        # JWT signing key (32 bytes hex)
DATABASE_URL=file:./dev.db      # SQLite database path (or PostgreSQL connection string)
```

## Auth & Registration Flow

- **Login**: POST `/api/auth` -> validates credentials -> `createSession(userId)` -> JWT cookie
- **Register**: POST `/api/register` -> validates (username 3-30 chars, password min 6, passwords match) -> checks unique username -> creates user -> auto-login via `createSession(userId)` -> redirect to `/`
- **getUserId()** (`src/lib/auth.ts`): Convenience helper used in all protected API routes. Calls `getSession()`, throws `"Unauthorized"` if no session. API routes catch this and return 401
- **Public routes** (no auth required): `/login`, `/register`, `/api/auth`, `/api/register`

## Conventions

- Path alias: `@/*` maps to `./src/*`
- All API routes are in `src/app/api/` (Next.js App Router convention)
- Components are organized by feature: `chat/`, `settings/`, `auth/`
- Prisma client is a singleton via `src/lib/db.ts`
- The AI system prompt is in `src/lib/ai/system-prompt.ts` — it instructs the AI to respond in the user's language and includes Git rules conditionally
- TypeScript strict mode is enabled
- All API routes that access AIProvider, ArgoServer, or GitServer must scope queries by `userId` (multi-tenancy)
- Tool format files (`claude-format.ts`, `openai-format.ts`, `gemini-format.ts`) receive `ToolDefinition[]` as parameter — they do not import tool arrays directly
- No test framework is configured yet
