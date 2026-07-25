import React, { useState } from 'react';

export const ScheduledAuditConsole: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [frequency, setFrequency] = useState('HOURLY');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [scoreThreshold, setScoreThreshold] = useState(70);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegisterSchedule = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!targetUrl.trim() || loading) return;

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/v1/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: targetUrl.trim(),
          frequency,
          webhookUrl: webhookUrl.trim() || null,
          minOverallScoreThreshold: scoreThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register scheduled audit job.');
      }

      setSuccessMessage(`Automated ${frequency} audit job registered for ${targetUrl}!`);
      setTargetUrl('');
    } catch (err: any) {
      setError(err.message || 'Scheduled audit registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
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
            <label htmlFor="schedule-target-url" className="block text-[#8B93A1] mb-1">Target URL</label>
            <input
              id="schedule-target-url"
              type="text"
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              disabled={loading}
              className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:ring-1 focus:ring-[#4FD8C4]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="schedule-frequency" className="block text-[#8B93A1] mb-1">Audit Frequency</label>
              <select
                id="schedule-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                disabled={loading}
                className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] focus:outline-none cursor-pointer"
              >
                <option value="HOURLY">HOURLY (Every 1 Hour)</option>
                <option value="DAILY">DAILY (Every 24 Hours)</option>
                <option value="WEEKLY">WEEKLY (Every 7 Days)</option>
              </select>
            </div>

            <div>
              <label htmlFor="schedule-threshold" className="block text-[#8B93A1] mb-1">Regression Alert Threshold</label>
              <input
                id="schedule-threshold"
                type="number"
                min="1"
                max="100"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(Number.parseInt(e.target.value, 10) || 70)}
                disabled={loading}
                className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="schedule-webhook-url" className="block text-[#8B93A1] mb-1">Webhook Alert URL (Optional)</label>
            <input
              id="schedule-webhook-url"
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={loading}
              className="w-full bg-[#191D24] border border-[#333A45] rounded px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none"
            />
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
    </div>
  );
};
