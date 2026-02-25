"use client";

import { useState, useEffect, useCallback } from "react";
import { getModelsForProvider } from "@/lib/ai/models";

interface Provider {
  id: number;
  name: string;
  provider: string;
  defaultModel: string;
  isDefault: boolean;
}

interface ProviderSelectorProps {
  onSelect: (providerId: number, model: string, providerType: string) => void;
}

export default function ProviderSelector({ onSelect }: ProviderSelectorProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState("");

  const fetchProviders = useCallback(async () => {
    const res = await fetch("/api/providers");
    if (res.ok) {
      const data = await res.json();
      setProviders(data);
      const defaultProvider = data.find((p: Provider) => p.isDefault) || data[0];
      if (defaultProvider) {
        setSelectedId(defaultProvider.id);
        setSelectedModel(defaultProvider.defaultModel);
        onSelect(defaultProvider.id, defaultProvider.defaultModel, defaultProvider.provider);
      }
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  function handleProviderChange(id: number) {
    setSelectedId(id);
    const provider = providers.find((p) => p.id === id);
    if (provider) {
      setSelectedModel(provider.defaultModel);
      onSelect(id, provider.defaultModel, provider.provider);
    }
  }

  function handleModelChange(model: string) {
    setSelectedModel(model);
    const provider = providers.find((p) => p.id === selectedId);
    if (selectedId && provider) onSelect(selectedId, model, provider.provider);
  }

  const currentProvider = providers.find((p) => p.id === selectedId);
  const models = currentProvider
    ? getModelsForProvider(currentProvider.provider)
    : [];

  if (providers.length === 0) {
    return (
      <span className="text-sm text-warning">
        Nenhum provedor de IA configurado
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedId || ""}
        onChange={(e) => handleProviderChange(Number(e.target.value))}
        className="px-2 py-1 text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        value={selectedModel}
        onChange={(e) => handleModelChange(e.target.value)}
        className="px-2 py-1 text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
