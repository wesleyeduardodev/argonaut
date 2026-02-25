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
          setError("Token is required");
          setLoading(false);
          return;
        }
      } else {
        if (username) body.username = username;
        if (password) body.password = password;
        if (!initial && (!username || !password)) {
          setError("Username and password are required");
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
        message: data.message || data.error || "Unknown result",
      });
    } catch {
      setTestResult({ ok: false, message: "Network error" });
    } finally {
      setTesting(false);
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
          placeholder="Production"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://argocd.example.com"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Auth Type</label>
        <select
          value={authType}
          onChange={(e) => setAuthType(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="token">API Token (recommended)</option>
          <option value="userpass">Username / Password</option>
        </select>
      </div>

      {authType === "token" ? (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            API Token {initial && <span className="text-gray-500">(leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={initial ? "****" : "eyJhbGc..."}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password {initial && <span className="text-gray-500">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={initial ? "****" : "password"}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={insecure}
          onChange={(e) => setInsecure(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-300">Skip TLS verification (self-signed certs)</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-300">Default server</span>
      </label>

      {testResult && (
        <div
          className={`px-4 py-2 rounded-lg text-sm border ${
            testResult.ok
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {testResult.message}
        </div>
      )}

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
          onClick={handleTestConnection}
          disabled={testing || !url}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {testing ? "Testing..." : "Test Connection"}
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
