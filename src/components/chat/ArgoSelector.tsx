"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ArgoServer {
  id: number;
  name: string;
  url: string;
  isDefault: boolean;
}

type HealthStatus = "checking" | "connected" | "slow" | "error";

interface ArgoSelectorProps {
  onSelect: (serverId: number) => void;
}

const BADGE_COLORS: Record<HealthStatus, string> = {
  checking: "bg-text-muted animate-pulse",
  connected: "bg-success",
  slow: "bg-warning",
  error: "bg-danger",
};

const BADGE_TITLES: Record<HealthStatus, string> = {
  checking: "Verificando conexão...",
  connected: "Conectado",
  slow: "Conectado (latência alta)",
  error: "Erro de conexão",
};

export default function ArgoSelector({ onSelect }: ArgoSelectorProps) {
  const [servers, setServers] = useState<ArgoServer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [health, setHealth] = useState<HealthStatus>("checking");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async (serverId: number) => {
    setHealth("checking");
    try {
      const res = await fetch(`/api/argo-servers/${serverId}/health`);
      if (!res.ok) {
        setHealth("error");
        return;
      }
      const data = await res.json();
      if (data.status === "connected") {
        setHealth(data.latency >= 2000 ? "slow" : "connected");
      } else {
        setHealth("error");
      }
    } catch {
      setHealth("error");
    }
  }, []);

  const startPolling = useCallback(
    (serverId: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      checkHealth(serverId);
      intervalRef.current = setInterval(() => checkHealth(serverId), 30000);
    },
    [checkHealth]
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/argo-servers");
    if (res.ok) {
      const data = await res.json();
      setServers(data);
      const defaultServer = data.find((s: ArgoServer) => s.isDefault) || data[0];
      if (defaultServer) {
        setSelectedId(defaultServer.id);
        onSelect(defaultServer.id);
        startPolling(defaultServer.id);
      }
    }
  }, [onSelect, startPolling]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  function handleChange(id: number) {
    setSelectedId(id);
    onSelect(id);
    startPolling(id);
  }

  if (servers.length === 0) {
    return (
      <span className="text-sm text-warning">
        Nenhum servidor ArgoCD configurado
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${BADGE_COLORS[health]}`}
        title={BADGE_TITLES[health]}
      />
      <select
        value={selectedId || ""}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="max-w-[8rem] sm:max-w-none px-2 py-1 text-xs sm:text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary truncate"
      >
        {servers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
