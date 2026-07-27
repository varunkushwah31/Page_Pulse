import React, { useState, useEffect } from 'react';
import type { TrendResponse, TrendDataPoint } from '../types';
import { fetchDomainTrends } from '../lib/api';
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3 } from 'lucide-react';

interface TrendConsoleProps {
  initialDomain?: string;
}

export const TrendConsole: React.FC<TrendConsoleProps> = ({ initialDomain = '' }) => {
  const [domain, setDomain] = useState(initialDomain);
  const [metric, setMetric] = useState('overallScore');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [trendResponse, setTrendResponse] = useState<TrendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeFetch = async (targetDomain: string, targetMetric: string, targetDays: number) => {
    if (!targetDomain.trim() || loading) return;

    setError(null);
    setLoading(true);
    try {
      const data = await fetchDomainTrends(targetDomain, targetMetric, targetDays);
      setTrendResponse(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to retrieve trend data for domain.');
      }
      setTrendResponse(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialDomain && initialDomain.trim()) {
      setDomain(initialDomain);
      executeFetch(initialDomain, metric, days);
    }
  }, [initialDomain]);

  const handleFetchTrend = (e: React.FormEvent) => {
    e.preventDefault();
    executeFetch(domain, metric, days);
  };

  const dataPoints: TrendDataPoint[] = trendResponse?.data || [];
  const summary = trendResponse?.summary;

  const renderTrendBadge = (trendStr?: string) => {
    if (!trendStr) return null;
    const isUp = trendStr.toUpperCase() === 'UP';
    const isDown = trendStr.toUpperCase() === 'DOWN';

    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs font-bold ${
          isUp
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : isDown
            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            : 'bg-slate-800 text-slate-300 border border-slate-700'
        }`}
      >
        {isUp && <TrendingUp className="size-3.5" />}
        {isDown && <TrendingDown className="size-3.5" />}
        {!isUp && !isDown && <Minus className="size-3.5" />}
        {trendStr.toUpperCase()}
      </span>
    );
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
              value={metric}
              onChange={(e) => {
                setMetric(e.target.value);
                if (domain.trim()) executeFetch(domain, e.target.value, days);
              }}
              disabled={loading}
              className="bg-[#191D24] border border-[#333A45] rounded px-2 py-1.5 text-xs text-[#E7EAEE] focus:outline-none cursor-pointer"
            >
              <option value="overallScore">Overall Health</option>
              <option value="seoScore">SEO Score</option>
              <option value="contentScore">Content Score</option>
              <option value="accessibilityScore">Accessibility Score</option>
              <option value="performanceScore">Performance Score</option>
              <option value="responseTimeMs">Response Time (ms)</option>
            </select>

            <select
              value={days}
              onChange={(e) => {
                const newDays = parseInt(e.target.value);
                setDays(newDays);
                if (domain.trim()) executeFetch(domain, metric, newDays);
              }}
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

      {/* Historical Trend Data Display */}
      {trendResponse && !loading && (
        <div className="space-y-4">
          {/* Executive Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                <div className="text-[#565D68] uppercase text-[10px]">Latest Score</div>
                <div className="text-base font-bold text-[#E7EAEE]">
                  {summary.latest != null ? Math.round(summary.latest) : 'N/A'}
                </div>
              </div>
              <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                <div className="text-[#565D68] uppercase text-[10px]">Average Score</div>
                <div className="text-base font-bold text-[#4FD8C4]">
                  {summary.average != null ? Math.round(summary.average) : 'N/A'}
                </div>
              </div>
              <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                <div className="text-[#565D68] uppercase text-[10px]">Min / Max</div>
                <div className="text-base font-bold text-[#E7EAEE]">
                  {summary.min != null ? Math.round(summary.min) : 0} / {summary.max != null ? Math.round(summary.max) : 0}
                </div>
              </div>
              <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                <div className="text-[#565D68] uppercase text-[10px]">Trend Movement</div>
                <div>{renderTrendBadge(summary.trend)}</div>
              </div>
            </div>
          )}

          {/* Historical Trend Chart Area */}
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-[#4FD8C4]" />
                <span className="text-[#565D68] uppercase tracking-wider font-semibold">Domain Historical Score Trend</span>
              </div>
              <span className="text-[#4ADE80] font-bold">Domain: {trendResponse.domain}</span>
            </div>

            {dataPoints.length === 0 ? (
              <div className="text-center py-8 text-[#565D68] space-y-2">
                <Activity className="size-6 mx-auto text-[#565D68]" />
                <p className="italic">No saved report data found for domain "{trendResponse.domain}" in MongoDB Atlas within the last {days} days.</p>
                <p className="text-[11px] text-[#8B93A1] font-normal">Tip: Run audits for this URL and click "Save Report to Database" to build historical trend metrics.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dataPoints.map((dp, idx) => {
                  const formattedDate = dp.timestamp ? new Date(dp.timestamp).toLocaleString() : 'N/A';
                  const val = dp.value != null ? Math.round(dp.value) : 0;
                  const isMs = metric === 'responseTimeMs';
                  const maxRange = isMs ? 3000 : 100;
                  const barWidth = Math.min(100, Math.max(5, (val / maxRange) * 100));

                  return (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-[#262B33]/50 hover:bg-[#191D24]/50 px-2 rounded transition-colors">
                      <span className="text-[#8B93A1] text-xs font-mono">{formattedDate}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-36 bg-[#0A0C0F] h-2 rounded-full overflow-hidden border border-[#262B33]">
                          <div
                            className={`h-full ${isMs ? 'bg-amber-400' : 'bg-[#4FD8C4]'}`}
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-[#E7EAEE] w-20 text-right font-mono">
                          {val} {isMs ? 'ms' : '/ 100'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
