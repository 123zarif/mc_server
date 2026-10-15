'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCw,
  Square,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Users,
  Server,
  Terminal,
  Send,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Zap,
  Info,
  Globe,
  Gamepad2,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { formatUptime } from '../lib/utils';

interface NodeStatus {
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

interface OverviewTabProps {
  activeNodeId: string;
  nodeData?: NodeStatus;
  allNodes: NodeStatus[];
  onSelectNode: (id: string) => void;
  onPowerAction: (nodeId: string, action: 'start' | 'stop' | 'restart') => Promise<void>;
  onExecuteCommand: (nodeId: string, command: string) => Promise<string>;
  isAdmin: boolean;
  connectionInfo?: {
    java: { host: string; port: number; version: string };
    bedrock: { host: string; port: number; version: string };
  };
  systemInfo?: {
    javaVersion: string;
    operatingSystem: string;
    processors: number;
  };
  gameSettings?: {
    software: string;
    version: string;
    pvp: boolean;
    gamemode: string;
    spawnProtection: number;
    difficulty: string;
    worldCount: number;
    worldTime: string;
    hardcore: boolean;
  };
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  activeNodeId,
  nodeData,
  allNodes,
  onSelectNode,
  onPowerAction,
  onExecuteCommand,
  isAdmin,
  connectionInfo = {
    java: { host: 'zarifzuhayer.tech', port: 25565, version: '1.21.4' },
    bedrock: { host: 'zarifzuhayer.tech', port: 19132, version: 'Latest' },
  },
  systemInfo = {
    javaVersion: '21.0.6 (OpenJDK)',
    operatingSystem: 'Linux (Oracle Cloud)',
    processors: 4,
  },
  gameSettings = {
    software: 'Purpur / Paper',
    version: '1.21.4',
    pvp: true,
    gamemode: 'survival',
    spawnProtection: 16,
    difficulty: 'HARD',
    worldCount: 3,
    worldTime: '07:11',
    hardcore: false,
  },
}) => {
  const [quickCmd, setQuickCmd] = useState('');
  const [cmdFeedback, setCmdFeedback] = useState<string | null>(null);
  const [powerLoading, setPowerLoading] = useState<string | null>(null);
  const [copiedJava, setCopiedJava] = useState(false);
  const [copiedBedrock, setCopiedBedrock] = useState(false);

  // Safe numerical metrics with fallbacks
  const cpuPercent = typeof nodeData?.cpuPercent === 'number' ? nodeData.cpuPercent : 0;
  const memoryUsedMb = typeof nodeData?.memoryUsedMb === 'number' ? nodeData.memoryUsedMb : 0;
  const memoryLimitMb = typeof nodeData?.memoryLimitMb === 'number' && nodeData.memoryLimitMb > 0 ? nodeData.memoryLimitMb : 3072;
  const memoryPercent = typeof nodeData?.memoryPercent === 'number' ? nodeData.memoryPercent : Math.round((memoryUsedMb / memoryLimitMb) * 100);
  const uptimeSeconds = typeof nodeData?.uptimeSeconds === 'number' ? nodeData.uptimeSeconds : 0;
  const playersOnline = nodeData?.players?.online ?? 0;
  const playersMax = nodeData?.players?.max && nodeData.players.max > 0 ? nodeData.players.max : 20;

  // History state for SVG area charts
  const [cpuHistory, setCpuHistory] = useState<number[]>([15, 25, 20, 38, 32, 45, 28, 35, Math.max(5, cpuPercent)]);
  const [memHistory, setMemHistory] = useState<number[]>([18, 22, 28, 35, 34, 40, 38, 42, Math.max(12, memoryUsedMb / 50 || 18)]);
  const [playerHistory, setPlayerHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, playersOnline]);

  useEffect(() => {
    setCpuHistory((prev) => [...prev.slice(-12), Math.max(5, cpuPercent)]);
    setMemHistory((prev) => [...prev.slice(-12), Math.max(10, Math.min(60, memoryUsedMb / 40 || 18))]);
    setPlayerHistory((prev) => [...prev.slice(-12), playersOnline]);
  }, [cpuPercent, memoryUsedMb, playersOnline]);

  const handlePower = async (action: 'start' | 'stop' | 'restart') => {
    if (!isAdmin) {
      alert('Admin login required for power actions.');
      return;
    }
    if (action === 'stop' && !confirm(`Are you sure you want to STOP node ${activeNodeId}?`)) {
      return;
    }
    try {
      setPowerLoading(action);
      await onPowerAction(activeNodeId, action);
    } finally {
      setPowerLoading(null);
    }
  };

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCmd.trim()) return;
    if (!isAdmin) {
      alert('Admin login required to execute commands.');
      return;
    }
    try {
      const res = await onExecuteCommand(activeNodeId, quickCmd.trim());
      setCmdFeedback(res);
      setQuickCmd('');
      setTimeout(() => setCmdFeedback(null), 5000);
    } catch (err: any) {
      setCmdFeedback(`Error: ${err.message}`);
    }
  };

  const isOnline = nodeData?.state === 'running';

  // SVG Area Chart generator
  const renderAreaPath = (points: number[], height: number = 80, width: number = 280, maxVal: number = 50) => {
    if (points.length < 2) return { path: '', area: '' };
    const step = width / (points.length - 1);
    const coords = points.map((p, i) => ({
      x: i * step,
      y: height - (Math.min(maxVal, p) / maxVal) * (height - 12),
    }));

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
    return { path: pathD, area: areaD };
  };

  const memPaths = renderAreaPath(memHistory, 80, 280, 60);
  const cpuPaths = renderAreaPath(cpuHistory, 80, 280, 60);
  const playerPaths = renderAreaPath(playerHistory, 80, 280, 10);

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Node Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2 text-xs text-text-dim">
          <div className="flex h-5 w-5 items-center justify-center rounded border border-border bg-[#150f24]">
            <Server className="h-3 w-3 text-primary" />
          </div>
          <span>Home</span>
          <span>&gt;</span>
          <span className="text-white font-medium">Overview</span>
        </div>

        {/* Node Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#150f24] border border-border overflow-x-auto">
          {allNodes.map((n) => {
            const isSelected = n.id === activeNodeId;
            const nodeRunning = n.state === 'running';
            return (
              <button
                key={n.id}
                onClick={() => onSelectNode(n.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                    : 'text-text-muted hover:text-white hover:bg-[#1b132e]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    nodeRunning ? 'bg-status-online shadow-[0_0_6px_#10b981]' : 'bg-status-error'
                  }`}
                />
                <span className="capitalize">{n.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VoxelDash Exact 10-Card Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Memory Usage Area Chart */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
              <HardDrive className="h-4 w-4 text-primary" />
              <span>Memory Usage</span>
            </div>
            <MoreVertical className="h-3.5 w-3.5 text-text-dim" />
          </div>

          <div className="h-32 w-full mt-3 relative flex items-end">
            <div className="flex flex-col justify-between text-[10px] text-text-dim font-mono pr-2 h-full py-1">
              <span>36</span>
              <span>18</span>
              <span>0</span>
            </div>
            <div className="flex-1 h-full relative">
              <svg viewBox="0 0 280 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="voxelMemGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333ea" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={memPaths.area} fill="url(#voxelMemGradient)" />
                <path
                  d={memPaths.path}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_10px_#9333ea]"
                />
              </svg>
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-text-dim font-mono pt-1">
            <span>03:08</span>
            <span>03:10</span>
            <span>03:12</span>
            <span>03:15</span>
          </div>
        </div>

        {/* Card 2: SERVER INFO */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
            <Info className="h-4 w-4 text-primary" />
            <span className="uppercase text-[11px] text-primary font-bold">Server Info</span>
          </div>

          <div className="space-y-3 mt-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-text-dim" /> Software
              </span>
              <span className="font-semibold text-primary">{gameSettings.software}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted flex items-center gap-2">
                <TagIcon className="h-3.5 w-3.5 text-text-dim" /> Version
              </span>
              <span className="font-semibold text-primary">{gameSettings.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-text-dim" /> Java Port
              </span>
              <span className="font-mono font-bold text-white">{connectionInfo.java.port}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted flex items-center gap-2">
                <Smartphone className="h-3.5 w-3.5 text-primary" /> Bedrock Port
              </span>
              <span className="font-mono font-bold text-primary">{connectionInfo.bedrock.port}</span>
            </div>
          </div>
        </div>

        {/* Card 3: ONLINE PLAYERS */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
            <Users className="h-4 w-4 text-[#ec4899]" />
            <span className="uppercase text-[11px] text-text-muted font-bold">Online Players</span>
          </div>

          <div className="my-auto py-4">
            <div className="text-5xl font-black text-white tracking-tight">
              <span className="text-primary">{playersOnline}</span>
              <span className="text-2xl font-bold text-text-dim ml-2">/ {playersMax}</span>
            </div>
            <div className="mt-2 text-xs text-text-dim">
              {playersOnline === 0 ? 'No players currently on this node' : `${playersOnline} active session(s)`}
            </div>
          </div>
        </div>

        {/* Card 4: MEMORY PROGRESS CARD */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
            <HardDrive className="h-4 w-4 text-text-dim" />
            <span className="uppercase text-[11px] text-text-muted font-bold">Memory</span>
          </div>

          <div className="my-auto py-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-white tracking-tight">
                {memoryUsedMb} <span className="text-sm font-semibold text-text-dim">/ {memoryLimitMb} MB</span>
              </div>
              <span className="text-sm font-bold text-primary">{memoryPercent}%</span>
            </div>

            <div className="mt-3 w-full bg-[#1b132e] rounded-full h-2 overflow-hidden border border-border">
              <div
                className="bg-primary h-full transition-all duration-500 shadow-[0_0_10px_#9333ea]"
                style={{ width: `${Math.min(100, Math.max(3, memoryPercent))}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-text-dim">
              Allocated: <strong className="text-text-muted">{memoryLimitMb} MB</strong>
            </div>
          </div>
        </div>

        {/* Card 5: Player History Chart */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
              <Users className="h-4 w-4 text-primary" />
              <span>Player History</span>
            </div>
            <MoreVertical className="h-3.5 w-3.5 text-text-dim" />
          </div>

          <div className="h-28 w-full mt-3 relative flex items-end">
            <div className="flex flex-col justify-between text-[10px] text-text-dim font-mono pr-2 h-full py-1">
              <span>4</span>
              <span>2</span>
              <span>0</span>
            </div>
            <div className="flex-1 h-full relative">
              <svg viewBox="0 0 280 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <path
                  d={playerPaths.path}
                  fill="none"
                  stroke="#9333ea"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_8px_#9333ea]"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 6: CPU Usage Line Chart */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
              <Cpu className="h-4 w-4 text-status-online" />
              <span>CPU Usage</span>
            </div>
            <MoreVertical className="h-3.5 w-3.5 text-text-dim" />
          </div>

          <div className="h-28 w-full mt-3 relative flex items-end">
            <div className="flex flex-col justify-between text-[10px] text-text-dim font-mono pr-2 h-full py-1">
              <span>40</span>
              <span>20</span>
              <span>0</span>
            </div>
            <div className="flex-1 h-full relative">
              <svg viewBox="0 0 280 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <path
                  d={cpuPaths.path}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_10px_#10b981]"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 7: UPTIME */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
            <Clock className="h-4 w-4 text-[#38bdf8]" />
            <span className="uppercase text-[11px] text-text-muted font-bold">Uptime</span>
          </div>

          <div className="my-auto py-4">
            <div className="text-4xl font-black text-[#38bdf8] tracking-tight">
              {uptimeSeconds > 0 ? formatUptime(uptimeSeconds) : '0h 0m'}
            </div>
            <div className="mt-2 text-xs text-text-dim">
              Node State: <strong className={isOnline ? 'text-status-online' : 'text-status-error'}>
                {isOnline ? 'RUNNING' : 'STOPPED'}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 8: WORLD INFO */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
            <Globe className="h-4 w-4 text-status-online" />
            <span className="uppercase text-[11px] text-text-muted font-bold">World Info</span>
          </div>

          <div className="space-y-2.5 mt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Count</span>
              <span className="font-bold text-white">{gameSettings.worldCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">World Time</span>
              <span className="font-bold text-status-online">{gameSettings.worldTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Difficulty</span>
              <span className="font-bold text-status-online">{gameSettings.difficulty}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Hardcore</span>
              <span className="flex items-center gap-1 font-bold text-status-error">
                <XCircle className="h-3.5 w-3.5" /> No
              </span>
            </div>
          </div>
        </div>

        {/* Card 9: SYSTEM INFO */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
            <Server className="h-4 w-4 text-text-dim" />
            <span className="uppercase text-[11px] text-text-muted font-bold">System Info</span>
          </div>

          <div className="space-y-2.5 mt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Java Version</span>
              <span className="font-bold text-white">{systemInfo.javaVersion}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Operating System</span>
              <span className="font-bold text-white">{systemInfo.operatingSystem}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Processors</span>
              <span className="font-bold text-white">{systemInfo.processors} Cores</span>
            </div>
          </div>
        </div>

        {/* Card 10: GAME SETTINGS */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <span className="uppercase text-[11px] text-text-muted font-bold">Game Settings</span>
          </div>

          <div className="space-y-2.5 mt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">PvP</span>
              <span className="flex items-center gap-1 font-bold text-status-online">
                <CheckCircle2 className="h-3.5 w-3.5" /> Yes
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Gamemode</span>
              <span className="font-bold text-primary capitalize">{gameSettings.gamemode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Spawn Protection</span>
              <span className="font-bold text-white">{gameSettings.spawnProtection}</span>
            </div>
          </div>
        </div>

        {/* Node Power Controls Card */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl flex flex-col justify-between md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Node Power Controls ({activeNodeId})
              </span>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isOnline ? 'bg-status-online/20 text-status-online' : 'bg-status-error/20 text-status-error'}`}>
              {isOnline ? 'Online' : 'Stopped'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <button
              onClick={() => handlePower('start')}
              disabled={isOnline || powerLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-status-online hover:bg-emerald-600 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start Node</span>
            </button>
            <button
              onClick={() => handlePower('restart')}
              disabled={powerLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#23183b] hover:bg-primary border border-border hover:border-primary text-white text-xs font-bold transition-all"
            >
              <RotateCw className={`h-3.5 w-3.5 ${powerLoading === 'restart' ? 'animate-spin' : ''}`} />
              <span>Restart Node</span>
            </button>
            <button
              onClick={() => handlePower('stop')}
              disabled={!isOnline || powerLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-status-error/20 hover:bg-status-error border border-status-error/40 text-status-error hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop Node</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Connect & IP Copy Banner */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-[#170f29] via-[#1b1233] to-[#170f29] p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/40">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Quick Server Connection
                <span className="text-[10px] px-2 py-0.5 rounded bg-pill text-emerald-400 font-mono font-bold">
                  Java + Bedrock + Android
                </span>
              </h3>
              <p className="text-xs text-text-dim">One-click copy the addresses to join in Minecraft</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Java Address Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#120c21] border border-border">
              <Monitor className="h-4 w-4 text-text-dim" />
              <div className="text-left">
                <span className="block text-[9px] uppercase font-bold text-text-dim">Java Edition</span>
                <span className="font-mono text-xs font-bold text-white">{connectionInfo.java.host}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(connectionInfo.java.host);
                  setCopiedJava(true);
                  setTimeout(() => setCopiedJava(false), 2000);
                }}
                className="ml-2 p-1 rounded hover:bg-pill text-text-muted hover:text-white transition-colors"
                title="Copy Java Address"
              >
                {copiedJava ? <Check className="h-3.5 w-3.5 text-status-online" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Bedrock & Android Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#120c21] border border-primary/40 shadow-[0_0_12px_rgba(147,51,234,0.15)]">
              <Smartphone className="h-4 w-4 text-primary" />
              <div className="text-left">
                <span className="block text-[9px] uppercase font-bold text-primary">Bedrock & Android</span>
                <span className="font-mono text-xs font-bold text-white">
                  {connectionInfo.bedrock.host}:{connectionInfo.bedrock.port}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${connectionInfo.bedrock.host}`);
                  setCopiedBedrock(true);
                  setTimeout(() => setCopiedBedrock(false), 2000);
                }}
                className="ml-2 p-1 rounded hover:bg-pill text-text-muted hover:text-white transition-colors"
                title="Copy Bedrock Address"
              >
                {copiedBedrock ? <Check className="h-3.5 w-3.5 text-status-online" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Console Dispatch Form */}
      <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Direct Console Dispatch</span>
          </div>
          <span className="text-[11px] text-text-dim font-mono">Target: {nodeData?.name || activeNodeId}</span>
        </div>
        <form onSubmit={handleRunCommand} className="flex gap-2">
          <input
            type="text"
            value={quickCmd}
            onChange={(e) => setQuickCmd(e.target.value)}
            placeholder="e.g. tps, say Welcome to the server!, whitelist list"
            className="flex-1 rounded-xl border border-border bg-[#120c21] px-4 py-2.5 text-xs text-white placeholder-text-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono transition-colors"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.35)] transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Execute</span>
          </button>
        </form>
        {cmdFeedback && (
          <div className="mt-3 p-3 rounded-lg bg-[#1b132e] border border-border text-xs font-mono text-emerald-400 whitespace-pre-wrap">
            {cmdFeedback}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper icon
function TagIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}
