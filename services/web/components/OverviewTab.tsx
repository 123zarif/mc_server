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
}) => {
  const [quickCmd, setQuickCmd] = useState('');
  const [cmdFeedback, setCmdFeedback] = useState<string | null>(null);
  const [powerLoading, setPowerLoading] = useState<string | null>(null);
  const [copiedJava, setCopiedJava] = useState(false);
  const [copiedBedrock, setCopiedBedrock] = useState(false);

  // History state for SVG sparkline area charts
  const [cpuHistory, setCpuHistory] = useState<number[]>([15, 22, 18, 30, 25, 35, 20, 28, nodeData?.cpuPercent || 15]);
  const [memHistory, setMemHistory] = useState<number[]>([35, 40, 42, 38, 45, 50, 48, 52, nodeData?.memoryPercent || 40]);

  useEffect(() => {
    if (nodeData) {
      setCpuHistory((prev) => [...prev.slice(-15), Math.max(5, nodeData.cpuPercent)]);
      setMemHistory((prev) => [...prev.slice(-15), Math.max(10, nodeData.memoryPercent)]);
    }
  }, [nodeData?.cpuPercent, nodeData?.memoryPercent]);

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

  // Helper to render SVG Area Chart path
  const renderAreaPath = (points: number[], height: number = 80, width: number = 300) => {
    if (points.length < 2) return { path: '', area: '' };
    const step = width / (points.length - 1);
    const maxVal = 100;
    const coords = points.map((p, i) => ({
      x: i * step,
      y: height - (Math.min(100, p) / maxVal) * (height - 10),
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

  const cpuPaths = renderAreaPath(cpuHistory, 80, 300);
  const memPaths = renderAreaPath(memHistory, 80, 300);

  return (
    <div className="space-y-6">
      {/* 1. VoxelDash Hero Server Status Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[#150f24] p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-all ${
                isOnline
                  ? 'bg-status-online/10 border-status-online/40 text-status-online shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                  : 'bg-status-error/10 border-status-error/40 text-status-error'
              }`}
            >
              <Server className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {nodeData?.name || activeNodeId.toUpperCase()}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isOnline
                      ? 'bg-status-online/15 text-status-online border border-status-online/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-status-error/15 text-status-error border border-status-error/30'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-status-online shadow-[0_0_8px_#10b981]' : 'bg-status-error'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-text-muted">
                <span>Node: <strong className="text-white font-mono uppercase">{activeNodeId}</strong></span>
                <span>•</span>
                <span>Type: <strong className="text-white capitalize">{nodeData?.type || 'Backend'}</strong></span>
                <span>•</span>
                <span>Uptime: <strong className="text-white">{nodeData?.uptimeSeconds ? formatUptime(nodeData.uptimeSeconds) : '0s'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Power Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handlePower('start')}
              disabled={isOnline || powerLoading !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-online hover:bg-emerald-600 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start</span>
            </button>
            <button
              onClick={() => handlePower('restart')}
              disabled={powerLoading !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#23183b] hover:bg-primary border border-border hover:border-primary text-white text-xs font-bold transition-all"
            >
              <RotateCw className={`h-3.5 w-3.5 ${powerLoading === 'restart' ? 'animate-spin' : ''}`} />
              <span>Restart</span>
            </button>
            <button
              onClick={() => handlePower('stop')}
              disabled={!isOnline || powerLoading !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-error/20 hover:bg-status-error border border-status-error/40 text-status-error hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Connect Banner (Java & Bedrock / Android) */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-[#170f29] via-[#1b1233] to-[#170f29] p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/40">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Server Connection Details
                <span className="text-[10px] px-2 py-0.5 rounded bg-pill text-emerald-400 font-mono font-bold">
                  Java + Bedrock + Android
                </span>
              </h3>
              <p className="text-xs text-text-dim">Use the addresses below to connect in Minecraft</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Java Address Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-input border border-border">
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-input border border-primary/40 shadow-[0_0_12px_rgba(147,51,234,0.15)]">
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

      {/* 3. VoxelDash Gradient Area Charts (CPU Load & Memory) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Chart */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#23183b] text-primary border border-border">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">CPU Usage</span>
                <div className="text-xl font-black text-white tracking-tight mt-0.5">
                  {nodeData ? `${nodeData.cpuPercent}%` : '0%'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-pill text-text-dim">
              Live Sparkline
            </span>
          </div>

          {/* SVG Glow Chart */}
          <div className="h-24 w-full relative">
            <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={cpuPaths.area} fill="url(#cpuGradient)" />
              <path
                d={cpuPaths.path}
                fill="none"
                stroke="#9333ea"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_8px_#9333ea]"
              />
            </svg>
          </div>
        </div>

        {/* Memory Chart */}
        <div className="rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#23183b] text-primary border border-border">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Memory Allocation</span>
                <div className="text-xl font-black text-white tracking-tight mt-0.5">
                  {nodeData ? `${nodeData.memoryUsedMb} MB` : '0 MB'}
                  <span className="text-xs font-normal text-text-dim ml-2">
                    ({nodeData?.memoryPercent || 0}%)
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-pill text-text-dim">
              Max: {nodeData ? `${nodeData.memoryLimitMb} MB` : '1024 MB'}
            </span>
          </div>

          {/* SVG Glow Chart */}
          <div className="h-24 w-full relative">
            <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={memPaths.area} fill="url(#memGradient)" />
              <path
                d={memPaths.path}
                fill="none"
                stroke="#a855f7"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_8px_#a855f7]"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Direct Console Dispatch Form */}
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

      {/* 5. Network Cluster Nodes Switcher Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-tight uppercase">Cluster Nodes</h3>
          <span className="text-xs text-text-dim font-mono">{allNodes.length} Nodes Active</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {allNodes.map((n) => {
            const selected = n.id === activeNodeId;
            const nodeOnline = n.state === 'running';
            return (
              <div
                key={n.id}
                onClick={() => onSelectNode(n.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                  selected
                    ? 'bg-[#1b132e] border-primary shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                    : 'bg-[#150f24] border-border hover:border-border-light hover:bg-[#1b132e]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        nodeOnline ? 'bg-status-online shadow-[0_0_8px_#10b981]' : 'bg-status-error'
                      }`}
                    />
                    <span className="font-bold text-xs text-white">{n.name}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-pill text-text-muted">
                    {n.id}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                  <span>RAM: <strong className="text-white">{n.memoryUsedMb} MB</strong></span>
                  <span>CPU: <strong className="text-white">{n.cpuPercent}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
