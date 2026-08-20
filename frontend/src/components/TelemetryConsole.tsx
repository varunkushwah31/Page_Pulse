import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlatformStatsResponse } from '../types';
import { fetchPlatformStats } from '../lib/api';
import {
  PulseIcon,
  DatabaseIcon,
  HardDrivesIcon,
  ClockIcon,
  GlobeIcon,
  ArrowRightIcon,
  TrendUpIcon,
  ArrowsClockwiseIcon,
  HardDriveIcon,
  CpuIcon
} from '@phosphor-icons/react';

export const TelemetryConsole: React.FC = () => {
  const [stats, setStats] = useState<PlatformStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    fetchPlatformStats()
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalAudits = (stats?.totalTransientAuditsRun || 0) + (stats?.totalSavedReports || 0);
  const h2Percent = totalAudits > 0 ? Math.round(((stats?.totalTransientAuditsRun || 0) / totalAudits) * 100) : 50;
  const mongoPercent = totalAudits > 0 ? 100 - h2Percent : 50;

  const topDomainsList = Object.entries(stats?.topDomains || {});
  const maxDomainCount = Math.max(...topDomainsList.map(([, c]) => c), 1);

  return (
    <div className="space-y-6 font-mono text-xs text-[#E7EAEE]">
      {/* Telemetry Header Bar */}
      <div className="rounded-xl border border-[#333A45] bg-[#12151A] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2">
          <PulseIcon className="size-4 text-[#4FD8C4]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#E7EAEE] font-semibold">stats --live --telemetry</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#4ADE80]">
            <span className="inline-block size-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="font-semibold">TELEMETRY STREAM ACTIVE</span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1 text-[#8B93A1] hover:text-[#E7EAEE] border border-[#262B33] bg-[#0A0C0F] px-2 py-1 rounded cursor-pointer transition-all disabled:opacity-50"
            title="Refresh statistics"
          >
            <ArrowsClockwiseIcon className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4-Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 card-hover">
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span className="uppercase tracking-wider font-semibold">H2 Transient Scans</span>
            <CpuIcon className="size-4 text-[#7AA2F7]" />
          </div>
          <div className="text-3xl font-extrabold text-[#E7EAEE]">
            {loading ? <span className="skeleton inline-block w-16 h-8" /> : stats?.totalTransientAuditsRun || 0}
          </div>
          <div className="text-[10px] text-[#565D68]">In-Memory Real-Time Cache</div>
        </div>

        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 card-hover">
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span className="uppercase tracking-wider font-semibold">MongoDB Atlas Docs</span>
            <DatabaseIcon className="size-4 text-[#4ADE80]" />
          </div>
          <div className="text-3xl font-extrabold text-[#4ADE80]">
            {loading ? <span className="skeleton inline-block w-16 h-8" /> : stats?.totalSavedReports || 0}
          </div>
          <div className="text-[10px] text-[#565D68]">Cloud Persisted Reports</div>
        </div>

        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 card-hover">
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span className="uppercase tracking-wider font-semibold">Avg Global Score</span>
            <HardDrivesIcon className="size-4 text-[#4FD8C4]" />
          </div>
          <div className="text-3xl font-extrabold text-[#4FD8C4] flex items-baseline gap-1">
            {loading ? <span className="skeleton inline-block w-16 h-8" /> : Math.round(stats?.averageOverallScore || 0)}
            <span className="text-xs text-[#565D68] font-normal">/ 100</span>
          </div>
          <div className="text-[10px] text-[#565D68]">Across all audited endpoints</div>
        </div>

        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 card-hover">
          <div className="flex items-center justify-between text-[#8B93A1] text-[11px]">
            <span className="uppercase tracking-wider font-semibold">Avg DOM Latency</span>
            <ClockIcon className="size-4 text-[#FBBF24]" />
          </div>
          <div className="text-3xl font-extrabold text-[#FBBF24] flex items-baseline gap-1">
            {loading ? <span className="skeleton inline-block w-16 h-8" /> : Math.round(stats?.averageResponseTimeMs || 0)}
            <span className="text-xs text-[#565D68] font-normal">ms</span>
          </div>
          <div className="text-[10px] text-[#565D68]">Network fetch & parse duration</div>
        </div>
      </div>

      {/* Dual Database Storage Ratio Meter */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
          <div className="flex items-center gap-2">
            <HardDriveIcon className="size-4 text-[#4FD8C4]" />
            <span className="font-bold text-[#E7EAEE]">Dual-Database Architecture Distribution</span>
          </div>
          <span className="text-[11px] text-[#8B93A1]">
            Total Volume: <strong className="text-[#E7EAEE]">{totalAudits}</strong> records
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="w-full h-3 bg-[#0A0C0F] rounded-full overflow-hidden flex border border-[#262B33]">
            <div
              className="h-full bg-[#7AA2F7] transition-all duration-500"
              style={{ width: `${h2Percent}%` }}
              title={`H2 In-Memory: ${h2Percent}%`}
            />
            <div
              className="h-full bg-[#4ADE80] transition-all duration-500"
              style={{ width: `${mongoPercent}%` }}
              title={`MongoDB Atlas: ${mongoPercent}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#7AA2F7]" />
              <span className="text-[#8B93A1]">H2 Transient Cache: <strong className="text-[#E7EAEE]">{h2Percent}%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#4ADE80]" />
              <span className="text-[#8B93A1]">MongoDB Atlas Cloud: <strong className="text-[#E7EAEE]">{mongoPercent}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Audited Domains Table with Proportional Meters & Actions */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
        <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GlobeIcon className="size-4 text-[#4FD8C4]" />
            <span className="font-bold text-[#E7EAEE] uppercase tracking-wider">
              Top Audited Domains ({topDomainsList.length})
            </span>
          </div>
          <span className="text-[11px] text-[#565D68]">Ranked by scan volume</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#8B93A1] space-y-2">
            <div className="skeleton h-6 w-3/4 mx-auto" />
            <div className="skeleton h-6 w-2/3 mx-auto" />
            <div className="skeleton h-6 w-1/2 mx-auto" />
          </div>
        ) : topDomainsList.length === 0 ? (
          <div className="p-8 text-center text-[#565D68]">
            <PulseIcon className="size-6 mx-auto mb-2 text-[#565D68]" />
            <p>No domain audit statistics recorded yet.</p>
            <p className="text-[11px] text-[#8B93A1] mt-1">
              Run audits on any target URL to build domain telemetry.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#262B33]">
            {topDomainsList.map(([domain, count], idx) => {
              const barWidth = Math.min(100, Math.max(8, (count / maxDomainCount) * 100));
              return (
                <div
                  key={domain}
                  className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#191D24]/60 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-[#565D68] text-[11px] font-bold w-5">
                      #{idx + 1}
                    </span>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#E7EAEE] font-bold truncate text-xs">
                          {domain}
                        </span>
                        <span className="text-[10px] text-[#4FD8C4] bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 px-1.5 py-0.2 rounded font-bold">
                          {count} audit{count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="w-full max-w-md bg-[#0A0C0F] h-1.5 rounded-full overflow-hidden border border-[#262B33]">
                        <div
                          className="h-full bg-[#4FD8C4] transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/trend?domain=${encodeURIComponent(domain)}`)}
                      className="rounded border border-[#262B33] bg-[#0A0C0F] px-2.5 py-1 text-[11px] text-[#8B93A1] hover:text-[#4FD8C4] hover:border-[#4FD8C4]/40 transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <TrendUpIcon className="size-3" />
                      <span>Trends</span>
                    </button>
                    <button
                      onClick={() => navigate(`/audit?url=${encodeURIComponent(`https://${domain}`)}`)}
                      type='button'
                      className="rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-2.5 py-1 text-[11px] font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Re-Audit</span>
                      <ArrowRightIcon className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
