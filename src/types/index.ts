export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallResult[];
}

export interface ToolCallResult {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
}

export interface SSEEvent {
  type: "text" | "tool_call_start" | "tool_call_result" | "error" | "done";
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
