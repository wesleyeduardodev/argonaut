import { GoogleGenAI } from "@google/genai";
import type { AIProvider, AIMessage, StreamEvent, ToolCall } from "./types";
import { SYSTEM_PROMPT } from "./system-prompt";
import { getGeminiTools } from "@/lib/tools/gemini-format";
import type { Content, Part } from "@google/genai";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async chat(
    messages: AIMessage[],
    onEvent: (event: StreamEvent) => void,
    getToolResult: (toolCall: ToolCall) => Promise<string>
  ): Promise<void> {
    const tools = getGeminiTools();
    const geminiHistory: Content[] = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = this.client.chats.create({
      model: this.model,
      history: geminiHistory,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: tools }],
      },
    });

    let continueLoop = true;
    let currentInput: string | Part[] = lastMessage.content;

    while (continueLoop) {
      const response = await (await chat).sendMessage({
        message: currentInput,
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const toolCalls: ToolCall[] = [];

      for (const part of parts) {
        if (part.text) {
          onEvent({ type: "text", text: part.text });
        }
        if (part.functionCall) {
          const tc: ToolCall = {
            id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: part.functionCall.name!,
            input: (part.functionCall.args || {}) as Record<string, unknown>,
          };
          toolCalls.push(tc);
          onEvent({ type: "tool_call", toolCall: tc });
        }
      }

      if (toolCalls.length === 0) {
        continueLoop = false;
        break;
      }

      // Execute tools and send results back
      const functionResponses: Part[] = [];
      for (const tc of toolCalls) {
        const result = await getToolResult(tc);
        let parsed: unknown;
        try {
          parsed = JSON.parse(result);
        } catch {
          parsed = { result };
        }
        functionResponses.push({
          functionResponse: {
            name: tc.name,
            response: parsed as Record<string, unknown>,
          },
        });
      }

      currentInput = functionResponses;
    }

    onEvent({ type: "done" });
  }
}
