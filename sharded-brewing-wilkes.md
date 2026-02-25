# Fase 2 — Histórico de Conversas e Sidebar

## Contexto

Hoje **todas as mensagens do chat vivem em `useState`** — recarregar a página perde tudo. Não há conceito de "sessão" nem "histórico". O DESIGN-PLAN.md propõe adicionar persistência de conversas + sidebar com histórico agrupado por data.

### Pesquisa: SQLite é adequado?

**Sim.** iMessage e WeChat usam SQLite para chat. Pontos-chave:
- Coluna TEXT suporta até 1GB por célula — mais que suficiente
- JSON armazenado como TEXT com stringify/parse é o padrão (SQLite não tem JSONB)
- Volume típico: ~200 mensagens/sessão, ~5-50KB por sessão → insignificante para SQLite
- Índices em `(userId, updatedAt)` e `(sessionId)` garantem performance nas queries da sidebar

### O que persistir vs. o que descartar

| Dado | Persistir? | Motivo |
|------|-----------|--------|
| role + content | Sim | Essencial |
| toolCalls (ToolCallResult[]) | Sim, como JSON string | Preserva o fluxo completo da conversa |
| provider + model | Sim, **por sessão** | Contexto sem redundância |
| debugLogs | Não | Efêmero, só faz sentido durante streaming ao vivo |
| status (thinking/executing) | Não | Estado transitório de UI |
| isError | Não | Derivável do contexto |

### Título da conversa

MVP simples: usar o início da primeira mensagem do usuário (truncada em 80 chars). Sem chamada extra à IA.

---

## Schema Prisma

**Arquivo**: `prisma/schema.prisma`

Adicionar ao User:
```prisma
chatSessions ChatSession[]
```

Novos models:
```prisma
model ChatSession {
  id        Int            @id @default(autoincrement())
  title     String         @default("Nova conversa")
  provider  String?        // "claude" | "openai" | "gemini"
  model     String?        // "claude-sonnet-4-20250514"
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  userId    Int
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  ChatMessage[]

  @@index([userId, updatedAt])
}

model ChatMessage {
  id        Int          @id @default(autoincrement())
  role      String       // "user" | "assistant"
  content   String
  toolCalls String?      // JSON.stringify(ToolCallResult[])
  createdAt DateTime     @default(now())
  sessionId Int
  session   ChatSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}
```

**Decisões**:
- `@@index([userId, updatedAt])` — sidebar: `WHERE userId=? ORDER BY updatedAt DESC`
- `@@index([sessionId])` — carregar mensagens: `WHERE sessionId=? ORDER BY createdAt ASC`
- `onDelete: Cascade` em ambos — deletar sessão limpa mensagens, deletar user limpa tudo
- `updatedAt @updatedAt` — Prisma atualiza automaticamente ao fazer update no ChatSession

---

## Types

**Arquivo**: `src/types/index.ts` — adicionar:

```typescript
export interface ChatSessionSummary {
  id: number;
  title: string;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  preview: string; // primeiros ~80 chars da última mensagem
}

export interface ChatSessionDetail {
  id: number;
  title: string;
  provider: string | null;
  model: string | null;
  messages: ChatMessageDTO[];
}

export interface ChatMessageDTO {
  id: number;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallResult[];
  createdAt: string;
}
```

---

## API Routes

Todas seguem o padrão existente: `getUserId()` + catch Unauthorized → 401.

### `src/app/api/sessions/route.ts` (novo)

| Método | Descrição | Body/Params |
|--------|-----------|-------------|
| GET | Listar sessões (sidebar) | — |
| POST | Criar sessão | `{ title?, provider?, model? }` |
| PUT | Renomear sessão | `{ id, title }` |
| DELETE | Deletar sessão + mensagens | `?id=X` |

**GET**: `findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } } } })` → mapeia para `ChatSessionSummary[]` com preview.

### `src/app/api/sessions/[id]/messages/route.ts` (novo)

| Método | Descrição | Body |
|--------|-----------|------|
| GET | Carregar mensagens de uma sessão | — |
| POST | Salvar mensagem | `{ role, content, toolCalls? }` |

**POST**: Salva mensagem + faz `chatSession.update({ data: { updatedAt: new Date() } })` em transação (pois `@updatedAt` não dispara via child).

### `src/app/api/chat/route.ts` — SEM ALTERAÇÃO

O chat route continua stateless. O **frontend** gerencia criação de sessão e salvamento de mensagens independentemente do streaming SSE. Isso:
- Mantém o streaming focado e simples
- Desacopla persistência do streaming (se o save falhar, o user ainda vê a resposta)
- Zero risco de quebrar o fluxo SSE existente

