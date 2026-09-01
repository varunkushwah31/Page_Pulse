import React, { useState, useEffect, useMemo } from 'react';
import type { TrendResponse, TrendDataPoint } from '../types';
import { fetchDomainTrends } from '../lib/api';
import { exportToCsv, exportToJson } from '../lib/ExportUtils';
import {
  TrendUpIcon,
  TrendDownIcon,
  MinusIcon,
  PulseIcon,
  ChartBarIcon,
  WarningIcon,
  LightningIcon,
  CheckCircleIcon,
  ShieldWarningIcon,
  ChartLineIcon,
  ListIcon
} from '@phosphor-icons/react';

interface TrendConsoleProps {
  initialDomain?: string;
}

interface AnomalyEvent {
  date: string;
  value: number;
  previousValue: number;
  delta: number;
  severity: 'CRITICAL' | 'MODERATE';
  reason: string;
}

export const TrendConsole: React.FC<TrendConsoleProps> = ({ initialDomain = '' }) => {
  const [domain, setDomain] = useState(initialDomain);
  const [metric, setMetric] = useState('overallScore');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [trendResponse, setTrendResponse] = useState<TrendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

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
    if (initialDomain?.trim()) {
      setDomain(initialDomain);
      executeFetch(initialDomain, metric, days);
    }
  }, [initialDomain]);

  const handleFetchTrend = (e: React.ChangeEvent) => {
    e.preventDefault();
    executeFetch(domain, metric, days);
  };

  const dataPoints: TrendDataPoint[] = trendResponse?.data || [];
  const summary = trendResponse?.summary;

  // Smart Statistical Anomaly & Regression Detection Engine
  const anomalyAnalysis = useMemo(() => {
    if (dataPoints.length < 2) {
      return {
        mean: 0,
        stdDev: 0,
        stabilityIndex: 100,
        anomalies: [] as AnomalyEvent[],
      };
    }

    const values = dataPoints.map((d) => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Stability Index (Higher is more consistent)
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
    const stabilityIndex = Math.max(0, Math.min(100, Math.round(100 - cv)));

    // Detect Regression Anomalies
    const anomalies: AnomalyEvent[] = [];
    for (let i = 1; i < dataPoints.length; i++) {
      const prev = dataPoints[i - 1].value;
      const curr = dataPoints[i].value;
      const delta = curr - prev;

      const isMs = metric === 'responseTimeMs';
      const isRegression = isMs ? delta > 500 : delta < -10;

      if (isRegression) {
        const severity: 'CRITICAL' | 'MODERATE' = Math.abs(delta) > 20 || (isMs && delta > 1000) ? 'CRITICAL' : 'MODERATE';
        const formattedDate = dataPoints[i].timestamp ? new Date(dataPoints[i].timestamp).toLocaleString() : `Audit #${i + 1}`;

        anomalies.push({
          date: formattedDate,
          value: Math.round(curr),
          previousValue: Math.round(prev),
          delta: Math.round(delta),
          severity,
          reason: isMs
            ? `Latency spike of +${Math.round(delta)}ms detected relative to baseline.`
            : `Score dropped by ${Math.abs(Math.round(delta))} points (possible SEO/DOM degradation).`,
        });
      }
    }

    return {
      mean: Math.round(mean),
      stdDev: Math.round(stdDev * 10) / 10,
      stabilityIndex,
      anomalies,
    };
  }, [dataPoints, metric]);

  const sampleDomains = ['leetcode.com', 'codeforces.com', 'github.com', 'wikipedia.org'];

  const renderTrendBadge = (trendStr?: string) => {
    if (!trendStr) return null;
    const isUp = trendStr.toUpperCase() === 'UP';
    const isDown = trendStr.toUpperCase() === 'DOWN';

    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs font-bold ${
          isUp
            ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30'
            : isDown
            ? 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'
            : 'bg-[#191D24] text-[#8B93A1] border border-[#262B33]'
        }`}
      >
        {isUp && <TrendUpIcon className="size-3.5" />}
        {isDown && <TrendDownIcon className="size-3.5" />}
        {!isUp && !isDown && <MinusIcon className="size-3.5" />}
        {trendStr.toUpperCase()}
      </span>
    );
  };

  // Compute SVG chart coordinates
  const svgChart = useMemo(() => {
    if (dataPoints.length === 0) return null;

    const width = 700;
    const height = 220;
    const paddingX = 40;
    const paddingY = 25;

    const values = dataPoints.map((d) => d.value ?? 0);
    const minVal = Math.max(0, Math.min(...values) * 0.85);
    const maxVal = metric === 'responseTimeMs' ? Math.max(...values, 100) * 1.15 : 100;

    const range = maxVal - minVal || 1;

    const points = dataPoints.map((d, idx) => {
      const x = paddingX + (idx / Math.max(1, dataPoints.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - (((d.value ?? 0) - minVal) / range) * (height - 2 * paddingY);
      return { x, y, value: d.value, timestamp: d.timestamp };
    });

    const linePath = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
    }, '');

    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`
      : '';

    return { width, height, points, linePath, areaPath, minVal, maxVal };
  }, [dataPoints, metric]);

  return (
    <div className="space-y-6 font-mono text-xs text-[#E7EAEE]">
      {/* Terminal Prompt Bar */}
      <form onSubmit={handleFetchTrend} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 focus-within:border-[#4FD8C4] transition-colors">
          <div className="flex items-center gap-1.5 pl-2 pr-1 text-[#565D68] select-none">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#8B93A1]">trend --domain</span>
          </div>

          <input
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none"
          />

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
              <option value="responseTimeMs">Response Latency (ms)</option>
            </select>

            <select
              value={days}
              onChange={(e) => {
                const newDays = Number.parseInt(e.target.value, 10);
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
              className="rounded border border-[#333A45] bg-[#191D24] px-4 py-1.5 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer shrink-0"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Domain Presets */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#565D68] pl-1">
        <span>Presets:</span>
        {sampleDomains.map((sampleDomain) => (
          <button
            key={sampleDomain}
            type="button"
            disabled={loading}
            onClick={() => {
              setDomain(sampleDomain);
              executeFetch(sampleDomain, metric, days);
            }}
            className="rounded border border-[#262B33] bg-[#12151A] px-2 py-0.5 text-[#8B93A1] hover:text-[#4FD8C4] hover:border-[#4FD8C4]/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {sampleDomain}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">STATISTICAL REGRESSION ENGINE</span>
            <span className="text-[#E7EAEE]">{domain} ({days} days)</span>
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] cursor-blink"></span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 text-[#F87171]">
          <span>{error}</span>
        </div>
      )}

      {/* Historical Trend Data & Anomaly Digest */}
      {trendResponse && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[#565D68] uppercase text-[11px] font-bold">
              Trend Analysis for {trendResponse.domain}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#12151A] border border-[#262B33] rounded p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('chart')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    viewMode === 'chart'
                      ? 'bg-[#191D24] text-[#4FD8C4] border border-[#333A45]'
                      : 'text-[#8B93A1] hover:text-[#E7EAEE]'
                  }`}
                >
                  <ChartLineIcon className="size-3" />
                  <span>Chart</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    viewMode === 'list'
                      ? 'bg-[#191D24] text-[#4FD8C4] border border-[#333A45]'
                      : 'text-[#8B93A1] hover:text-[#E7EAEE]'
                  }`}
                >
                  <ListIcon className="size-3" />
                  <span>Timeline</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const headers = ['Timestamp', 'Metric Value', 'Audit ID'];
                  const rows = (trendResponse.data || []).map((dp) => [
                    dp.timestamp,
                    dp.value,
                    dp.auditId || 'N/A',
                  ]);
                  exportToCsv(headers, rows, `sitelook-trends-${trendResponse.domain}.csv`);
                }}
                className="rounded border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-2.5 py-1 text-[#4FD8C4] text-[11px] font-bold hover:bg-[#4FD8C4]/20 transition-all cursor-pointer"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportToJson(trendResponse, `sitelook-trends-${trendResponse.domain}.json`)}
                className="rounded border border-[#7AA2F7]/30 bg-[#7AA2F7]/10 px-2.5 py-1 text-[#7AA2F7] text-[11px] font-bold hover:bg-[#7AA2F7]/20 transition-all cursor-pointer"
              >
                Export JSON
              </button>
            </div>
          </div>

          {/* Executive Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                <div className="text-[#565D68] uppercase text-[10px]">Latest Metric</div>
                <div className="text-base font-bold text-[#E7EAEE]">
                  {summary.latest != null ? Math.round(summary.latest) : 'N/A'} {metric === 'responseTimeMs' ? 'ms' : ''}
                </div>
              </div>
              <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                <div className="text-[#565D68] uppercase text-[10px]">Average Baseline</div>
                <div className="text-base font-bold text-[#4FD8C4]">
                  {summary.average != null ? Math.round(summary.average) : 'N/A'} {metric === 'responseTimeMs' ? 'ms' : ''}
                </div>
              </div>
              <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                <div className="text-[#565D68] uppercase text-[10px]">Stability Index</div>
                <div className="text-base font-bold text-[#4ADE80] flex items-center gap-1">
                  <LightningIcon className="size-3.5 text-[#4ADE80]" />
                  <span>{anomalyAnalysis.stabilityIndex}%</span>
                </div>
              </div>
              <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                <div className="text-[#565D68] uppercase text-[10px]">Trend Movement</div>
                <div>{renderTrendBadge(summary.trend)}</div>
              </div>
            </div>
          )}

          {/* Smart Anomaly Digest Banner */}
          {dataPoints.length > 0 && (
            <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#262B33] pb-2 text-[#4FD8C4] font-bold">
                <div className="flex items-center gap-1.5">
                  <ShieldWarningIcon className="size-4 text-[#FBBF24]" />
                  <span>Smart Anomaly & Regression Digest</span>
                </div>
                <span className="text-[11px] text-[#8B93A1]">
                  {anomalyAnalysis.anomalies.length} Anomaly Event(s) Detected
                </span>
              </div>

              {anomalyAnalysis.anomalies.length === 0 ? (
                <div className="flex items-center gap-2 text-[#4ADE80] py-1 text-xs">
                  <CheckCircleIcon className="size-4 shrink-0" />
                  <span>No severe performance or score regression anomalies detected in the last {days} days. Domain metric is stable!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {anomalyAnalysis.anomalies.map((anom, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                        anom.severity === 'CRITICAL'
                          ? 'border-[#F87171]/40 bg-[#F87171]/10 text-[#F87171]'
                          : 'border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-bold">
                          <WarningIcon className="size-3.5 shrink-0" />
                          <span>{anom.severity} REGRESSION — {anom.date}</span>
                        </div>
                        <p className="text-xs font-sans text-[#E7EAEE]">{anom.reason}</p>
                      </div>

                      <div className="font-mono text-xs font-bold shrink-0">
                        {anom.previousValue} → {anom.value} ({anom.delta > 0 ? `+${anom.delta}` : anom.delta})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interactive SVG Area Chart / Timeline */}
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="size-4 text-[#4FD8C4]" />
                <span className="text-[#565D68] uppercase tracking-wider font-semibold">
                  Domain Historical Trajectory ({metric})
                </span>
              </div>
              <span className="text-[#4ADE80] font-bold text-xs">Target: {trendResponse.domain}</span>
            </div>

            {dataPoints.length === 0 ? (
              <div className="text-center py-10 text-[#565D68] space-y-2">
                <PulseIcon className="size-8 mx-auto text-[#565D68]" />
                <p className="italic">No saved report data found for domain "{trendResponse.domain}" in MongoDB Atlas within the last {days} days.</p>
                <p className="text-[11px] text-[#8B93A1] font-normal">Tip: Run audits for this URL and click "Save Report to Database" to build historical trend metrics.</p>
              </div>
            ) : viewMode === 'chart' && svgChart ? (
              <div className="space-y-3">
                {/* SVG Visual Graph Container */}
                <div className="relative bg-[#0A0C0F] border border-[#262B33] rounded-lg p-3 overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
                    className="w-full h-56 select-none"
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4FD8C4" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#4FD8C4" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0.25, 0.5, 0.75].map((factor, i) => {
                      const y = 25 + factor * (svgChart.height - 50);
                      return (
                        <line
                          key={i}
                          x1="40"
                          y1={y}
                          x2={svgChart.width - 40}
                          y2={y}
                          stroke="#262B33"
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* Area fill */}
                    <path d={svgChart.areaPath} fill="url(#areaGradient)" />

                    {/* Line stroke */}
                    <path
                      d={svgChart.linePath}
                      fill="none"
                      stroke="#4FD8C4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Data interactive points */}
                    {svgChart.points.map((pt, idx) => (
                      <g
                        key={idx}
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPointIndex === idx ? 6 : 3.5}
                          fill={hoveredPointIndex === idx ? '#4FD8C4' : '#12151A'}
                          stroke="#4FD8C4"
                          strokeWidth="2"
                          className="transition-all duration-150"
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Hover Tooltip Overlay */}
                  {hoveredPointIndex !== null && svgChart.points[hoveredPointIndex] && (
                    <div className="absolute top-4 right-4 bg-[#191D24] border border-[#4FD8C4]/60 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                      <div className="text-[10px] text-[#8B93A1]">
                        {svgChart.points[hoveredPointIndex].timestamp
                          ? new Date(svgChart.points[hoveredPointIndex].timestamp!).toLocaleString()
                          : `Scan #${hoveredPointIndex + 1}`}
                      </div>
                      <div className="font-bold text-[#4FD8C4] text-sm">
                        {Math.round(svgChart.points[hoveredPointIndex].value ?? 0)}{' '}
                        {metric === 'responseTimeMs' ? 'ms' : '/ 100'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#565D68] px-1">
                  <span>Start: {dataPoints[0]?.timestamp ? new Date(dataPoints[0].timestamp).toLocaleDateString() : 'Baseline'}</span>
                  <span>Hover over points to inspect metrics</span>
                  <span>End: {dataPoints[dataPoints.length - 1]?.timestamp ? new Date(dataPoints[dataPoints.length - 1].timestamp).toLocaleDateString() : 'Latest'}</span>
                </div>
              </div>
            ) : (
              /* Timeline List View */
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {dataPoints.map((dp, idx) => {
                  const formattedDate = dp.timestamp ? new Date(dp.timestamp).toLocaleString() : 'N/A';
                  const val = dp.value != null ? Math.round(dp.value) : 0;
                  const isMs = metric === 'responseTimeMs';
                  const maxRange = isMs ? 3000 : 100;
                  const barWidth = Math.min(100, Math.max(5, (val / maxRange) * 100));

                  const isAnomaly = anomalyAnalysis.anomalies.some((a) => a.date === formattedDate);

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#262B33]/50 hover:bg-[#191D24]/50 px-2.5 rounded transition-colors gap-2 ${
                        isAnomaly ? 'bg-[#F87171]/5 border-l-2 border-l-[#F87171]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[#8B93A1] text-xs font-mono">{formattedDate}</span>
                        {isAnomaly && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/40 uppercase">
                            ANOMALY
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-36 bg-[#0A0C0F] h-2 rounded-full overflow-hidden border border-[#262B33]">
                          <div
                            className={`h-full ${isAnomaly ? 'bg-[#F87171]' : isMs ? 'bg-[#FBBF24]' : 'bg-[#4FD8C4]'}`}
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
