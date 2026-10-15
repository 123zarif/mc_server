'use client';

import React, { useState } from 'react';
import {
  Globe,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Mic,
  Server,
  ShieldCheck,
  Wifi,
  ExternalLink,
  Info,
} from 'lucide-react';

interface ConnectionTabProps {
  serverName: string;
  connectionInfo?: {
    java: { host: string; port: number; version: string };
    bedrock: { host: string; port: number; version: string };
    voice: { port: number; protocol: string };
  };
  onlineCount: number;
  maxPlayers: number;
}

export const ConnectionTab: React.FC<ConnectionTabProps> = ({
  serverName,
  connectionInfo = {
    java: { host: 'zarifzuhayer.tech', port: 25565, version: '1.21.4 (Java Edition)' },
    bedrock: { host: 'zarifzuhayer.tech', port: 19132, version: 'Latest Bedrock (Android / iOS / Windows)' },
    voice: { port: 24454, protocol: 'UDP' },
  },
  onlineCount,
  maxPlayers,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Hero Connection Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card-sub to-card p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_rgba(147,51,234,0.3)]">
              <Wifi className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">How to Connect & Join</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-status-online/15 text-status-online border border-status-online/30">
                  <span className="h-2 w-2 rounded-full bg-status-online shadow-[0_0_8px_#10b981]" />
                  Online Gateway
                </span>
              </div>
              <p className="text-xs text-text-dim mt-1">
                Cross-play network supporting Java Edition and Bedrock Edition (Android, iOS, Windows, Consoles)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border bg-pill px-4 py-2 text-right">
              <div className="text-[11px] text-text-dim uppercase font-semibold">Total Players</div>
              <div className="text-base font-bold text-white">
                <span className="text-status-online">{onlineCount}</span> / {maxPlayers}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Cards Grid: Java vs Bedrock/Android */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Android & Bedrock Edition Card */}
        <div className="rounded-2xl border border-primary/40 bg-card p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Android & Bedrock Edition</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary text-white font-bold uppercase">
                    Geyser
                  </span>
                </h3>
                <p className="text-xs text-text-dim">Android phone/tablet, iOS, Windows 10/11 Bedrock</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {/* Server Address */}
            <div className="rounded-xl border border-border bg-input p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">
                  Server Address / IP
                </div>
                <div className="font-mono text-sm font-bold text-white mt-0.5 select-all">
                  {connectionInfo.bedrock.host}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(connectionInfo.bedrock.host, 'bedrock-host')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pill hover:bg-primary border border-border hover:border-primary text-xs font-semibold text-white transition-all"
              >
                {copiedField === 'bedrock-host' ? <Check className="h-3.5 w-3.5 text-status-online" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedField === 'bedrock-host' ? 'Copied' : 'Copy IP'}</span>
              </button>
            </div>

            {/* Port */}
            <div className="rounded-xl border border-border bg-input p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">
                  Port (Bedrock / UDP)
                </div>
                <div className="font-mono text-sm font-bold text-primary mt-0.5 select-all">
                  {connectionInfo.bedrock.port}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(String(connectionInfo.bedrock.port), 'bedrock-port')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pill hover:bg-primary border border-border hover:border-primary text-xs font-semibold text-white transition-all"
              >
                {copiedField === 'bedrock-port' ? <Check className="h-3.5 w-3.5 text-status-online" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedField === 'bedrock-port' ? 'Copied' : 'Copy Port'}</span>
              </button>
            </div>

            {/* Version */}
            <div className="rounded-xl border border-border bg-card-sub p-3 flex items-center justify-between">
              <span className="text-xs text-text-dim">Compatible Version</span>
              <span className="text-xs font-semibold text-emerald-400">
                {connectionInfo.bedrock.version}
              </span>
            </div>
          </div>

          {/* Quick Steps for Android */}
          <div className="mt-5 rounded-xl border border-border bg-card-sub/60 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-2">
              <Info className="h-4 w-4 text-primary" />
              <span>Android Quick Setup Instructions</span>
            </div>
            <ol className="list-decimal list-inside text-xs text-text-muted space-y-1.5 pl-1">
              <li>Launch Minecraft on your Android device.</li>
              <li>Tap <strong>Play</strong> &rarr; <strong>Servers</strong> tab.</li>
              <li>Scroll down and tap <strong>Add Server</strong>.</li>
              <li>
                Enter <strong>{serverName}</strong> as Name,{' '}
                <strong className="text-white font-mono">{connectionInfo.bedrock.host}</strong> as Server Address, and{' '}
                <strong className="text-primary font-mono">{connectionInfo.bedrock.port}</strong> as Port.
              </li>
              <li>Tap <strong>Save</strong> and tap to connect!</li>
            </ol>
          </div>
        </div>

        {/* 2. Java Edition Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pill text-white border border-border">
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Java Edition</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-pill text-text-muted border border-border font-bold uppercase">
                    PC / Mac / Linux
                  </span>
                </h3>
                <p className="text-xs text-text-dim">Standard Java Edition clients (Official, Prism, Modrinth, Lunar)</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {/* Server Address */}
            <div className="rounded-xl border border-border bg-input p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">
                  Server Address / IP
                </div>
                <div className="font-mono text-sm font-bold text-white mt-0.5 select-all">
                  {connectionInfo.java.host}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(connectionInfo.java.host, 'java-host')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pill hover:bg-primary border border-border hover:border-primary text-xs font-semibold text-white transition-all"
              >
                {copiedField === 'java-host' ? <Check className="h-3.5 w-3.5 text-status-online" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedField === 'java-host' ? 'Copied' : 'Copy IP'}</span>
              </button>
            </div>

            {/* Port */}
            <div className="rounded-xl border border-border bg-input p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">
                  Port (Java Default)
                </div>
                <div className="font-mono text-sm font-bold text-text-muted mt-0.5 select-all">
                  {connectionInfo.java.port}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(String(connectionInfo.java.port), 'java-port')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pill hover:bg-primary border border-border hover:border-primary text-xs font-semibold text-white transition-all"
              >
                {copiedField === 'java-port' ? <Check className="h-3.5 w-3.5 text-status-online" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedField === 'java-port' ? 'Copied' : 'Copy Port'}</span>
              </button>
            </div>

            {/* Version */}
            <div className="rounded-xl border border-border bg-card-sub p-3 flex items-center justify-between">
              <span className="text-xs text-text-dim">Recommended Version</span>
              <span className="text-xs font-semibold text-emerald-400">
                {connectionInfo.java.version}
              </span>
            </div>
          </div>

          {/* Quick Steps for Java */}
          <div className="mt-5 rounded-xl border border-border bg-card-sub/60 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-2">
              <Info className="h-4 w-4 text-primary" />
              <span>Java Quick Setup Instructions</span>
            </div>
            <ol className="list-decimal list-inside text-xs text-text-muted space-y-1.5 pl-1">
              <li>Launch Minecraft Java Edition.</li>
              <li>Click <strong>Multiplayer</strong> &rarr; <strong>Add Server</strong>.</li>
              <li>Enter Server Name and in Server Address paste: <strong className="text-white font-mono">{connectionInfo.java.host}</strong>.</li>
              <li>Click <strong>Done</strong>, select the server, and click <strong>Join Server</strong>!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Simple Voice Chat Proximity Voice Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pill text-primary border border-border">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Proximity Voice Chat (Simple Voice Chat)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-pill text-text-muted border border-border font-mono">
                  Port: {connectionInfo.voice.port} / {connectionInfo.voice.protocol}
                </span>
              </h3>
              <p className="text-xs text-text-dim">
                Real-time 3D spatial directional audio enabled on the network
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-text-muted leading-relaxed">
          To speak and hear players in-game based on distance, install the client mod{' '}
          <strong className="text-white">Simple Voice Chat</strong> (available for Fabric, Forge, and NeoForge).
          The mod automatically connects to port <strong className="text-primary font-mono">{connectionInfo.voice.port}</strong> when you join the server.
        </div>
      </div>
    </div>
  );
};

