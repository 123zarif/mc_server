'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Send,
  Trash2,
  Copy,
  Check,
  ArrowDown,
  Server,
  Zap,
} from 'lucide-react';

interface ConsoleTabProps {
  activeNode: string;
  token: string | null;
  onExecuteCommand: (nodeId: string, command: string) => Promise<string>;
}

export const ConsoleTab: React.FC<ConsoleTabProps> = ({
  activeNode,
  token,
  onExecuteCommand,
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [inputCmd, setInputCmd] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const logContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect WebSocket for live logs
  useEffect(() => {
    if (!token) {
      setLogs((prev) => [
        ...prev,
        '[System] Admin session token missing. Please log in to view live console logs.',
      ]);
      setWsStatus('disconnected');
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/console?server=${activeNode}&token=${encodeURIComponent(token)}`;

    setWsStatus('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      setLogs((prev) => [...prev, `[Connected] Live log stream opened for ${activeNode}`]);
    };

    ws.onmessage = (event) => {
      setLogs((prev) => {
        const next = [...prev, event.data];
        return next.length > 2000 ? next.slice(-2000) : next;
      });
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
    };

    ws.onerror = () => {
      setWsStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [activeNode, token]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = inputCmd.trim();
    if (!cmd) return;

    // Add to history
    setHistory((prev) => [cmd, ...prev.filter((h) => h !== cmd)].slice(0, 50));
    setHistoryIndex(-1);

    // Optimistically print to terminal
    setLogs((prev) => [...prev, `> ${cmd}`]);
    setInputCmd('');

    try {
      const res = await onExecuteCommand(activeNode, cmd);
      if (res && res !== 'Command executed successfully.') {
        setLogs((prev) => [...prev, res]);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[Error] ${err.message}`]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputCmd(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCmd(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCmd('');
      }
    }
  };

  const quickCommands = ['tps', 'list', 'whitelist list', 'help', 'save-all'];

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
      {/* Console Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-card-sub px-4 py-3 gap-2">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-white">Live Terminal</span>
          <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-pill border border-border">
            {activeNode}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
              wsStatus === 'connected'
                ? 'bg-status-online/15 text-status-online'
                : wsStatus === 'connecting'
                ? 'bg-status-warn/15 text-status-warn animate-pulse'
                : 'bg-status-error/15 text-status-error'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-status-online' : 'bg-status-error'}`} />
            {wsStatus}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-text-dim cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-border bg-input text-primary focus:ring-0 focus:outline-none"
            />
            <span>Auto-scroll</span>
          </label>
          <button
            onClick={copyLogs}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pill hover:bg-card text-text-muted hover:text-white border border-border text-xs transition-colors"
            title="Copy Terminal Logs"
          >
            {copied ? <Check className="h-3 w-3 text-status-online" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setLogs([])}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pill hover:bg-card text-text-muted hover:text-status-error border border-border text-xs transition-colors"
            title="Clear Terminal Display"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs text-emerald-400 bg-[#080511] leading-relaxed select-text space-y-0.5"
      >
        {logs.length === 0 ? (
          <div className="text-text-dim italic">Waiting for console stream output from {activeNode}...</div>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} className="break-words hover:bg-white/5 px-1 rounded transition-colors">
              {line}
            </div>
          ))
        )}
      </div>

      {/* Quick Command Pills */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-card-sub border-t border-border overflow-x-auto">
        <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-[11px] font-semibold text-text-dim uppercase tracking-wider flex-shrink-0 mr-1">
          Quick:
        </span>
        {quickCommands.map((cmd) => (
          <button
            key={cmd}
            onClick={() => {
              setInputCmd(cmd);
              onExecuteCommand(activeNode, cmd);
            }}
            className="px-2.5 py-1 rounded bg-pill hover:bg-primary border border-border hover:border-primary/40 text-[11px] font-mono text-text-muted hover:text-white transition-colors flex-shrink-0"
          >
            /{cmd}
          </button>
        ))}
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSend} className="flex border-t border-border bg-input p-2.5 gap-2">
        <div className="flex items-center px-3 font-mono text-sm text-primary select-none font-bold">
          &gt;
        </div>
        <input
          type="text"
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Send command to ${activeNode}... (Use ↑/↓ for history)`}
          className="flex-1 bg-transparent text-xs text-white placeholder-text-dim font-mono focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-[0_0_12px_rgba(147,51,234,0.35)] transition-all"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};

