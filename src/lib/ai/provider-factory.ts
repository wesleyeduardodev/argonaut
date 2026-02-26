import type { AIProvider } from "./types";
import type { ToolDefinition } from "@/lib/tools/definitions";
import { ClaudeProvider } from "./claude-provider";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";

export function createAIProvider(
  providerType: string,
  apiKey: string,
  model: string,
  tools: ToolDefinition[]
): AIProvider {
  switch (providerType) {
    case "claude":
      return new ClaudeProvider(apiKey, model, tools);
    case "openai":
      return new OpenAIProvider(apiKey, model, tools);
    case "gemini":
      return new GeminiProvider(apiKey, model, tools);
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}
