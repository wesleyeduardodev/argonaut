# Batch Sync — Deploy em Lotes Controlados

## Contexto

O usuário tem ArgoCD servers com 100+ apps organizadas por projeto (ex: `mentor-web-andrade`, `mentor-web-tostes`, `mentor-web-coimbra`...). Ao fazer deploy de atualizações em todas as apps `mentor-web-*` (30+), sincronizar tudo de uma vez sobrecarrega o cluster. Hoje o processo é manual: sync 2-3 apps, esperar ficarem Healthy, ir pro próximo grupo, lidar com pods presos.

**Objetivo:** O usuário diz "suba cada app do mentor-web de 3 em 3" e o Argonaut orquestra tudo automaticamente, com feedback em tempo real.

## Design: Tool `batch_sync`

Uma nova tool server-side que encapsula toda a orquestração. A IA faz uma única chamada, e o polling/retry acontece no servidor sem custo de tokens.

**Comportamento:**
1. Lista apps e filtra por pattern (glob: `mentor-web-*`)
2. Divide em lotes de N (configurável)
3. Para cada lote:
   - Sync todas as apps do lote em paralelo
   - Poll health a cada 10s até todas ficarem Healthy
   - Se timeout: re-sync o lote inteiro (retry)
   - Se após max_retries o lote não subiu → **PARA TUDO**
   - Só avança para o próximo lote se **100% do lote atual** estiver Healthy
4. Reporta progresso em tempo real via SSE

**Parâmetros da tool:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `pattern` | string | (obrigatório) | Glob pattern: `mentor-web-*`, `*production*` |
| `batch_size` | string→number | 3 | Apps por lote |
| `max_retries` | string→number | 2 | Tentativas por lote antes de parar (total = max_retries + 1) |
| `health_timeout_seconds` | string→number | 300 | Timeout por tentativa de health check |

## Novo tipo: `BatchSyncProgress`

Enviado via SSE durante a execução para feedback em tempo real:

```typescript
interface BatchSyncProgress {
  phase: "resolving" | "batch_start" | "syncing" | "polling" | "batch_complete" | "batch_failed" | "retrying" | "complete" | "aborted";
  totalApps: number;
  totalBatches: number;
  currentBatch: number;
  batchApps: string[];
  appStatuses: Record<string, { syncStatus: string; healthStatus: string }>;
  attempt: number;
  maxRetries: number;
  message: string;
}
```

## Novo evento SSE: `tool_call_progress`

Fluxo de eventos durante um batch_sync:
```
tool_call_start  → { id, name: "batch_sync", input }
tool_call_progress → { id, progress: BatchSyncProgress }  // múltiplos
tool_call_progress → { id, progress: BatchSyncProgress }
...
tool_call_result → { id, output: "resumo final", suggestions }
```

## Arquivos a Modificar

### Backend (sequencial)

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/lib/argocd/client.ts` | Adicionar tipo `BatchSyncProgress`, `OnBatchProgress`, e método `batchSync()` com retry, polling e progress callback |
| 2 | `src/lib/tools/definitions.ts` | Adicionar definição da tool `batch_sync` no array `ARGOCD_TOOLS` |
| 3 | `src/lib/tools/executor.ts` | Adicionar tipo `OnToolProgress`, param opcional `onProgress` no `executeTool()`, case `batch_sync` no switch |
| 4 | `src/app/api/chat/route.ts` | Passar callback `onProgress` para `executeTool()`, emitir `tool_call_progress` via SSE |

### Frontend (sequencial)

| # | Arquivo | Mudança |
|---|---------|---------|
| 5 | `src/types/index.ts` | Adicionar `BatchSyncProgress`, `progress?` no `ToolCallResult` |
| 6 | `src/components/chat/ChatInterface.tsx` | Novo case `tool_call_progress` no parser SSE |
| 7 | `src/components/chat/ToolCallDisplay.tsx` | Componente `BatchProgressDisplay` com barra de progresso, status por app, indicador de retry |

### Independentes (paralelo)

| # | Arquivo | Mudança |
|---|---------|---------|
| 8 | `src/lib/ai/system-prompt.ts` | Regra 7: quando usar batch_sync, listar apps antes pra confirmar |
| 9 | `src/lib/tools/labels.ts` | `batch_sync: "Batch Sync"` |
| 10 | `src/lib/tools/suggestions.ts` | Sugestões pós batch_sync: ver problemas, ver logs, listar apps |

## Lógica Core: `ArgoClient.batchSync()`

```
batchSync(pattern, batchSize=3, maxRetries=2, healthTimeout=300, onProgress):
  1. listApplications() → filtrar por pattern (glob→regex)
  2. Se 0 apps → return erro
  3. Dividir em lotes de batchSize, sort por nome
  4. Para cada lote:
     a. attempt = 1
     b. LOOP (até attempt > maxRetries+1):
        - onProgress("syncing", ...)
        - Promise.allSettled(batch.map(syncApplication))
        - POLL LOOP (cada 10s até healthTimeout):
          - Para cada app: getApplication() → checar health
          - onProgress("polling", appStatuses)
          - Se TODAS healthy → break
        - Se todas healthy → onProgress("batch_complete") → break → próximo lote
        - Se não → attempt++ → onProgress("retrying") → re-loop
     c. Se esgotou retries → onProgress("aborted") → return PAROU
  5. Todos lotes OK → onProgress("complete") → return sucesso
```

## UI: BatchProgressDisplay

Renderizado **sempre visível** (não precisa expandir o tool call):

```
┌─ 🚀 ⟳ Sync em lote ─────────────────────────────────────┐
│  Batch 2/10  ████████░░░░░░░░░░░░  20%                   │
│                                                            │
│  Batch 2: polling health — 2/3 healthy                    │
│                                                            │
│  ✓ mentor-web-andrade     Synced/Healthy                  │
│  ✓ mentor-web-tostes      Synced/Healthy                  │
│  ⟳ mentor-web-coimbra     Synced/Progressing              │
│                                                            │
│  Tentativa 1/3                                             │
└────────────────────────────────────────────────────────────┘
```

Cores por fase:
- `polling/syncing` → cyan (primary)
- `batch_complete/complete` → verde (success)
- `retrying/batch_failed` → amarelo (warning)
- `aborted` → vermelho (danger)

## Regra no System Prompt

```
7. **Batch sync**: When the user asks to sync multiple applications at once
   (e.g. "sync all mentor-web apps", "deploy in batches of 3"), use
   batch_sync with the appropriate pattern. ALWAYS call list_applications
   first to confirm matches before executing batch_sync. Default batch_size
   is 3 if not specified. Warn that this is a long-running operation.
   If it fails, suggest checking unhealthy apps with get_application_logs.
```

## Verificação

1. `npm run build` — compila sem erros
2. **Pattern match:** "sincronize todas as apps mentor-web em lotes de 3" → IA chama `list_applications` primeiro, depois `batch_sync({ pattern: "mentor-web-*", batch_size: "3" })`
3. **Progresso em tempo real:** durante execução, barra de progresso avança, status de cada app atualiza a cada 10s
4. **Sucesso:** todos os lotes completam → mensagem verde "All X batches complete"
5. **Falha com stop:** app quebrada no lote 2 → retenta até max_retries → para tudo → mostra quais falharam
6. **Sem matches:** pattern que não existe → retorna mensagem limpa
7. **Botão parar:** clicar stop durante batch_sync → stream fecha, progresso parcial mantido
