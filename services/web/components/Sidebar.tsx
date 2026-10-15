'use client';

import React from 'react';
import {
  LayoutDashboard,
  Wifi,
  Terminal,
  Users,
  Settings,
  Globe,
  ChevronDown,
  Layers,
  Activity,
  Folder,
  MessageSquare,
  HardDrive,
  Calendar,
  Package,
} from 'lucide-react';

export type TabType = 'overview' | 'connection' | 'console' | 'players' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeNode: string;
  onSelectNode: (nodeId: string) => void;
  nodes: { id: string; name: string; type: string; port: number }[];
  serverName: string;
  user: { username: string; isAdmin: boolean } | null;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeNode,
  onSelectNode,
  nodes,
  serverName,
  user,
  onOpenAuth,
}) => {
  const navItems = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'connection' as TabType, label: 'Connection & IP', icon: Wifi },
    { id: 'players' as TabType, label: 'Players', icon: Users },
    { id: 'console' as TabType, label: 'Console', icon: Terminal },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-border bg-[#0f0a1c] p-4 select-none">
      <div className="space-y-6">
        {/* VoxelDash Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-[#c084fc] shadow-[0_0_15px_rgba(147,51,234,0.45)]">
            <svg
              className="h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-none">
              {serverName}
            </h1>
            <span className="text-[10px] font-mono text-text-dim">VoxelDash 1.2.0-beta.21</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(147,51,234,0.35)]'
                    : 'text-text-muted hover:bg-[#150f24] hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-text-muted'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Server Nodes Selector */}
        <div>
          <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-bold tracking-wider text-text-dim uppercase">
            <span>Cluster Nodes</span>
            <Layers className="h-3 w-3 text-text-dim" />
          </div>
          <div className="space-y-1">
            {nodes.map((node) => {
              const isSelected = activeNode === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(node.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-all ${
                    isSelected
                      ? 'bg-[#150f24] border border-primary/60 text-white font-bold shadow-[inset_0_0_8px_rgba(147,51,234,0.2)]'
                      : 'bg-[#150f24]/30 border border-transparent text-text-muted hover:bg-[#150f24] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isSelected ? 'bg-primary shadow-[0_0_6px_#9333ea]' : 'bg-status-online'
                      }`}
                    />
                    <span className="truncate">{node.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-dim uppercase">
                    {node.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Account Card matching screenshot */}
      <div
        onClick={onOpenAuth}
        className="flex items-center justify-between rounded-xl border border-border bg-[#150f24] p-3 cursor-pointer hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <img
            src={
              user
                ? `https://minotar.net/helm/${user.username}/32.png`
                : 'https://minotar.net/helm/Steve/32.png'
            }
            alt="avatar"
            className="h-8 w-8 rounded-lg bg-[#23183b] border border-border"
          />
          <div className="text-left">
            <div className="text-xs font-bold text-white leading-tight">
              {user ? user.username : 'admin'}
            </div>
            <div className="text-[10px] text-text-dim">
              {user ? (user.isAdmin ? 'Superadmin' : 'Logged in') : 'Manage account'}
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-text-dim" />
      </div>
    </aside>
  );
};
