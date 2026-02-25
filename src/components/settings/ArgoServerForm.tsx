"use client";

import { useState } from "react";

interface ArgoServerFormProps {
  initial?: {
    id: number;
    name: string;
    url: string;
    authType: string;
    username: string | null;
    insecure: boolean;
    isDefault: boolean;
  };
  onSave: () => void;
  onCancel: () => void;
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="toggle-track mt-0.5"
        data-checked={checked}
      >
        <span className="toggle-thumb" />
      </button>
      <div>
        <span className="text-sm text-text-muted group-hover:text-text transition-colors block">{label}</span>
        {description && <span className="text-xs text-text-muted/60 block mt-0.5">{description}</span>}
      </div>
    </label>
  );
}

export default function ArgoServerForm({ initial, onSave, onCancel }: ArgoServerFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [authType, setAuthType] = useState(initial?.authType || "token");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState(initial?.username || "");
  const [password, setPassword] = useState("");
  const [insecure, setInsecure] = useState(initial?.insecure || false);
  const [isDefault, setIsDefault] = useState(initial?.isDefault || false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name,
        url,
        authType,
        insecure,
        isDefault,
      };

      if (initial) body.id = initial.id;

      if (authType === "token") {
        if (token) body.token = token;
        else if (!initial) {
          setError("Token é obrigatório");
          setLoading(false);
          return;
        }
      } else {
        if (username) body.username = username;
        if (password) body.password = password;
        if (!initial && (!username || !password)) {
          setError("Usuário e senha são obrigatórios");
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/argo-servers", {
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

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/argo-servers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          authType,
          token: token || undefined,
          username: username || undefined,
          password: password || undefined,
          insecure,
          existingId: initial?.id,
        }),
      });

      const data = await res.json();
      setTestResult({
        ok: res.ok,
        message: data.message || data.error || "Resultado desconhecido",
      });
    } catch {
      setTestResult({ ok: false, message: "Erro de rede" });
    } finally {
      setTesting(false);
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

      {/* Server info section */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" />
            <circle cx="6" cy="6" r="1" /><circle cx="6" cy="18" r="1" />
          </svg>
          Servidor
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Nome</label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 3h-7A2.5 2.5 0 0 0 6 5.5v13A2.5 2.5 0 0 0 8.5 21h7a2.5 2.5 0 0 0 2.5-2.5v-13A2.5 2.5 0 0 0 15.5 3z" />
                <path d="M10 15h4M12 7v4" />
              </svg>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Production, Staging..."
              className="field-input field-with-icon"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">URL</label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://argocd.example.com"
              className="field-input field-with-icon font-code"
            />
          </div>
        </div>
      </div>

      {/* Auth section */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Autenticação
        </div>

        {/* Auth type as cards */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAuthType("token")}
            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              authType === "token"
                ? "border-primary bg-primary/5 shadow-[0_0_16px_rgba(6,182,212,0.08)]"
                : "border-border bg-bg hover:border-border-focus hover:bg-surface-hover"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${authType === "token" ? "bg-primary/15 text-primary" : "bg-surface text-text-muted"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <div>
              <div className={`text-sm font-medium ${authType === "token" ? "text-text" : "text-text-muted"}`}>API Token</div>
              <div className="text-[11px] text-text-muted/60">Recomendado</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAuthType("userpass")}
            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              authType === "userpass"
                ? "border-primary bg-primary/5 shadow-[0_0_16px_rgba(6,182,212,0.08)]"
                : "border-border bg-bg hover:border-border-focus hover:bg-surface-hover"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${authType === "userpass" ? "bg-primary/15 text-primary" : "bg-surface text-text-muted"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <div className={`text-sm font-medium ${authType === "userpass" ? "text-text" : "text-text-muted"}`}>Usuário / Senha</div>
              <div className="text-[11px] text-text-muted/60">Login direto</div>
            </div>
          </button>
        </div>

        {authType === "token" ? (
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              API Token {initial && <span className="normal-case tracking-normal text-text-muted/60">(vazio = manter atual)</span>}
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={initial ? "••••••••••••" : "eyJhbGciOiJIUzI1NiIs..."}
                className="field-input field-with-icon font-code"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Usuário</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="field-input field-with-icon"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                Senha {initial && <span className="normal-case tracking-normal text-text-muted/60">(vazio = manter)</span>}
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={initial ? "••••••••" : "senha"}
                  className="field-input field-with-icon"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          Opções
        </div>
        <div className="space-y-3 pl-1">
          <Toggle
            checked={insecure}
            onChange={setInsecure}
            label="Ignorar verificação TLS"
            description="Para certificados auto-assinados em ambientes de desenvolvimento"
          />
          <Toggle
            checked={isDefault}
            onChange={setIsDefault}
            label="Servidor padrão"
            description="Será selecionado automaticamente ao abrir o chat"
          />
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
            testResult.ok
              ? "bg-success/10 border-success/20 text-success"
              : "bg-danger/10 border-danger/20 text-danger"
          }`}
        >
          {testResult.ok ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          )}
          {testResult.message}
        </div>
      )}

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
          onClick={handleTestConnection}
          disabled={testing || !url}
          className="flex items-center gap-2 px-4 py-2.5 bg-success/10 hover:bg-success/20 disabled:opacity-40 text-success border border-success/20 font-medium rounded-xl transition-all text-sm"
        >
          {testing ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-success border-t-transparent rounded-full animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Testar Conexão
            </>
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
