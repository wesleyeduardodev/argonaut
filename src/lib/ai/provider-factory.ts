import type { AIProvider } from "./types";
import { ClaudeProvider } from "./claude-provider";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";

export function createAIProvider(
  providerType: string,
  apiKey: string,
  model: string
): AIProvider {
  switch (providerType) {
    case "claude":
      return new ClaudeProvider(apiKey, model);
    case "openai":
      return new OpenAIProvider(apiKey, model);
    case "gemini":
      return new GeminiProvider(apiKey, model);
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}
