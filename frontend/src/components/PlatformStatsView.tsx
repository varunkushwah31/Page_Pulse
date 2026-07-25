import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, Clock, Globe, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { PlatformStatsResponse } from '../types';
import { fetchPlatformStats } from '../lib/api';

export const PlatformStatsView: React.FC = () => {
  const [stats, setStats] = useState<PlatformStatsResponse | null>(null);

  useEffect(() => {
    fetchPlatformStats()
      .then(setStats)
      .catch(() => { });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Platform Analytics & Global Metrics</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time aggregate performance indicators across H2 transient scans and MongoDB Atlas storage.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
          <TrendingUp className="size-3.5" /> Live Insights
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/80 p-5 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Transient H2 Audits</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Activity className="size-4" />
            </div>
          </div>
          <span className="mt-3 block text-4xl font-black text-white">{stats?.totalTransientAuditsRun || 0}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Real-time scrapes</span>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 p-5 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">MongoDB Reports</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Database className="size-4" />
            </div>
          </div>
          <span className="mt-3 block text-4xl font-black text-white">{stats?.totalSavedReports || 0}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Persisted records</span>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 p-5 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Overall Score</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Server className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{stats?.averageOverallScore || 0}</span>
            <span className="text-xs font-bold text-slate-500">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Global domain average</span>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 p-5 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Latency</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="size-4" />
            </div>
          </div>
          <span className="mt-3 block text-4xl font-black text-white">{stats?.averageResponseTimeMs || 0} ms</span>
          <span className="text-[11px] text-slate-500 mt-1 block">DOM fetch speed</span>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 shadow-2xl">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe className="size-5 text-blue-400" />
              <CardTitle className="text-lg font-bold text-white">Top Audited Domains</CardTitle>
            </div>
            <span className="text-xs text-slate-500 font-medium">Ranked by inspection volume</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {Object.keys(stats?.topDomains || {}).length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No domain analytics recorded yet. Run audits to generate statistics.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(stats?.topDomains || {}).map(([domain, count]) => (
                <div key={domain} className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950 p-3.5 text-sm hover:border-slate-700 transition-all">
                  <span className="font-mono text-xs font-semibold text-slate-200">{domain}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-400 text-xs">{count} audit(s)</span>
                    <ArrowUpRight className="size-4 text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
