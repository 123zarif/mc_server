'use client';

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Server,
  Shield,
  Network,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SettingsTabProps {
  serverName: string;
  onUpdateServerName: (newName: string) => Promise<void>;
  superadmins: string[];
  isAdmin: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  serverName,
  onUpdateServerName,
  superadmins,
  isAdmin,
}) => {
  const [nameInput, setNameInput] = useState(serverName);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setStatusMsg({ type: 'error', text: 'Admin authentication required to save settings.' });
      return;
    }
    if (!nameInput.trim()) return;

    try {
      setLoading(true);
      await onUpdateServerName(nameInput.trim());
      setStatusMsg({ type: 'success', text: 'Server branding name updated successfully!' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update server name' });
    } finally {
      setLoading(false);
    }
  };

  const networkPorts = [
    { service: 'Minecraft Java Edition', port: '25565', proto: 'TCP', desc: 'Velocity edge proxy entrypoint' },
    { service: 'Minecraft Bedrock (Geyser)', port: '19132', proto: 'UDP', desc: 'Bedrock cross-play connection' },
    { service: 'Simple Voice Chat', port: '24454', proto: 'UDP', desc: 'Proximity in-game voice chat' },
    { service: 'HTTPS Reverse Proxy', port: '443', proto: 'TCP / UDP', desc: 'Caddy automatic TLS & HTTP/3' },
    { service: 'HTTP Redirect', port: '80', proto: 'TCP', desc: 'Automatic HTTPS redirect' },
    { service: 'Web Management Dashboard', port: '3001', proto: 'TCP', desc: 'Next.js App & WebSocket control' },
  ];

  return (
    <div className="space-y-6">
      {/* Branding Configuration */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Server Identity & Branding</h2>
            <p className="text-xs text-text-dim">
              Configure the dynamic server network name displayed across the dashboard and headers
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">
              Display Server Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Zarif's Minecraft Network"
                className="flex-1 rounded-xl border border-border bg-input px-4 py-2.5 text-xs text-white placeholder-text-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_12px_rgba(147,51,234,0.3)] transition-all"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium ${
                statusMsg.type === 'success'
                  ? 'bg-status-online/10 border-status-online/30 text-status-online'
                  : 'bg-status-error/10 border-status-error/30 text-status-error'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </form>
      </div>

      {/* Network Infrastructure Ports */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pill text-primary border border-border">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Network Port Allocations</h2>
            <p className="text-xs text-text-dim">
              Verified active port bindings in Docker network configuration
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-dim uppercase tracking-wider text-[11px]">
                <th className="pb-3 font-semibold">Service</th>
                <th className="pb-3 font-semibold">External Port</th>
                <th className="pb-3 font-semibold">Protocol</th>
                <th className="pb-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {networkPorts.map((item, idx) => (
                <tr key={idx} className="hover:bg-card-sub/40 transition-colors">
                  <td className="py-3 font-semibold text-white">{item.service}</td>
                  <td className="py-3 font-mono text-primary font-bold">{item.port}</td>
                  <td className="py-3 font-mono text-text-muted">{item.proto}</td>
                  <td className="py-3 text-text-dim">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Superadmins & Access */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pill text-primary border border-border">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Superadmin Accounts</h2>
            <p className="text-xs text-text-dim">
              Designated in-game AuthMe user accounts with root dashboard privileges
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {superadmins.map((admin) => (
            <div
              key={admin}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pill border border-border text-xs text-white font-medium"
            >
              <img
                src={`https://minotar.net/helm/${admin}/24.png`}
                alt={admin}
                className="h-5 w-5 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://minotar.net/helm/Steve/24.png';
                }}
              />
              <span>{admin}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

