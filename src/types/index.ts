export interface DebugLogEntry {
  timestamp: string;
  direction: "sent" | "received";
  label: string;
  data: unknown;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallResult[];
  status?: "thinking" | "tool_executing" | "done" | "error";
  isError?: boolean;
  debugLogs?: DebugLogEntry[];
}

export interface Suggestion {
  label: string;
  prompt: string;
}

export interface BatchSyncProgress {
  phase:
    | "resolving"
    | "batch_start"
    | "syncing"
    | "polling"
    | "batch_complete"
    | "batch_failed"
    | "retrying"
    | "complete"
    | "aborted";
  totalApps: number;
  totalBatches: number;
  currentBatch: number;
  batchApps: string[];
  appStatuses: Record<string, { syncStatus: string; healthStatus: string }>;
  attempt: number;
  maxRetries: number;
  message: string;
}

export interface ToolCallResult {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  suggestions?: Suggestion[];
  progress?: BatchSyncProgress;
}

export interface SSEEvent {
  type: "text" | "tool_call_start" | "tool_call_result" | "tool_call_progress" | "error" | "done";
  data: string | ToolCallResult;
}

export interface ProviderModel {
  id: string;
  label: string;
}

export interface ProviderConfig {
  id: string;
  label: string;
  models: ProviderModel[];
}

export interface ChatSessionSummary {
  id: number;
  title: string;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  preview: string;
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
