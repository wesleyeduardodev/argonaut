"use client";

import { useState, useEffect, useCallback } from "react";
import GitServerForm from "./GitServerForm";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface GitServer {
  id: number;
  name: string;
  platform: string;
  url: string;
  defaultOwner: string | null;
  isDefault: boolean;
}

export default function GitServerList() {
  const [servers, setServers] = useState<GitServer[]>([]);
  const [editing, setEditing] = useState<GitServer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch("/api/git-servers");
      if (res.ok) setServers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  async function confirmDelete() {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    await fetch(`/api/git-servers?id=${id}`, { method: "DELETE" });
    fetchServers();
  }

  function handleSave() {
    setShowForm(false);
    setEditing(null);
    fetchServers();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-text-muted">Carregando servidores...</span>
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
          Adicionar Servidor
        </button>
      )}

      {/* Form */}
      {(showForm || editing) && (
        <div className="card-gradient p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-text">
                {editing ? "Editar Servidor Git" : "Novo Servidor Git"}
              </h3>
              <p className="text-xs text-text-muted">
                {editing ? "Atualize as configuracoes do servidor" : "Configure uma nova conexao com GitHub"}
              </p>
            </div>
          </div>
          <GitServerForm
            initial={editing || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {/* Empty state / List */}
      {servers.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <div className="text-5xl mb-4 opacity-50">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="inline-block text-text-muted">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
          </div>
          <p className="text-text font-medium">Nenhum servidor Git configurado</p>
          <p className="text-text-muted text-sm mt-1 max-w-xs mx-auto">
            Conecte-se ao GitHub para gerenciar repositorios, branches e pull requests via chat
          </p>
        </div>
      ) : !showForm && !editing ? (
        <div className="space-y-3">
          {servers.map((s) => (
            <div
              key={s.id}
              className="group relative bg-surface border border-border rounded-2xl p-4 hover:border-border-focus transition-all"
            >
              <div className="relative">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Server icon */}
                  <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-bg border border-border flex items-center justify-center shadow-sm">
                    <div className="relative">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                      </svg>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text">{s.name}</span>
                      {s.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          padrao
                        </span>
                      )}
                      <span className="inline-flex items-center text-[10px] uppercase tracking-wider bg-surface-hover text-text-muted px-2 py-0.5 rounded-full font-semibold border border-border">
                        {s.platform}
                      </span>
                      {/* Actions inline */}
                      <div className="flex gap-0.5 ml-auto opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setEditing(s)}
                          className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Editar"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s.id)}
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
                      <span className="font-code truncate">{s.url}</span>
                      {s.defaultOwner && (
                        <>
                          <span className="text-border flex-shrink-0">·</span>
                          <span className="flex-shrink-0">{s.defaultOwner}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Excluir servidor"
        description="O servidor Git e suas configuracoes serao removidos permanentemente."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
