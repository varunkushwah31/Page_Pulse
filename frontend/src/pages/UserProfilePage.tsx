import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createApiKey, fetchApiKeys, revokeApiKey, fetchSavedReports, fetchScheduledAudits, fetchUserCollections } from '../lib/api';
import type { ApiKeyResponse } from '../types';
import {
  UserIcon,
  KeyIcon,
  ShieldIcon,
  DatabaseIcon,
  PulseIcon,
  SignOutIcon,
  CopyIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  LockIcon,
  EnvelopeIcon,
  FolderIcon
} from '@phosphor-icons/react';

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
  const [collectionsCount, setCollectionsCount] = useState(0);

  const loadData = async () => {
    try {
      const [keys, reports, schedules, userColls] = await Promise.all([
        fetchApiKeys(),
        fetchSavedReports(),
        fetchScheduledAudits().catch(() => []),
        fetchUserCollections().catch(() => []),
      ]);
      setApiKeys(keys);
      const count = Array.isArray(reports) ? reports.length : (reports?.totalElements ?? reports?.content?.length ?? 0);
      setSavedReportsCount(count);
      setScheduledMonitorsCount(schedules.length);
      setCollectionsCount(userColls.length);
    } catch (err) {
      console.warn('Failed to load user profile metrics:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  /* ─── Unauthenticated State ─── */
  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-12 font-mono text-xs animate-fade-in-up">
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-8 text-center space-y-6 shadow-xl">
          <div className="size-12 rounded-lg bg-[#191D24] border border-[#333A45] flex items-center justify-center mx-auto text-[#4FD8C4]">
            <LockIcon className="size-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-[#E7EAEE] uppercase tracking-wider">Authentication Required</h2>
            <p className="text-[#8B93A1] font-sans text-xs max-w-sm mx-auto">
              You must be logged in to view your user profile, manage REST API access keys, and access persisted cloud reports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-md mx-auto text-left text-[11px]">
            <div className="p-2.5 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-1">
              <div className="flex items-center gap-1.5 text-[#4ADE80] font-bold">
                <DatabaseIcon className="size-3.5" />
                <span>Cloud Storage</span>
              </div>
              <p className="text-[#565D68] text-[10px]">Save full audit reports to MongoDB Atlas</p>
            </div>
            <div className="p-2.5 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-1">
              <div className="flex items-center gap-1.5 text-[#4FD8C4] font-bold">
                <KeyIcon className="size-3.5" />
                <span>API Keys</span>
              </div>
              <p className="text-[#565D68] text-[10px]">Generate tokens for CI/CD pipelines</p>
            </div>
            <div className="p-2.5 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-1">
              <div className="flex items-center gap-1.5 text-[#7AA2F7] font-bold">
                <PulseIcon className="size-3.5" />
                <span>Monitors</span>
              </div>
              <p className="text-[#565D68] text-[10px]">Configure automated background audits</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/auth')}
              type="button"
              className="px-4 py-2 rounded-lg border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 hover:bg-[#4FD8C4]/20 text-[#4FD8C4] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
            >
              <KeyIcon className="size-3.5" />
              <span>Sign In to Account</span>
            </button>
            <button
              onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
              type="button"
              className="px-4 py-2 rounded-lg border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] text-[#E7EAEE] font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
            >
              <UserIcon className="size-3.5" />
              <span>Register Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Authenticated Handlers ─── */
  const handleCreateApiKey = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
    } catch (err) {
      console.warn('Failed to revoke API key:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  /* ─── Authenticated Profile View ─── */
  return (
    <div className="space-y-6 font-mono text-xs max-w-4xl mx-auto animate-fade-in-up">

      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
        <div className="flex items-center gap-2 text-[#4FD8C4]">
          <ShieldIcon className="size-4" />
          <span className="font-bold">$ profile --user</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#4ADE80] animate-pulse" />
          <span className="text-[10px] font-bold text-[#4ADE80] tracking-wider uppercase">Session Active</span>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-lg bg-[#191D24] border border-[#333A45] flex items-center justify-center text-[#4FD8C4] font-bold text-lg shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#E7EAEE]">{user.username}</h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/30 uppercase tracking-wider">
                {user.role?.replace('ROLE_', '') || 'USER'}
              </span>
            </div>
            <p className="text-xs text-[#8B93A1] font-sans flex items-center gap-1.5">
              <EnvelopeIcon className="size-3 text-[#565D68]" />
              {user.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="px-3 py-1.5 rounded-lg border border-[#F87171]/30 bg-[#12151A] hover:bg-[#F87171]/10 text-[#F87171] font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
        >
          <SignOutIcon className="size-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => navigate('/collections')}
          className="rounded-xl border border-[#262B33] hover:border-[#4FD8C4]/40 bg-[#12151A] hover:bg-[#191D24] p-4 space-y-1 cursor-pointer transition-all text-left w-full"
        >
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span>SEO Collections</span>
            <FolderIcon className="size-4 text-[#4FD8C4]" />
          </div>
          <div className="text-2xl font-bold text-[#4FD8C4]">{collectionsCount}</div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="rounded-xl border border-[#262B33] hover:border-[#333A45] bg-[#12151A] hover:bg-[#191D24] p-4 space-y-1 cursor-pointer transition-all text-left w-full"
        >
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span>Saved Reports</span>
            <DatabaseIcon className="size-4 text-[#4ADE80]" />
          </div>
          <div className="text-2xl font-bold text-[#E7EAEE]">{savedReportsCount}</div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/scheduled')}
          className="rounded-xl border border-[#262B33] hover:border-[#333A45] bg-[#12151A] hover:bg-[#191D24] p-4 space-y-1 cursor-pointer transition-all text-left w-full"
        >
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span>Background Monitors</span>
            <PulseIcon className="size-4 text-[#7AA2F7]" />
          </div>
          <div className="text-2xl font-bold text-[#E7EAEE]">{scheduledMonitorsCount}</div>
        </button>

        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-1">
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span>API Access Tokens</span>
            <KeyIcon className="size-4 text-[#FBBF24]" />
          </div>
          <div className="text-2xl font-bold text-[#E7EAEE]">{apiKeys.length}</div>
        </div>
      </div>

      {/* REST API Access Keys Management */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden space-y-0">
        <div className="bg-[#191D24] p-3.5 border-b border-[#262B33] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyIcon className="size-4 text-[#4FD8C4]" />
            <span className="font-semibold text-[#E7EAEE] uppercase tracking-wider">REST API Access Keys</span>
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
              className="flex-1 bg-[#0A0C0F] border border-[#333A45] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !newKeyName.trim()}
              className="px-4 py-2 rounded-lg bg-[#191D24] border border-[#4FD8C4]/40 hover:bg-[#4FD8C4]/10 disabled:opacity-40 text-[#4FD8C4] font-bold transition-all cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
            >
              <PlusIcon className="size-3.5" />
              <span>Generate API Key</span>
            </button>
          </form>

          {/* Newly Generated Key Banner */}
          {generatedKey && (
            <div className="rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-3.5 space-y-2 text-[#4ADE80]">
              <div className="flex items-center justify-between font-bold text-xs">
                <span>✓ API Key Generated Successfully! Copy it now (shown once):</span>
                <button
                  onClick={handleCopyKey}
                  type="button"
                  className="px-2.5 py-1 rounded bg-[#4ADE80]/20 hover:bg-[#4ADE80]/30 text-[#E7EAEE] text-[11px] font-mono cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  {copiedKey ? <CheckIcon className="size-3 text-[#4ADE80]" /> : <CopyIcon className="size-3" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
              <div className="bg-[#0A0C0F] p-2.5 rounded border border-[#262B33] text-[#E7EAEE] break-all font-mono text-xs select-all">
                {generatedKey}
              </div>
            </div>
          )}

          {/* Active Keys Listing Table */}
          <div className="space-y-2 pt-1">
            <span className="text-[#8B93A1] font-semibold uppercase text-[11px] block">Active Keys ({apiKeys.length})</span>
            {apiKeys.length === 0 ? (
              <p className="text-[#565D68] italic py-2">No custom REST API keys generated yet.</p>
            ) : (
              <div className="divide-y divide-[#262B33] border border-[#262B33] rounded-lg overflow-hidden bg-[#0A0C0F]">
                {apiKeys.map((k, idx) => (
                  <div key={k.id || idx} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#12151A] transition-colors">
                    <div className="space-y-0.5 truncate">
                      <div className="font-semibold text-[#E7EAEE]">{k.name}</div>
                      <div className="text-[11px] text-[#565D68] font-mono truncate">{k.apiKey}</div>
                    </div>
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      type="button"
                      className="px-2 py-1 rounded text-[#F87171] hover:bg-[#F87171]/10 border border-[#F87171]/20 transition-all cursor-pointer shrink-0"
                    >
                      <TrashIcon className="size-3.5" />
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
