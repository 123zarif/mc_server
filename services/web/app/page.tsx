'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar, TabType } from '../components/Sidebar';
import { OverviewTab } from '../components/OverviewTab';
import { ConsoleTab } from '../components/ConsoleTab';
import { PlayersTab } from '../components/PlayersTab';
import { SettingsTab } from '../components/SettingsTab';
import { AuthModal } from '../components/AuthModal';

interface ServerNodeConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  port: number;
}

interface ServerTelemetry {
  id: string;
  name: string;
  type: string;
  state: 'running' | 'exited' | 'restarting' | 'unknown';
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  memoryPercent: number;
  uptimeSeconds: number;
  players: {
    online: number;
    max: number;
    list: string[];
  };
}

export default function DashboardPage() {
  const [serverName, setServerName] = useState<string>(
    process.env.NEXT_PUBLIC_SERVER_NAME || 'Minecraft Network'
  );
  const [superadmins, setSuperadmins] = useState<string[]>(['litlua', 'ozzy']);
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [activeNode, setActiveNode] = useState<string>('survival');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string; isAdmin: boolean } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  const [nodesConfig, setNodesConfig] = useState<ServerNodeConfig[]>([
    { id: 'velocity', name: 'Velocity Proxy', type: 'proxy', description: 'Edge Proxy', port: 25577 },
    { id: 'auth', name: 'Auth Gateway', type: 'backend', description: 'Player Authentication', port: 25565 },
    { id: 'survival', name: 'Survival SMP', type: 'backend', description: 'Main World', port: 25565 },
    { id: 'pvp', name: 'PvP Arena', type: 'backend', description: 'Custom PvP', port: 25565 },
  ]);

  const [telemetry, setTelemetry] = useState<Record<string, ServerTelemetry>>({});

  // 1. Load Token on Mount
  useEffect(() => {
    const savedToken = localStorage.getItem('mc_token');
    const savedUser = localStorage.getItem('mc_user');
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // 2. Fetch Server Config (Dynamic Name & Nodes)
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.serverName) setServerName(data.serverName);
          if (data.superadmins) setSuperadmins(data.superadmins);
          if (data.servers && Array.isArray(data.servers)) {
            setNodesConfig(data.servers);
          }
        }
      } catch (err) {
        console.warn('Failed to load server config:', err);
      }
    }
    fetchConfig();
  }, []);

  // 3. Connect Telemetry WebSocket / Polling Fallback
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/telemetry`;
    let ws: WebSocket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setNetworkStatus('connected');
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'telemetry' && Array.isArray(payload.servers)) {
            const mapped: Record<string, ServerTelemetry> = {};
            payload.servers.forEach((s: ServerTelemetry) => {
              mapped[s.id] = s;
            });
            setTelemetry(mapped);
          }
        } catch (err) {
          // parse error
        }
      };
      ws.onclose = () => setNetworkStatus('disconnected');
      ws.onerror = () => setNetworkStatus('disconnected');
    } catch {
      setNetworkStatus('disconnected');
    }

    // Polling fallback every 4s
    const fetchServers = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/servers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.servers && Array.isArray(data.servers)) {
            const mapped: Record<string, ServerTelemetry> = {};
            data.servers.forEach((s: ServerTelemetry) => {
              mapped[s.id] = s;
            });
            setTelemetry(mapped);
            setNetworkStatus('connected');
          }
        }
      } catch {
        // silent
      }
    };

    pollInterval = setInterval(fetchServers, 4000);
    fetchServers();

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [token]);

  // Auth Handlers
  const handleLoginSuccess = (newToken: string, newUser: { username: string; isAdmin: boolean }) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('mc_token', newToken);
    localStorage.setItem('mc_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_user');
  };

  // Node Power Action
  const handlePowerAction = async (nodeId: string, action: 'start' | 'stop' | 'restart') => {
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/servers/${nodeId}/power`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch power action');
  };

  // Command Execution
  const handleExecuteCommand = async (nodeId: string, command: string): Promise<string> => {
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/servers/${nodeId}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to execute command');
    return data.response || 'Command executed successfully.';
  };

  // Player Moderation Action
  const handlePlayerAction = async (
    nodeId: string,
    player: string,
    action: 'kick' | 'ban' | 'op' | 'deop',
    reason?: string
  ): Promise<string> => {
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/servers/${nodeId}/players/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ player, action, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to execute player action');
    return data.response || `Successfully executed ${action} on ${player}`;
  };

  // Update Dynamic Server Name
  const handleUpdateServerName = async (newName: string) => {
    if (!token) throw new Error('Authentication required');
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ serverName: newName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update server name');
    setServerName(data.serverName);
  };

  // Active node data
  const activeNodeData: ServerTelemetry = telemetry[activeNode] || {
    id: activeNode,
    name: nodesConfig.find((n) => n.id === activeNode)?.name || activeNode.toUpperCase(),
    type: nodesConfig.find((n) => n.id === activeNode)?.type || 'backend',
    state: 'unknown',
    cpuPercent: 0,
    memoryUsedMb: 0,
    memoryLimitMb: 1024,
    memoryPercent: 0,
    uptimeSeconds: 0,
    players: { online: 0, max: 100, list: [] },
  };

  const allNodesList: ServerTelemetry[] = nodesConfig.map((cfg) => {
    return (
      telemetry[cfg.id] || {
        id: cfg.id,
        name: cfg.name,
        type: cfg.type,
        state: 'unknown',
        cpuPercent: 0,
        memoryUsedMb: 0,
        memoryLimitMb: 1024,
        memoryPercent: 0,
        uptimeSeconds: 0,
        players: { online: 0, max: 100, list: [] },
      }
    );
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeNode={activeNode}
        onSelectNode={setActiveNode}
        nodes={nodesConfig}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          serverName={serverName}
          activeNode={activeNode}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          networkStatus={networkStatus}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            {currentTab === 'overview' && (
              <OverviewTab
                activeNodeId={activeNode}
                nodeData={activeNodeData}
                allNodes={allNodesList}
                onSelectNode={setActiveNode}
                onPowerAction={handlePowerAction}
                onExecuteCommand={handleExecuteCommand}
                isAdmin={!!user?.isAdmin}
              />
            )}

            {currentTab === 'console' && (
              <ConsoleTab
                activeNode={activeNode}
                token={token}
                onExecuteCommand={handleExecuteCommand}
              />
            )}

            {currentTab === 'players' && (
              <PlayersTab
                activeNode={activeNode}
                onlinePlayers={activeNodeData.players?.list || []}
                maxPlayers={activeNodeData.players?.max || 100}
                onRefresh={() => {}}
                onPlayerAction={handlePlayerAction}
                isAdmin={!!user?.isAdmin}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsTab
                serverName={serverName}
                onUpdateServerName={handleUpdateServerName}
                superadmins={superadmins}
                isAdmin={!!user?.isAdmin}
              />
            )}
          </div>
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

