import { ARGOCD_TOOLS } from "./definitions";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

export function getOpenAITools(): ChatCompletionTool[] {
  return ARGOCD_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
