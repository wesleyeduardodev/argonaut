"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface GitServer {
  id: number;
  name: string;
  url: string;
  platform: string;
  isDefault: boolean;
}

type HealthStatus = "checking" | "connected" | "slow" | "error" | "none";

interface GitServerSelectorProps {
  onSelect: (serverId: number | null) => void;
}

const BADGE_COLORS: Record<HealthStatus, string> = {
  checking: "bg-text-muted animate-pulse",
  connected: "bg-success",
  slow: "bg-warning",
  error: "bg-danger",
  none: "bg-text-muted/30",
};

const BADGE_TITLES: Record<HealthStatus, string> = {
  checking: "Verificando conexao...",
  connected: "Conectado",
  slow: "Conectado (latencia alta)",
  error: "Erro de conexao",
  none: "Nenhum servidor selecionado",
};

export default function GitServerSelector({ onSelect }: GitServerSelectorProps) {
  const [servers, setServers] = useState<GitServer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [health, setHealth] = useState<HealthStatus>("none");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async (serverId: number) => {
    setHealth("checking");
    try {
      const res = await fetch(`/api/git-servers/${serverId}/health`);
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
    (serverId: number | null) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!serverId) {
        setHealth("none");
        return;
      }
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
    const res = await fetch("/api/git-servers");
    if (res.ok) {
      const data = await res.json();
      setServers(data);
      if (data.length > 0) {
        const defaultServer = data.find((s: GitServer) => s.isDefault) || data[0];
        setSelectedId(defaultServer.id);
        onSelect(defaultServer.id);
        startPolling(defaultServer.id);
      }
    }
  }, [onSelect, startPolling]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  function handleChange(value: string) {
    if (value === "none") {
      setSelectedId(null);
      onSelect(null);
      startPolling(null);
    } else {
      const id = Number(value);
      setSelectedId(id);
      onSelect(id);
      startPolling(id);
    }
  }

  if (servers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${BADGE_COLORS[health]}`}
        title={BADGE_TITLES[health]}
      />
      <select
        value={selectedId ?? "none"}
        onChange={(e) => handleChange(e.target.value)}
        className="max-w-[8rem] sm:max-w-none px-2 py-1 text-xs sm:text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary truncate"
      >
        <option value="none">Sem Git</option>
        {servers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
