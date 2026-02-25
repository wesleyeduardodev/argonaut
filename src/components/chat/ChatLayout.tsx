"use client";

import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import ChatInterface from "./ChatInterface";

export default function ChatLayout() {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  // resetKey only changes on explicit user navigation (sidebar click / new chat),
  // NOT when a session is auto-created during first message send.
  const [resetKey, setResetKey] = useState(0);

  const handleSessionCreated = useCallback((id: number) => {
    setCurrentSessionId(id);
    setRefreshKey((k) => k + 1);
    // No resetKey change — ChatInterface stays mounted, streaming continues
  }, []);

  const handleMessageSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSelectSession = useCallback((id: number) => {
    setCurrentSessionId(id);
    setResetKey((k) => k + 1);
    setSidebarOpen(false); // close on mobile
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setResetKey((k) => k + 1);
    setSidebarOpen(false); // close on mobile
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        refreshKey={refreshKey}
      />
      <div className="flex-1 min-w-0">
        <ChatInterface
          key={resetKey}
          sessionId={currentSessionId}
          onSessionCreated={handleSessionCreated}
          onMessageSaved={handleMessageSaved}
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
        />
      </div>
    </div>
  );
}
