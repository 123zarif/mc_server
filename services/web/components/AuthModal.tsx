'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, Lock, User, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: { username: string; isAdmin: boolean }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'setup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !password) {
      setError('Please fill in both username and password.');
      return;
    }

    try {
      setLoading(true);
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication request failed');
      }

      if (tab === 'setup') {
        setSuccess('Admin account created successfully! You can now log in.');
        setTab('login');
      } else {
        onLoginSuccess(data.token, data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-text-dim hover:text-white hover:bg-pill transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Admin Authentication</h3>
            <p className="text-xs text-text-dim">Synchronized with in-game AuthMe accounts</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-pill p-1 mb-5 border border-border">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login' ? 'bg-card text-white shadow-sm border border-border' : 'text-text-muted hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('setup');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'setup' ? 'bg-card text-white shadow-sm border border-border' : 'text-text-muted hover:text-white'
            }`}
          >
            First-Time Setup
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-status-error/15 border border-status-error/30 text-xs font-medium text-status-error">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-status-online/15 border border-status-online/30 text-xs font-medium text-status-online">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-text-dim" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="litlua or ozzy"
                className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-xs text-white placeholder-text-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-text-dim" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="In-game AuthMe password"
                className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5 text-xs text-white placeholder-text-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_15px_rgba(147,51,234,0.35)] transition-all mt-2"
          >
            <KeyRound className="h-4 w-4" />
            <span>
              {loading
                ? 'Verifying credentials...'
                : tab === 'login'
                ? 'Sign In to Dashboard'
                : 'Initialize Superadmin Account'}
            </span>
          </button>
        </form>

        <div className="mt-4 text-center text-[11px] text-text-dim">
          {tab === 'login'
            ? 'Use your in-game AuthMe credentials.'
            : 'Only preconfigured superadmins (litlua, ozzy) are authorized.'}
        </div>
      </div>
    </div>
  );
};

