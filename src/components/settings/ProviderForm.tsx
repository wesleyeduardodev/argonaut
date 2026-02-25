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

const PROVIDER_META: Record<string, { icon: string; color: string }> = {
  claude: { icon: "🟣", color: "from-purple-500/20 to-purple-600/5" },
  openai: { icon: "🟢", color: "from-emerald-500/20 to-emerald-600/5" },
  gemini: { icon: "🔵", color: "from-blue-500/20 to-blue-600/5" },
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="toggle-track"
        data-checked={checked}
      >
        <span className="toggle-thumb" />
      </button>
      <span className="text-sm text-text-muted group-hover:text-text transition-colors">{label}</span>
    </label>
  );
}

function getProviderLabel(providerId: string): string {
  const config = PROVIDER_CONFIGS.find((p) => p.id === providerId);
  return config ? config.label.split(" ")[0] : providerId;
}

export default function ProviderForm({ initial, onSave, onCancel }: ProviderFormProps) {
  const [provider, setProvider] = useState(initial?.provider || "claude");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState(
    initial?.defaultModel || PROVIDER_CONFIGS[0].models[0].id
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault || false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const models = getModelsForProvider(provider);
  const meta = PROVIDER_META[provider] || { icon: "⚙️", color: "from-cyan-500/20 to-cyan-600/5" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: getProviderLabel(provider),
        provider,
        defaultModel,
        isDefault,
      };

      if (initial) body.id = initial.id;
      if (apiKey) body.apiKey = apiKey;
      else if (!initial) {
        setError("API Key é obrigatória");
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
        setError(data.error || "Falha ao salvar");
        return;
      }

      onSave();
    } catch {
      setError("Erro de rede");
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* Provider type selector as cards */}
      <div>
        <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Provedor</label>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDER_CONFIGS.map((p) => {
            const m = PROVIDER_META[p.id] || { icon: "⚙️", color: "from-cyan-500/20 to-cyan-600/5" };
            const selected = provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderChange(p.id)}
                className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all ${
                  selected
                    ? "border-primary bg-gradient-to-b " + m.color + " shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                    : "border-border bg-bg hover:border-border-focus hover:bg-surface-hover"
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span className={`text-sm font-medium ${selected ? "text-text" : "text-text-muted"}`}>
                  {p.label.split(" ")[0]}
                </span>
                {selected && (
                  <div className="absolute top-2 right-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-primary">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
                      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          API Key {initial && <span className="normal-case tracking-normal text-text-muted/60">(vazio = manter atual)</span>}
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={initial ? "••••••••••••" : "sk-ant-api03-..."}
            className="field-input field-with-icon font-code"
          />
        </div>
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Modelo Padrão</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <span className="text-base">{meta.icon}</span>
          </div>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="field-input field-select field-with-icon"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggle */}
      <div className="pt-1">
        <Toggle checked={isDefault} onChange={setIsDefault} label="Definir como provedor padrão" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={loading}
          className="relative px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-bg font-semibold rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.25)]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
              Salvando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Salvar
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition-all text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
