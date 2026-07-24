import React, { useEffect, useState } from 'react';
import type { PlatformStatsResponse } from '../types';
import { fetchPlatformStats } from '../lib/api';

export const TelemetryConsole: React.FC = () => {
  const [stats, setStats] = useState<PlatformStatsResponse | null>(null);

  useEffect(() => {
    fetchPlatformStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#333A45] bg-[#12151A] p-3 font-mono text-xs text-[#565D68] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[#4FD8C4] font-bold">$</span>
          <span className="text-[#E7EAEE] font-semibold">stats --live</span>
        </div>
        <span className="text-[11px] text-[#4FD8C4]">Telemetry Feed Active</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4">
          <span className="text-xs text-[#565D68] uppercase tracking-wider">Transient H2 Audits</span>
          <div className="text-3xl font-bold text-[#E7EAEE] mt-1">{stats?.totalTransientAuditsRun || 0}</div>
        </div>

        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4">
          <span className="text-xs text-[#565D68] uppercase tracking-wider">MongoDB Persisted Reports</span>
          <div className="text-3xl font-bold text-[#4ADE80] mt-1">{stats?.totalSavedReports || 0}</div>
        </div>

        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4">
          <span className="text-xs text-[#565D68] uppercase tracking-wider">Average Platform Score</span>
          <div className="text-3xl font-bold text-[#4FD8C4] mt-1">{stats?.averageOverallScore || 0} / 100</div>
        </div>

        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4">
          <span className="text-xs text-[#565D68] uppercase tracking-wider">Average Network Latency</span>
          <div className="text-3xl font-bold text-[#FBBF24] mt-1">{stats?.averageResponseTimeMs || 0} ms</div>
        </div>
      </div>

      <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden">
        <div className="bg-[#191D24] p-4 border-b border-[#262B33] font-mono text-xs text-[#565D68] uppercase tracking-wider font-semibold">
          Top Audited Domains
        </div>
        <div className="divide-y divide-[#262B33] p-4 space-y-2">
          {Object.entries(stats?.topDomains || {}).map(([domain, count]) => (
            <div key={domain} className="flex items-center justify-between font-mono text-xs py-1">
              <span className="text-[#E7EAEE]">{domain}</span>
              <span className="text-[#4FD8C4] font-semibold">{count} audit(s)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
