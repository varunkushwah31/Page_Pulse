import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createApiKey, fetchApiKeys, revokeApiKey, fetchSavedReports, fetchScheduledAudits } from '../lib/api';
import type { ApiKeyResponse } from '../types';
import { User, Key, Shield, Database, Activity, LogOut, Copy, Check, Plus, Trash2 } from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const [savedReportsCount, setSavedReportsCount] = useState(0);
  const [scheduledMonitorsCount, setScheduledMonitorsCount] = useState(0);

  const loadData = async () => {
    try {
      const [keys, reports, schedules] = await Promise.all([
        fetchApiKeys(),
        fetchSavedReports(),
        fetchScheduledAudits().catch(() => []),
      ]);
      setApiKeys(keys);
      const count = Array.isArray(reports) ? reports.length : (reports?.totalElements ?? reports?.content?.length ?? 0);
      setSavedReportsCount(count);
      setScheduledMonitorsCount(schedules.length);
    } catch (_) {}
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-4 font-mono text-xs">
        <div className="size-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
          <User className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Authentication Required</h2>
          <p className="text-slate-400">You must be logged in to view your user profile and API keys.</p>
        </div>
        <button
          onClick={() => navigate('/auth')}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer transition-all inline-flex items-center gap-1.5"
        >
          Sign In to Account
        </button>
      </div>
    );
  }

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || loading) return;

    setLoading(true);
    try {
      const res = await createApiKey(newKeyName.trim());
      setGeneratedKey(res.apiKey);
      setNewKeyName('');
      await loadData();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRevokeKey = async (id?: string) => {
    if (!id) return;
    try {
      await revokeApiKey(id);
      await loadData();
    } catch (_) {}
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Profile Header Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-extrabold text-xl">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">{user.username}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {user.role || 'ROLE_USER'}
              </span>
            </div>
            <p className="text-slate-400 text-xs font-sans">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3.5 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
        >
          <LogOut className="size-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Account Activity Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Saved MongoDB Reports</span>
            <Database className="size-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{savedReportsCount}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Active Background Monitors</span>
            <Activity className="size-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{scheduledMonitorsCount}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>API Access Tokens</span>
            <Key className="size-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{apiKeys.length}</div>
        </div>
      </div>

      {/* API Key Management Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden space-y-0">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-purple-400" />
            <span className="font-semibold text-white uppercase tracking-wider">REST API Access Keys</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={handleCreateApiKey} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              placeholder="Key Name (e.g. CI/CD Pipeline Key)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !newKeyName.trim()}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold transition-all cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Generate API Key</span>
            </button>
          </form>

          {/* Newly Generated Secret Banner */}
          {generatedKey && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-emerald-400">
              <div className="flex items-center justify-between font-bold">
                <span>✓ API Key Generated Successfully! Copy it now (shown once):</span>
                <button
                  onClick={handleCopyKey}
                  className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-white text-[11px] font-mono cursor-pointer inline-flex items-center gap-1"
                >
                  {copiedKey ? <Check className="size-3 text-emerald-300" /> : <Copy className="size-3" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-white break-all font-mono">
                {generatedKey}
              </div>
            </div>
          )}

          {/* Active Keys Listing Table */}
          <div className="space-y-2 pt-2">
            <span className="text-slate-400 font-semibold uppercase text-[11px] block">Active Keys ({apiKeys.length})</span>
            {apiKeys.length === 0 ? (
              <p className="text-slate-500 italic py-2">No custom REST API keys generated yet.</p>
            ) : (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                {apiKeys.map((k, idx) => (
                  <div key={k.id || idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 truncate">
                      <div className="font-semibold text-white">{k.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{k.apiKey}</div>
                    </div>
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="px-2 py-1 rounded text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
