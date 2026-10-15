'use client';

import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  Square,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Users,
  Shield,
  Server,
  Terminal,
  Send,
  CheckCircle2,
  AlertTriangle,
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
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  activeNodeId,
  nodeData,
  allNodes,
  onSelectNode,
  onPowerAction,
  onExecuteCommand,
  isAdmin,
}) => {
  const [quickCmd, setQuickCmd] = useState('');
  const [cmdFeedback, setCmdFeedback] = useState<string | null>(null);
  const [powerLoading, setPowerLoading] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Top Banner: Selected Node Status & Power Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
              isOnline
                ? 'bg-status-online/10 border-status-online/30 text-status-online shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-status-error/10 border-status-error/30 text-status-error'
            }`}
          >
            <Server className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {nodeData?.name || activeNodeId.toUpperCase()}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  isOnline
                    ? 'bg-status-online/15 text-status-online border border-status-online/30'
                    : 'bg-status-error/15 text-status-error border border-status-error/30'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-status-online' : 'bg-status-error'}`} />
                {nodeData?.state || 'Offline'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Target node for console telemetry and system management
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handlePower('start')}
            disabled={isOnline || powerLoading !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-online hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-md transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Start</span>
          </button>
          <button
            onClick={() => handlePower('restart')}
            disabled={powerLoading !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pill hover:bg-primary border border-border hover:border-primary/50 text-white text-xs font-semibold transition-all"
          >
            <RotateCw className={`h-3.5 w-3.5 ${powerLoading === 'restart' ? 'animate-spin' : ''}`} />
            <span>Restart</span>
          </button>
          <button
            onClick={() => handlePower('stop')}
            disabled={!isOnline || powerLoading !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-error/20 hover:bg-status-error border border-status-error/40 text-status-error hover:text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold transition-all"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">CPU Load</span>
            <div className="p-2 rounded-lg bg-pill text-primary border border-border">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {nodeData ? `${nodeData.cpuPercent}%` : '0%'}
            </div>
            <div className="mt-2 w-full bg-pill rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 shadow-[0_0_8px_#9333ea]"
                style={{ width: `${Math.min(100, nodeData?.cpuPercent || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">RAM Allocation</span>
            <div className="p-2 rounded-lg bg-pill text-primary border border-border">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {nodeData ? `${nodeData.memoryUsedMb} MB` : '0 MB'}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-text-dim">
              <span>{nodeData?.memoryPercent || 0}% used</span>
              <span>Limit: {nodeData ? `${nodeData.memoryLimitMb} MB` : '0 MB'}</span>
            </div>
            <div className="mt-1.5 w-full bg-pill rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 shadow-[0_0_8px_#9333ea]"
                style={{ width: `${Math.min(100, nodeData?.memoryPercent || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Players Online */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Online Players</span>
            <div className="p-2 rounded-lg bg-pill text-status-online border border-border">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {nodeData?.players ? `${nodeData.players.online} / ${nodeData.players.max}` : '0 / 100'}
            </div>
            <p className="mt-2 text-xs text-text-dim">Active players on this node</p>
          </div>
        </div>

        {/* Uptime */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Uptime</span>
            <div className="p-2 rounded-lg bg-pill text-primary border border-border">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {nodeData?.uptimeSeconds ? formatUptime(nodeData.uptimeSeconds) : 'Offline'}
            </div>
            <p className="mt-2 text-xs text-text-dim">Current session run time</p>
          </div>
        </div>
      </div>

      {/* Quick Console Command Bar */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-white">Direct Console Dispatch</span>
          </div>
          <span className="text-[11px] text-text-dim">Target: {nodeData?.name || activeNodeId}</span>
        </div>
        <form onSubmit={handleRunCommand} className="flex gap-2">
          <input
            type="text"
            value={quickCmd}
            onChange={(e) => setQuickCmd(e.target.value)}
            placeholder="e.g. tps, say Hello Players!, whitelist reload"
            className="flex-1 rounded-xl border border-border bg-input px-4 py-2.5 text-xs text-white placeholder-text-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors font-mono"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-[0_0_12px_rgba(147,51,234,0.3)]"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Execute</span>
          </button>
        </form>
        {cmdFeedback && (
          <div className="mt-3 p-3 rounded-lg bg-card-sub border border-border text-xs font-mono text-text-muted whitespace-pre-wrap">
            {cmdFeedback}
          </div>
        )}
      </div>

      {/* Network Nodes Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-tight">Cluster Nodes</h3>
          <span className="text-xs text-text-dim">{allNodes.length} nodes configured</span>
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
                    ? 'bg-card-sub border-primary shadow-[0_0_15px_rgba(147,51,234,0.25)]'
                    : 'bg-card border-border hover:border-border-light hover:bg-card-sub/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        nodeOnline ? 'bg-status-online shadow-[0_0_8px_#10b981]' : 'bg-status-error'
                      }`}
                    />
                    <span className="font-semibold text-xs text-white">{n.name}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-pill text-text-muted">
                    {n.id}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                  <span>RAM: {n.memoryUsedMb} MB</span>
                  <span>CPU: {n.cpuPercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

