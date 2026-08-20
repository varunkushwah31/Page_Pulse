import React, { useState, useEffect } from 'react';
import type { ScheduledAuditConfig } from '../types';
import {
  fetchScheduledAudits,
  createScheduledAudit,
  toggleScheduledAudit,
  deleteScheduledAudit,
} from '../lib/api';

export const ScheduledAuditConsole: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledAuditConfig[]>([]);
  const [targetUrl, setTargetUrl] = useState('');
  const [frequencyMinutes, setFrequencyMinutes] = useState(60);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [email, setEmail] = useState('');
  const [regressionThreshold, setRegressionThreshold] = useState(15);
  const [notifyOnRegressionOnly, setNotifyOnRegressionOnly] = useState(true);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = async () => {
    setFetching(true);
    try {
      const data = await fetchScheduledAudits();
      setSchedules(data);
    } catch (err) {
      console.warn('Could not load scheduled audits:', err);
      setSchedules([]);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleRegisterSchedule = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!targetUrl.trim() || loading) return;

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const newConfig = await createScheduledAudit({
        url: targetUrl.trim(),
        frequencyMinutes,
        webhookUrl: webhookUrl.trim() || null,
        email: email.trim() || null,
        regressionThreshold,
        notifyOnRegressionOnly,
      });

      setSuccessMessage(`Automated monitor #${newConfig.id} registered for ${newConfig.url}!`);
      setTargetUrl('');
      setWebhookUrl('');
      setEmail('');
      await loadSchedules();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scheduled audit registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await toggleScheduledAudit(id);
      await loadSchedules();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle monitor status.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteScheduledAudit(id);
      await loadSchedules();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete monitor.');
    }
  };

  const formatFrequency = (mins: number) => {
    if (mins >= 1440) return `${Math.round(mins / 1440)} Day(s)`;
    if (mins >= 60) return `${Math.round(mins / 60)} Hour(s)`;
    return `${mins} Mins`;
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Registration Terminal Prompt */}
      <form onSubmit={handleRegisterSchedule} className="space-y-4 rounded-xl border border-[#262B33] bg-[#12151A] p-5">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3 text-[#565D68]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#E7EAEE] font-semibold">schedule --register</span>
          </div>
          <span className="text-[11px] text-[#4FD8C4]">Automated Regression Monitor</span>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="schedule-target-url" className="block text-[#8B93A1] mb-1">Target URL to Monitor</label>
            <input
              id="schedule-target-url"
              type="text"
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              disabled={loading}
              className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="schedule-frequency" className="block text-[#8B93A1] mb-1">Audit Frequency</label>
              <select
                id="schedule-frequency"
                value={frequencyMinutes}
                onChange={(e) => setFrequencyMinutes(Number.parseInt(e.target.value, 10))}
                disabled={loading}
                className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] focus:outline-none focus:border-[#4FD8C4] transition-colors cursor-pointer"
              >
                <option value={15}>Every 15 Minutes</option>
                <option value={30}>Every 30 Minutes</option>
                <option value={60}>HOURLY (Every 1 Hour)</option>
                <option value={360}>Every 6 Hours</option>
                <option value={1440}>DAILY (Every 24 Hours)</option>
                <option value={10080}>WEEKLY (Every 7 Days)</option>
              </select>
            </div>

            <div>
              <label htmlFor="schedule-threshold" className="block text-[#8B93A1] mb-1">Regression Sensitivity Δ</label>
              <input
                id="schedule-threshold"
                type="number"
                min="1"
                max="50"
                value={regressionThreshold}
                onChange={(e) => setRegressionThreshold(Number.parseInt(e.target.value, 10) || 15)}
                disabled={loading}
                className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] focus:outline-none focus:border-[#4FD8C4] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="schedule-email" className="block text-[#8B93A1] mb-1">Alert Email (Optional)</label>
              <input
                id="schedule-email"
                type="email"
                placeholder="devops@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="schedule-webhook-url" className="block text-[#8B93A1] mb-1">Slack / Discord Webhook URL (Optional)</label>
            <input
              id="schedule-webhook-url"
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={loading}
              className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="schedule-notify-only"
              type="checkbox"
              checked={notifyOnRegressionOnly}
              onChange={(e) => setNotifyOnRegressionOnly(e.target.checked)}
              disabled={loading}
              className="rounded border-[#333A45] bg-[#191D24] text-[#4FD8C4] cursor-pointer"
            />
            <label htmlFor="schedule-notify-only" className="text-[#8B93A1] cursor-pointer select-none">
              Notify only when score drops by more than {regressionThreshold} points (Regression Alert)
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading || !targetUrl.trim()}
            className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer"
          >
            {loading ? 'Registering...' : 'Register Automated Monitor'}
          </button>
        </div>
      </form>

      {successMessage && (
        <div className="rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-4 text-[#4ADE80]">
          <span>✓ {successMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 text-[#F87171]">
          <span>{error}</span>
        </div>
      )}

      {/* Active Monitors List Table */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden space-y-0">
        <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex items-center justify-between">
          <span className="text-[#565D68] uppercase tracking-wider font-semibold">Active Background Monitors ({schedules.length})</span>
          <button
            type="button"
            onClick={loadSchedules}
            disabled={fetching}
            className="text-[11px] text-[#4FD8C4] hover:underline cursor-pointer disabled:opacity-50"
          >
            {fetching ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>

        {schedules.length === 0 ? (
          <div className="p-8 text-center text-[#565D68]">
            No automated audit monitors registered yet. Register a target URL above to begin background polling.
          </div>
        ) : (
          <div className="divide-y divide-[#262B33]">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#4FD8C4] font-semibold">#{schedule.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${schedule.active ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30'}`}>
                      {schedule.active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                    <span className="text-[#8B93A1] text-[11px]">{formatFrequency(schedule.frequencyMinutes)}</span>
                  </div>
                  <div className="text-[#E7EAEE] font-semibold truncate max-w-md">{schedule.url}</div>
                  <div className="text-[11px] text-[#565D68] flex flex-wrap gap-x-3 gap-y-1">
                    <span>Threshold: Δ {schedule.regressionThreshold} pts</span>
                    {schedule.lastAuditTime && <span>Last Audit: {new Date(schedule.lastAuditTime).toLocaleString()}</span>}
                    {schedule.previousOverallScore !== null && <span>Previous Score: {schedule.previousOverallScore}/100</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(schedule.id)}
                    className="rounded border border-[#333A45] bg-[#191D24] px-3 py-1 text-xs text-[#E7EAEE] hover:bg-[#262B33] transition-all cursor-pointer"
                  >
                    {schedule.active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(schedule.id)}
                    className="rounded border border-[#F87171]/30 bg-[#F87171]/10 px-3 py-1 text-xs text-[#F87171] hover:bg-[#F87171]/20 transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
