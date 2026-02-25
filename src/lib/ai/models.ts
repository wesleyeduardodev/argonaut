import { ProviderConfig } from "@/types";

export const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: "claude",
    label: "Claude (Anthropic)",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini (Google)",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
];

export function getModelsForProvider(providerId: string) {
  return PROVIDER_CONFIGS.find((p) => p.id === providerId)?.models || [];
}
