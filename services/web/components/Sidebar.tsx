'use client';

import React from 'react';
import {
  LayoutDashboard,
  Wifi,
  Terminal,
  Users,
  Settings,
  Server,
  Layers,
  Activity,
  Compass,
} from 'lucide-react';

export type TabType = 'overview' | 'connection' | 'console' | 'players' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeNode: string;
  onSelectNode: (nodeId: string) => void;
  nodes: { id: string; name: string; type: string; port: number }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeNode,
  onSelectNode,
  nodes,
}) => {
  const navItems = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'connection' as TabType, label: 'Connection & IP', icon: Wifi },
    { id: 'console' as TabType, label: 'Live Console', icon: Terminal },
    { id: 'players' as TabType, label: 'Players', icon: Users },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-border bg-[#0f0a1c] p-4 select-none">
      {/* Navigation Links */}
      <div className="space-y-6">
        <div>
          <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-text-dim uppercase">
            Navigation
          </div>
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
        </div>

        {/* Server Nodes Switcher */}
        <div>
          <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-bold tracking-wider text-text-dim uppercase">
            <span>Cluster Nodes</span>
            <Layers className="h-3.5 w-3.5 text-text-dim" />
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
                      ? 'bg-[#150f24] border border-primary/50 text-white font-bold shadow-[inset_0_0_8px_rgba(147,51,234,0.2)]'
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
                  <span className="text-[10px] text-text-dim uppercase font-mono tracking-wider">
                    {node.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="rounded-xl border border-border bg-[#150f24] p-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Activity className="h-4 w-4 text-status-online" />
          <span>VoxelDash Engine</span>
        </div>
        <p className="mt-1 text-[11px] text-text-dim">
          Paper / Purpur 1.21.4 with Velocity & Geyser
        </p>
      </div>
    </aside>
  );
};
