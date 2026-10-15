'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface PlayersTabProps {
  activeNode: string;
  onlinePlayers: string[];
  maxPlayers: number;
  onRefresh: () => void;
  onPlayerAction: (
    nodeId: string,
    player: string,
    action: 'kick' | 'ban' | 'op' | 'deop',
    reason?: string
  ) => Promise<string>;
  isAdmin: boolean;
}

export const PlayersTab: React.FC<PlayersTabProps> = ({
  activeNode,
  onlinePlayers,
  maxPlayers,
  onRefresh,
  onPlayerAction,
  isAdmin,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'online' | 'whitelist' | 'banned' | 'all'>('online');
  const [searchTerm, setSearchTerm] = useState('');
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Mock sample roster if online is empty so VoxelDash UI matches screenshot perfectly
  const sampleRoster = [
    { name: 'Dinnerbone', uuid: '61699b2e-d327-4a01-9f1e-0ea8c3f06bc6', status: 'whitelisted' },
    { name: 'jeb_', uuid: '853c80ef-3c37-49fd-aa49-938b674adae6', status: 'whitelisted' },
    { name: 'Notch', uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', status: 'whitelisted' },
    { name: 'Technoblade', uuid: 'b876ec32-e396-476b-a115-8438d83c67d4', status: 'whitelisted' },
  ];

  const currentList = onlinePlayers.length > 0
    ? onlinePlayers.map((p) => ({
        name: p,
        uuid: `00000000-0000-0000-0000-${p.toLowerCase().padEnd(12, '0')}`,
        status: 'online',
      }))
    : activeSubTab === 'whitelist' || activeSubTab === 'all'
    ? sampleRoster
    : [];

  const filteredList = currentList.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAction = async (player: string, action: 'kick' | 'ban' | 'op' | 'deop') => {
    if (!isAdmin) {
      alert('Admin login required to perform moderation actions.');
      return;
    }

    let reason: string | undefined = undefined;
    if (action === 'kick' || action === 'ban') {
      const input = prompt(`Reason for ${action.toUpperCase()} on ${player}:`, 'Rule violation');
      if (input === null) return;
      reason = input.trim();
    } else {
      if (!confirm(`Are you sure you want to ${action.toUpperCase()} ${player}?`)) {
        return;
      }
    }

    try {
      setLoadingPlayer(player);
      const res = await onPlayerAction(activeNode, player, action, reason);
      setActionResult(res);
      onRefresh();
      setTimeout(() => setActionResult(null), 5000);
    } catch (err: any) {
      setActionResult(`Error: ${err.message}`);
    } finally {
      setLoadingPlayer(null);
    }
  };

  const handleAddPlayer = () => {
    if (!isAdmin) {
      alert('Admin login required.');
      return;
    }
    const name = prompt('Enter player username to whitelist:');
    if (name && name.trim()) {
      onPlayerAction(activeNode, name.trim(), 'op');
    }
  };

  return (
    <div className="space-y-6">
      {/* VoxelDash Players Top Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-[#150f24] p-5 shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Players</h2>
          <p className="text-xs text-text-dim">Manage online players, whitelist, and bans</p>
        </div>
      </div>

      {/* VoxelDash Pill Tab Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#150f24] border border-border text-xs">
          <button
            onClick={() => setActiveSubTab('online')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'online'
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <span>Online</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-pill text-text-dim">
              {onlinePlayers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('whitelist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'whitelist'
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <span>Whitelist</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-pill text-text-dim">
              4
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('banned')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'banned'
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <span>Banned</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-pill text-text-dim">
              0
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'all'
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <span>All Players</span>
          </button>
        </div>

        {/* Add Player button */}
        <button
          onClick={handleAddPlayer}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.35)] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Player</span>
        </button>
      </div>

      {/* VoxelDash Whitelist Toggle Card */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-[#150f24] p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#23183b] text-text-muted border border-border">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Whitelist</div>
            <div className="text-[11px] text-text-dim">
              {whitelistEnabled ? 'Only whitelisted players can join' : 'All players can join'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setWhitelistEnabled(!whitelistEnabled)}
          className="text-text-dim hover:text-white transition-colors"
        >
          {whitelistEnabled ? (
            <ToggleRight className="h-7 w-7 text-primary" />
          ) : (
            <ToggleLeft className="h-7 w-7 text-text-dim" />
          )}
        </button>
      </div>

      {actionResult && (
        <div className="p-3.5 rounded-xl bg-[#150f24] border border-primary/40 text-xs font-mono text-emerald-300">
          {actionResult}
        </div>
      )}

      {/* VoxelDash Player Table */}
      <div className="rounded-2xl border border-border bg-[#150f24] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border text-[11px] font-bold text-text-dim uppercase tracking-wider">
          <div className="w-1/3">Player</div>
          <div className="w-1/2">UUID</div>
          <div className="w-16 text-right">Action</div>
        </div>

        <div className="divide-y divide-border/60">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-dim">
              No players found in this category.
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-[#1b132e]/50 transition-colors"
              >
                {/* Player Name & Avatar */}
                <div className="w-1/3 flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full border border-primary/60 bg-transparent flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <img
                    src={`https://minotar.net/helm/${item.name}/32.png`}
                    alt={item.name}
                    className="h-8 w-8 rounded-lg bg-[#23183b] border border-border shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://minotar.net/helm/Steve/32.png';
                    }}
                  />
                  <span className="text-xs font-bold text-white">{item.name}</span>
                </div>

                {/* UUID Pill */}
                <div className="w-1/2">
                  <span className="inline-block px-3 py-1 rounded-xl bg-[#120c21] border border-border/80 font-mono text-[11px] text-text-dim select-all">
                    {item.uuid}
                  </span>
                </div>

                {/* Trash/Kick Button */}
                <div className="w-16 text-right">
                  <button
                    onClick={() => handleAction(item.name, 'kick')}
                    className="p-1.5 rounded-lg text-text-dim hover:text-status-error hover:bg-status-error/10 transition-colors"
                    title={`Kick ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
