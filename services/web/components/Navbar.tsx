'use client';

import React from 'react';
import { Server, Compass, LogIn, LogOut, ShieldCheck, Activity } from 'lucide-react';

interface NavbarProps {
  serverName: string;
  activeNode: string;
  user: { username: string; isAdmin: boolean } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  networkStatus: 'connected' | 'connecting' | 'disconnected';
}

export const Navbar: React.FC<NavbarProps> = ({
  serverName,
  activeNode,
  user,
  onOpenAuth,
  onLogout,
  networkStatus,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md">
      {/* Left: Dynamic Server Name & Current Target */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_rgba(147,51,234,0.3)]">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none flex items-center gap-2">
              {serverName}
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pill text-text-muted border border-border">
                Node: <strong className="ml-1 text-white uppercase">{activeNode}</strong>
              </span>
            </h1>
            <p className="text-xs text-text-dim mt-0.5">Network Management Dashboard</p>
          </div>
        </div>
      </div>

      {/* Right: Actions & User Session */}
      <div className="flex items-center gap-3">
        {/* Network Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-pill/80 border border-border text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              networkStatus === 'connected'
                ? 'bg-status-online shadow-[0_0_8px_#10b981]'
                : networkStatus === 'connecting'
                ? 'bg-status-warn animate-pulse'
                : 'bg-status-error'
            }`}
          />
          <span className="text-text-muted capitalize">
            {networkStatus === 'connected' ? 'Live Telemetry' : networkStatus}
          </span>
        </div>

        {/* Squaremap link */}
        <a
          href="/map"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card-sub border border-border text-xs font-medium text-text-muted hover:text-white hover:border-primary/40 transition-colors"
          title="Open Live Survival World Map"
        >
          <Compass className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">World Map</span>
        </a>

        {/* User Auth */}
        {user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-semibold text-xs">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-white flex items-center gap-1">
                  {user.username}
                  {user.isAdmin && <ShieldCheck className="h-3 w-3 text-primary" />}
                </div>
                <div className="text-[10px] text-text-dim uppercase tracking-wider">Superadmin</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-sub border border-border text-text-muted hover:text-status-error hover:border-status-error/40 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-[0_0_15px_rgba(147,51,234,0.35)] transition-all"
          >
            <LogIn className="h-4 w-4" />
            <span>Admin Login</span>
          </button>
        )}
      </div>
    </header>
  );
};