---

## Componentes Frontend

### Fluxo de dados

```
page.tsx → ChatLayout (novo)
              ├── Sidebar (novo) ← GET /api/sessions
              └── ChatInterface (modificado)
                    ├── Cria sessão (POST /api/sessions) no 1º envio
                    ├── Salva mensagem user (POST /api/sessions/[id]/messages)
                    ├── Faz streaming SSE normalmente (POST /api/chat) — sem mudança
                    └── Salva mensagem assistant após stream completo
```

### `src/components/chat/ChatLayout.tsx` (novo)

Orquestrador top-level:
- Estado: `currentSessionId`, `sidebarOpen`, `refreshKey`
- Renderiza `<Sidebar />` + `<ChatInterface />`
- Usa `key={currentSessionId ?? "new"}` no ChatInterface para forçar reset de estado ao trocar sessão

### `src/components/chat/Sidebar.tsx` (novo)

- Busca sessões via `GET /api/sessions` (refetch quando `refreshKey` muda)
- Agrupa por data: "Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Mais antigos"
- Cada item: título truncado + preview da última mensagem
- Botão deletar no hover (com confirm)
- Botão "+ Nova conversa" no topo
- Desktop: `w-72`, colapsável com transição
- Mobile (<md): overlay fixed com backdrop semi-transparente

### `src/components/chat/ChatInterface.tsx` (modificar)

Novas props:
```typescript
interface ChatInterfaceProps {
  sessionId: number | null;
  onSessionCreated: (id: number) => void;
  onMessageSaved: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}
```

Mudanças:
1. **useEffect** — se `sessionId` presente, busca `GET /api/sessions/[id]/messages` e popula state
2. **handleSend** — se `sessionId` é null, cria sessão via `POST /api/sessions` antes de enviar
3. **Salva mensagens** — user message salva antes do streaming, assistant message salva após stream completar (fire-and-forget, não bloqueia UI)
4. **Header** — adiciona botão hamburger para toggle sidebar

### `src/components/chat/ProviderSelector.tsx` (modificar)

Estender callback: `onSelect(id, model)` → `onSelect(id, model, providerType)` para que ChatInterface passe o tipo do provider ao criar sessão.

### `src/components/chat/MessageList.tsx` (modificar)

Adicionar prop `loading?: boolean` — quando true, mostra spinner centralizado em vez do empty state.

### `src/app/page.tsx` (modificar)

```tsx
import ChatLayout from "@/components/chat/ChatLayout";
export default function Home() {
  return <ChatLayout />;
}
```

---

## Sequência de Implementação

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1 | `prisma/schema.prisma` | Adicionar ChatSession + ChatMessage |
| 2 | — | `npx prisma migrate dev --name add_chat_history` |
| 3 | `src/types/index.ts` | Adicionar tipos DTO |
| 4 | `src/app/api/sessions/route.ts` | Criar CRUD de sessões |
| 5 | `src/app/api/sessions/[id]/messages/route.ts` | Criar GET/POST de mensagens |
| 6 | `src/components/chat/Sidebar.tsx` | Criar sidebar com histórico |
| 7 | `src/components/chat/ChatLayout.tsx` | Criar layout orquestrador |
| 8 | `src/components/chat/ProviderSelector.tsx` | Estender onSelect com providerType |
| 9 | `src/components/chat/ChatInterface.tsx` | Adicionar props, loading, saving |
| 10 | `src/components/chat/MessageList.tsx` | Adicionar prop loading |
| 11 | `src/app/page.tsx` | Trocar ChatInterface por ChatLayout |
| 12 | — | `npm run build` — verificar compilação |

**Total**: 5 arquivos modificados, 4 arquivos criados.

---

## Verificação

1. `npx prisma migrate dev` — migration aplica sem erros
2. `npm run build` — compila sem erros
3. Abrir app → sidebar vazia, chat funcional (criar nova conversa)
4. Enviar mensagem → sessão criada, aparece na sidebar com título
5. Enviar mais mensagens → sidebar atualiza preview/ordem
6. Clicar em sessão na sidebar → carrega histórico completo (mensagens + tool calls)
7. Clicar "+ Nova conversa" → chat limpo, sidebar mantém histórico anterior
8. Deletar sessão → some da sidebar
9. Recarregar página → sessão ativa reaparece com mensagens restauradas
10. Login com outro user → sidebar vazia (isolamento por userId)
11. Mobile → sidebar como drawer com backdrop
