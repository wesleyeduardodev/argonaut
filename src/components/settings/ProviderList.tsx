"use client";

import { useState, useEffect, useCallback } from "react";
import ProviderForm from "./ProviderForm";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Provider {
  id: number;
  name: string;
  provider: string;
  apiKey: string;
  defaultModel: string;
  isDefault: boolean;
}

const PROVIDER_META: Record<string, { icon: string; label: string; gradient: string }> = {
  claude: { icon: "🟣", label: "Claude", gradient: "from-purple-500/10 to-transparent" },
  openai: { icon: "🟢", label: "OpenAI", gradient: "from-emerald-500/10 to-transparent" },
  gemini: { icon: "🔵", label: "Gemini", gradient: "from-blue-500/10 to-transparent" },
};

export default function ProviderList() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) setProviders(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  async function confirmDelete() {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    await fetch(`/api/providers?id=${id}`, { method: "DELETE" });
    fetchProviders();
  }

  function handleSave() {
    setShowForm(false);
    setEditing(null);
    fetchProviders();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-text-muted">Carregando provedores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add button */}
      {!showForm && !editing && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-bg font-semibold rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.25)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar Provedor
        </button>
      )}

      {/* Form */}
      {(showForm || editing) && (
        <div className="card-gradient p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H8a2 2 0 0 0-2 2v2h12v-2a2 2 0 0 0-2-2h-2c0-3 2-4 2-6a4 4 0 0 0-4-4z" />
                <path d="M9 18v1a3 3 0 0 0 6 0v-1" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-text">
                {editing ? "Editar Provedor" : "Novo Provedor"}
              </h3>
              <p className="text-xs text-text-muted">
                {editing ? "Atualize as configurações do provedor" : "Configure um novo provedor de IA"}
              </p>
            </div>
          </div>
          <ProviderForm
            initial={editing || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {/* Empty state / List (hidden when editing) */}
      {providers.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <div className="text-5xl mb-4 opacity-50">🤖</div>
          <p className="text-text font-medium">Nenhum provedor configurado</p>
          <p className="text-text-muted text-sm mt-1 max-w-xs mx-auto">
            Adicione um provedor de IA como Claude, OpenAI ou Gemini para começar
          </p>
        </div>
      ) : !showForm && !editing ? (
        <div className="space-y-3">
          {providers.map((p) => {
            const meta = PROVIDER_META[p.provider] || { icon: "⚙️", label: p.provider, gradient: "from-cyan-500/10 to-transparent" };
            return (
              <div
                key={p.id}
                className="group relative bg-surface border border-border rounded-2xl p-4 hover:border-border-focus transition-all"
              >
                {/* Subtle gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${meta.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />

                <div className="relative flex items-start gap-3 sm:gap-4">
                  {/* Provider icon */}
                  <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-bg border border-border flex items-center justify-center text-lg sm:text-xl shadow-sm">
                    {meta.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text">{p.name}</span>
                      {p.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          padrão
                        </span>
                      )}
                      {/* Actions inline */}
                      <div className="flex gap-0.5 ml-auto opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setEditing(p)}
                          className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Editar"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p.id)}
                          className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                          title="Deletar"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                      <span className="font-code truncate">{p.defaultModel}</span>
                      <span className="text-border flex-shrink-0">·</span>
                      <span className="font-code flex-shrink-0">Key: {p.apiKey}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Excluir provedor"
        description="O provedor de IA e suas configurações serão removidos permanentemente."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
