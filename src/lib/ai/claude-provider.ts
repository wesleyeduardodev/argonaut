import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIMessage, StreamEvent, ToolCall } from "./types";
import { SYSTEM_PROMPT } from "./system-prompt";
import { getClaudeTools } from "@/lib/tools/claude-format";
import type {
  MessageParam,
  ContentBlockParam,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages";

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(
    messages: AIMessage[],
    onEvent: (event: StreamEvent) => void,
    getToolResult: (toolCall: ToolCall) => Promise<string>
  ): Promise<void> {
    const tools = getClaudeTools();
    const claudeMessages: MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let continueLoop = true;

    while (continueLoop) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages: claudeMessages,
      });

      const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
      let hasText = false;

      for (const block of response.content) {
        if (block.type === "text") {
          hasText = true;
          onEvent({ type: "text", text: block.text });
        } else if (block.type === "tool_use") {
          const tc: ToolCall = {
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          };
          toolCalls.push(tc);
          onEvent({ type: "tool_call", toolCall: tc });
        }
      }

      if (toolCalls.length === 0) {
        continueLoop = false;
        break;
      }

      // Add assistant message with the full content
      const assistantContent: ContentBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "text") {
          assistantContent.push({ type: "text" as const, text: block.text });
        } else if (block.type === "tool_use") {
          assistantContent.push({
            type: "tool_use" as const,
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }

      claudeMessages.push({ role: "assistant", content: assistantContent });

      // Execute tools and add results
      const toolResults: ToolResultBlockParam[] = [];
      for (const tc of toolCalls) {
        const result = await getToolResult(tc);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: result,
        });
      }

      claudeMessages.push({ role: "user", content: toolResults });

      // If stop_reason is end_turn, stop after processing tools
      if (response.stop_reason === "end_turn") {
        continueLoop = false;
      }
    }

    onEvent({ type: "done" });
  }
}
