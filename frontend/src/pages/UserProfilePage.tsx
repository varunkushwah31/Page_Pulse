import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createApiKey,
  fetchApiKeys,
  revokeApiKey,
  fetchSavedReports,
  fetchScheduledAudits,
  fetchUserCollections,
  saveUserGeminiKey,
  removeUserGeminiKey,
  validateGeminiKey,
  fetchUserProfile,
} from '../lib/api';
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
  FolderIcon,
  SparkleIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ArrowSquareOutIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon
} from '@phosphor-icons/react';

export const UserProfilePage: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(false);

  // Gemini API Key management state
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiValidating, setGeminiValidating] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

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

  /* ─── Gemini API Key Handlers ─── */
  const handleValidateGeminiKey = async () => {
    const keyToTest = geminiKeyInput.trim();
    if (!keyToTest) {
      setGeminiStatus({ type: 'error', message: 'Please enter a Gemini API Key to test.' });
      return;
    }

    setGeminiValidating(true);
    setGeminiStatus(null);
    try {
      const res = await validateGeminiKey(keyToTest);
      if (res.valid) {
        setGeminiStatus({
          type: 'success',
          message: res.message || `Gemini API key is verified and active (Model: ${res.model || 'gemini-3.1-flash'})!`,
        });
      } else {
        setGeminiStatus({
          type: 'error',
          message: res.message || 'Validation failed. Please check your Gemini API key.',
        });
      }
    } catch (err) {
      setGeminiStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to connect to validation endpoint.',
      });
    } finally {
      setGeminiValidating(false);
    }
  };

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyToSave = geminiKeyInput.trim();
    if (!keyToSave) return;

    setGeminiSaving(true);
    setGeminiStatus(null);
    try {
      const updatedProfile = await saveUserGeminiKey(keyToSave);
      updateUser({
        hasGeminiApiKey: updatedProfile.hasGeminiApiKey,
        geminiApiKeyMasked: updatedProfile.geminiApiKeyMasked,
      });
      setGeminiKeyInput('');
      setGeminiStatus({
        type: 'success',
        message: 'Personal Gemini API Key saved successfully! AI-powered SEO analysis is now active for all audits.',
      });
    } catch (err) {
      setGeminiStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save Gemini API key.',
      });
    } finally {
      setGeminiSaving(false);
    }
  };

  const handleRemoveGeminiKey = async () => {
    if (!window.confirm('Are you sure you want to remove your stored Gemini API Key? Audits will revert to the standard rule-based engine.')) {
      return;
    }

    setGeminiSaving(true);
    setGeminiStatus(null);
    try {
      const updatedProfile = await removeUserGeminiKey();
      updateUser({
        hasGeminiApiKey: false,
        geminiApiKeyMasked: null,
      });
      setGeminiStatus({
        type: 'info',
        message: 'Gemini API Key removed. The platform will use deterministic rule engine fallbacks.',
      });
    } catch (err) {
      setGeminiStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to remove Gemini API key.',
      });
    } finally {
      setGeminiSaving(false);
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
            <span>Gemini AI Engine</span>
            <SparkleIcon className={`size-4 ${user.hasGeminiApiKey ? 'text-[#4FD8C4] animate-pulse' : 'text-[#8B93A1]'}`} />
          </div>
          <div className="text-sm font-bold truncate">
            {user.hasGeminiApiKey ? (
              <span className="text-[#4FD8C4] flex items-center gap-1">
                <CheckCircleIcon className="size-4 text-[#4ADE80]" /> Active
              </span>
            ) : (
              <span className="text-[#8B93A1]">Heuristic Only</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-1">
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span>API Access Tokens</span>
            <KeyIcon className="size-4 text-[#FBBF24]" />
          </div>
          <div className="text-2xl font-bold text-[#E7EAEE]">{apiKeys.length}</div>
        </div>
      </div>

      {/* Google Gemini AI Integration Card */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden space-y-0 shadow-xl">
        <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 flex items-center justify-center text-[#4FD8C4]">
              <SparkleIcon className="size-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#E7EAEE] text-sm uppercase tracking-wider">Google Gemini AI Engine</h3>
                {user.hasGeminiApiKey ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 inline-flex items-center gap-1">
                    <CheckCircleIcon className="size-3" /> User Key Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30">
                    Not Configured
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8B93A1] font-sans">
                Power intelligent SEO suggestions, high-converting meta tag synthesis, and Schema.org JSON-LD generation.
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#4FD8C4] hover:underline inline-flex items-center gap-1 bg-[#12151A] px-2.5 py-1.5 rounded border border-[#262B33] hover:border-[#4FD8C4]/40 transition-colors"
          >
            <span>Get Free Gemini Key</span>
            <ArrowSquareOutIcon className="size-3.5" />
          </a>
        </div>

        <div className="p-5 space-y-4">
          {/* Active Key Status Info Banner */}
          {user.hasGeminiApiKey && (
            <div className="p-3.5 rounded-lg border border-[#4FD8C4]/30 bg-[#4FD8C4]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4FD8C4]">
                  <CheckCircleIcon className="size-4 text-[#4ADE80]" />
                  <span>Gemini API Key Connected</span>
                </div>
                <div className="font-mono text-xs text-[#8B93A1]">
                  Masked Key: <code className="bg-[#0A0C0F] px-2 py-0.5 rounded text-[#E7EAEE] border border-[#262B33]">{user.geminiApiKeyMasked || 'AIzaSy••••••••'}</code>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRemoveGeminiKey}
                  disabled={geminiSaving}
                  className="px-3 py-1.5 rounded text-xs text-[#F87171] hover:bg-[#F87171]/10 border border-[#F87171]/30 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <TrashIcon className="size-3.5" />
                  <span>Remove Key</span>
                </button>
              </div>
            </div>
          )}

          {/* Key Configuration Form */}
          <form onSubmit={handleSaveGeminiKey} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8B93A1] uppercase tracking-wider block">
                {user.hasGeminiApiKey ? 'Update Personal Gemini API Key' : 'Add Personal Google Gemini API Key'}
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  required
                  placeholder="Paste your Gemini API Key here (starts with AIzaSy...)"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  disabled={geminiSaving}
                  className="w-full bg-[#0A0C0F] border border-[#333A45] rounded-lg pl-3 pr-10 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B93A1] hover:text-[#E7EAEE] p-1 cursor-pointer"
                  title={showGeminiKey ? 'Hide key' : 'Show key'}
                >
                  {showGeminiKey ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={geminiSaving || !geminiKeyInput.trim()}
                className="px-4 py-2 rounded-lg bg-[#4FD8C4]/10 border border-[#4FD8C4]/40 hover:bg-[#4FD8C4]/20 disabled:opacity-40 text-[#4FD8C4] font-bold transition-all cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
              >
                <SparkleIcon className="size-3.5" />
                <span>{geminiSaving ? 'Saving...' : user.hasGeminiApiKey ? 'Update Key' : 'Save Gemini Key'}</span>
              </button>

              <button
                type="button"
                onClick={handleValidateGeminiKey}
                disabled={geminiValidating || !geminiKeyInput.trim()}
                className="px-3 py-2 rounded-lg bg-[#191D24] border border-[#333A45] hover:bg-[#262B33] disabled:opacity-40 text-[#8B93A1] hover:text-[#E7EAEE] font-semibold transition-all cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
              >
                <ArrowsClockwiseIcon className={`size-3.5 ${geminiValidating ? 'animate-spin text-[#4FD8C4]' : ''}`} />
                <span>{geminiValidating ? 'Testing...' : 'Test & Validate Key'}</span>
              </button>
            </div>
          </form>

          {/* Feedback / Status Alert Banner */}
          {geminiStatus && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 animate-fade-in ${
                geminiStatus.type === 'success'
                  ? 'border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80]'
                  : geminiStatus.type === 'error'
                  ? 'border-[#F87171]/30 bg-[#F87171]/10 text-[#F87171]'
                  : 'border-[#7AA2F7]/30 bg-[#7AA2F7]/10 text-[#7AA2F7]'
              }`}
            >
              {geminiStatus.type === 'success' && <CheckCircleIcon className="size-4 shrink-0" />}
              {geminiStatus.type === 'error' && <WarningCircleIcon className="size-4 shrink-0" />}
              {geminiStatus.type === 'info' && <SparkleIcon className="size-4 shrink-0" />}
              <span>{geminiStatus.message}</span>
            </div>
          )}

          {/* Explanatory Feature Callout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] font-sans border-t border-[#191D24]">
            <div className="p-2.5 rounded-lg bg-[#0A0C0F] border border-[#262B33] space-y-1">
              <span className="font-bold text-[#4FD8C4] block font-mono text-[10px]">1. SEO Title & Meta Fixes</span>
              <p className="text-[#8B93A1] text-[11px]">Gemini generates high-converting titles and meta descriptions tailored to your target audience.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0A0C0F] border border-[#262B33] space-y-1">
              <span className="font-bold text-[#4ADE80] block font-mono text-[10px]">2. Schema.org JSON-LD</span>
              <p className="text-[#8B93A1] text-[11px]">Synthesizes valid structured data schemas to qualify for rich snippet search results.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0A0C0F] border border-[#262B33] space-y-1">
              <span className="font-bold text-[#7AA2F7] block font-mono text-[10px]">3. Interactive SEO Consultation</span>
              <p className="text-[#8B93A1] text-[11px]">Ask custom SEO optimization questions directly against your audited webpage DOM.</p>
            </div>
          </div>
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
