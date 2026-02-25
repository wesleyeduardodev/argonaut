import { ARGOCD_TOOLS } from "./definitions";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export function getClaudeTools(): Tool[] {
  return ARGOCD_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object" as const,
      properties: tool.parameters.properties,
      required: tool.parameters.required,
    },
  }));
}
