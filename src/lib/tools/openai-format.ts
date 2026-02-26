import type { ToolDefinition } from "./definitions";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

export function getOpenAITools(tools: ToolDefinition[]): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
