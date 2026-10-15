'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  UserX,
  ShieldAlert,
  ShieldCheck,
  ShieldMinus,
  RefreshCw,
  ExternalLink,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingPlayer, setLoadingPlayer] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const filteredPlayers = onlinePlayers.filter((p) =>
    p.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAction = async (player: string, action: 'kick' | 'ban' | 'op' | 'deop') => {
    if (!isAdmin) {
      alert('Admin login required to perform player moderation actions.');
      return;
    }

    let reason: string | undefined = undefined;
    if (action === 'kick' || action === 'ban') {
      const input = prompt(`Enter reason for ${action.toUpperCase()} on ${player}:`, 'Violating rules');
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

  return (
    <div className="space-y-6">
      {/* Top Bar: Search, Stats & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Player Management</h2>
            <p className="text-xs text-text-dim">
              Node: <strong className="text-white uppercase">{activeNode}</strong> ({onlinePlayers.length} / {maxPlayers} Online)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-dim" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search player username..."
              className="w-56 rounded-xl border border-border bg-input pl-9 pr-3 py-2 text-xs text-white placeholder-text-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pill hover:bg-card border border-border text-xs font-semibold text-text-muted hover:text-white transition-colors"
            title="Refresh player list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionResult && (
        <div className="p-3.5 rounded-xl bg-card border border-primary/40 text-xs font-mono text-emerald-300">
          {actionResult}
        </div>
      )}

      {/* Players List Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pill text-text-dim">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-white">No Players Currently Online</h3>
          <p className="mt-1 text-xs text-text-dim max-w-sm mx-auto">
            {searchTerm
              ? `No online players matched the search filter "${searchTerm}".`
              : `There are currently no active player connections on the ${activeNode} node.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => {
            const isLoading = loadingPlayer === player;
            return (
              <div
                key={player}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-border-light transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://minotar.net/helm/${player}/48.png`}
                    alt={player}
                    className="h-10 w-10 rounded-lg bg-pill border border-border shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://minotar.net/helm/Steve/48.png';
                    }}
                  />
                  <div>
                    <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                      <span>{player}</span>
                      <span className="h-2 w-2 rounded-full bg-status-online" />
                    </div>
                    <div className="text-[11px] text-text-dim">Online Session</div>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAction(player, 'op')}
                    disabled={isLoading}
                    title="Grant Operator (OP)"
                    className="p-2 rounded-lg bg-pill hover:bg-primary/20 text-text-muted hover:text-primary border border-border text-xs transition-colors"
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAction(player, 'kick')}
                    disabled={isLoading}
                    title="Kick Player"
                    className="p-2 rounded-lg bg-pill hover:bg-status-warn/20 text-text-muted hover:text-status-warn border border-border text-xs transition-colors"
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAction(player, 'ban')}
                    disabled={isLoading}
                    title="Ban Player"
                    className="p-2 rounded-lg bg-pill hover:bg-status-error/20 text-text-muted hover:text-status-error border border-border text-xs transition-colors"
                  >
                    <ShieldAlert className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

