import React, { useState } from 'react';

export const TrendConsole: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [trendData, setTrendData] = useState<{ date: string; score: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchTrend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || loading) return;

    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/reports/${encodeURIComponent(domain.trim())}/trends?days=${days}`);
      if (!response.ok) throw new Error('Trend data lookup failed for domain.');
      const data = await response.json();
      setTrendData(data.dataPoints || []);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve trend data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Terminal Prompt Bar */}
      <form onSubmit={handleFetchTrend} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 focus-within:ring-2 focus-within:ring-[#4FD8C4] focus-within:ring-offset-2 focus-within:ring-offset-[#0A0C0F]">
          <div className="flex items-center gap-1.5 pl-2 pr-1 text-[#565D68] select-none">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#8B93A1]">trend</span>
          </div>

          <input
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none"
          />

          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              disabled={loading}
              className="bg-[#191D24] border border-[#333A45] rounded px-2 py-1.5 text-xs text-[#E7EAEE] focus:outline-none cursor-pointer"
            >
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>

            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer"
            >
              {loading ? 'Analyzing...' : 'Run'}
            </button>
          </div>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">HISTORICAL ANALYSIS</span>
            <span className="text-[#E7EAEE]">{domain} ({days} days)</span>
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] animate-pulse"></span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 text-[#F87171]">
          <span>{error}</span>
        </div>
      )}

      {/* Historical Trend Chart Area */}
      {trendData && !loading && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
            <span className="text-[#565D68] uppercase tracking-wider font-semibold">Domain Historical Score Trend</span>
            <span className="text-[#4ADE80] font-bold">Domain: {domain}</span>
          </div>

          {trendData.length === 0 ? (
            <div className="text-center py-6 text-[#565D68] italic">
              No historical trend records found for domain in the last {days} days.
            </div>
          ) : (
            <div className="space-y-2">
              {trendData.map((dp, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-[#262B33]/50">
                  <span className="text-[#8B93A1]">{dp.date}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[#0A0C0F] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#4FD8C4] h-full" style={{ width: `${dp.score}%` }}></div>
                    </div>
                    <span className="font-bold text-[#E7EAEE] w-12 text-right">{dp.score} / 100</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
