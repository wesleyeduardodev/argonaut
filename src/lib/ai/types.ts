export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "done" };

export interface AIProvider {
  chat(
    messages: AIMessage[],
    onEvent: (event: StreamEvent) => void,
    getToolResult: (toolCall: ToolCall) => Promise<string>
  ): Promise<void>;
}
