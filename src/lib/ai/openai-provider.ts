import OpenAI from "openai";
import type { AIProvider, AIMessage, StreamEvent, ToolCall } from "./types";
import { SYSTEM_PROMPT } from "./system-prompt";
import { getOpenAITools } from "@/lib/tools/openai-format";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(
    messages: AIMessage[],
    onEvent: (event: StreamEvent) => void,
    getToolResult: (toolCall: ToolCall) => Promise<string>
  ): Promise<void> {
    const tools = getOpenAITools();
    const oaiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map(
        (m) =>
          ({
            role: m.role,
            content: m.content,
          }) as ChatCompletionMessageParam
      ),
    ];

    let continueLoop = true;

    while (continueLoop) {
      const response = await this.client.chat.completions.create({
        model: this.model,
        tools,
        messages: oaiMessages,
      });

      const choice = response.choices[0];
      if (!choice) break;

      const message = choice.message;

      if (message.content) {
        onEvent({ type: "text", text: message.content });
      }

      const toolCallsRaw = message.tool_calls;
      if (!toolCallsRaw || toolCallsRaw.length === 0) {
        continueLoop = false;
        break;
      }

      // Add assistant message
      oaiMessages.push({
        role: "assistant",
        content: message.content || null,
        tool_calls: toolCallsRaw,
      });

      // Execute tools
      for (const tc of toolCallsRaw) {
        if (tc.type !== "function") continue;
        const fn = tc.function as { name: string; arguments: string };
        const parsed: ToolCall = {
          id: tc.id,
          name: fn.name,
          input: JSON.parse(fn.arguments || "{}"),
        };

        onEvent({ type: "tool_call", toolCall: parsed });
        const result = await getToolResult(parsed);

        const toolMsg: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        };
        oaiMessages.push(toolMsg);
      }

      if (choice.finish_reason === "stop") {
        continueLoop = false;
      }
    }

    onEvent({ type: "done" });
  }
}
