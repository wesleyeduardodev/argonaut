"use client";

import { useState } from "react";
import { PROVIDER_CONFIGS, getModelsForProvider } from "@/lib/ai/models";

interface ProviderFormProps {
  initial?: {
    id: number;
    name: string;
    provider: string;
    apiKey: string;
    defaultModel: string;
    isDefault: boolean;
  };
  onSave: () => void;
  onCancel: () => void;
}

export default function ProviderForm({ initial, onSave, onCancel }: ProviderFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [provider, setProvider] = useState(initial?.provider || "claude");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState(
    initial?.defaultModel || PROVIDER_CONFIGS[0].models[0].id
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault || false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const models = getModelsForProvider(provider);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name,
        provider,
        defaultModel,
        isDefault,
      };

      if (initial) body.id = initial.id;
      if (apiKey) body.apiKey = apiKey;
      else if (!initial) {
        setError("API Key is required");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/providers", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      onSave();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    const newModels = getModelsForProvider(newProvider);
    if (newModels.length > 0) {
      setDefaultModel(newModels[0].id);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="My Claude Provider"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PROVIDER_CONFIGS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          API Key {initial && <span className="text-gray-500">(leave blank to keep current)</span>}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={initial ? "****" : "sk-..."}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Default Model</label>
        <select
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-300">Default provider</span>
      </label>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
