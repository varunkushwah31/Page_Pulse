import React, { useState } from 'react';
import type { AuditResponse } from '../types';
import { runFullAudit } from '../lib/api';

export const CompetitorConsole: React.FC = () => {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [loading, setLoading] = useState(false);
  const [audit1, setAudit1] = useState<AuditResponse | null>(null);
  const [audit2, setAudit2] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url1.trim() || !url2.trim() || loading) return;

    setError(null);
    setLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        runFullAudit(url1.trim()),
        runFullAudit(url2.trim()),
      ]);
      setAudit1(res1);
      setAudit2(res2);
    } catch (err: any) {
      setError(err.message || 'Competitor comparison scan failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Terminal Prompt Bar for Compare */}
      <form onSubmit={handleCompare} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 focus-within:ring-2 focus-within:ring-[#4FD8C4] focus-within:ring-offset-2 focus-within:ring-offset-[#0A0C0F]">
          <div className="flex items-center gap-1.5 pl-2 pr-1 font-mono text-xs text-[#565D68] select-none">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#8B93A1]">compare</span>
          </div>

          <input
            type="text"
            placeholder="URL A (e.g. https://siteA.com)"
            value={url1}
            onChange={(e) => setUrl1(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent px-2.5 py-1.5 font-mono text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none"
          />

          <span className="font-mono text-xs text-[#565D68] text-center">vs</span>

          <input
            type="text"
            placeholder="URL B (e.g. https://siteB.com)"
            value={url2}
            onChange={(e) => setUrl2(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent px-2.5 py-1.5 font-mono text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading || !url1.trim() || !url2.trim()}
            className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-mono text-xs font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer"
          >
            {loading ? 'Comparing...' : 'Run'}
          </button>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 font-mono text-xs text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">COMPARE</span>
            <span className="text-[#E7EAEE]">{url1} vs {url2}</span>
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] animate-pulse"></span>
          </div>
          <p className="mt-2 text-[11px] text-[#565D68]">
            Executing parallel DOM scrapers and evaluating comparative metrics...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 font-mono text-xs text-[#F87171]">
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Matrix */}
      {audit1 && audit2 && !loading && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden font-mono text-xs">
          <div className="bg-[#191D24] p-4 border-b border-[#262B33] font-semibold text-[#565D68] uppercase tracking-wider">
            Side-by-Side Diagnostic Matrix
          </div>

          <div className="divide-y divide-[#262B33]">
            {/* Headers */}
            <div className="p-4 grid grid-cols-3 text-center bg-[#0A0C0F] text-[#8B93A1] font-bold">
              <div>Metric</div>
              <div className="truncate px-2 text-[#4FD8C4]">{audit1.domain || 'Site A'}</div>
              <div className="truncate px-2 text-[#7AA2F7]">{audit2.domain || 'Site B'}</div>
            </div>

            {/* Overall Score */}
            <div className="p-4 grid grid-cols-3 text-center items-center">
              <div className="text-[#565D68] uppercase tracking-wider font-semibold">Overall Score</div>
              <div className="text-lg font-bold text-[#4ADE80]">{audit1.scores?.overallScore || 0} / 100</div>
              <div className="text-lg font-bold text-[#4ADE80]">{audit2.scores?.overallScore || 0} / 100</div>
            </div>

            {/* Latency */}
            <div className="p-4 grid grid-cols-3 text-center items-center">
              <div className="text-[#565D68] uppercase tracking-wider font-semibold">Latency (ms)</div>
              <div className="text-[#E7EAEE]">{audit1.responseTimeMs} ms</div>
              <div className="text-[#E7EAEE]">{audit2.responseTimeMs} ms</div>
            </div>

            {/* Word Count */}
            <div className="p-4 grid grid-cols-3 text-center items-center">
              <div className="text-[#565D68] uppercase tracking-wider font-semibold">Word Count</div>
              <div className="text-[#E7EAEE]">{audit1.contentMetrics?.wordCount || 0}</div>
              <div className="text-[#E7EAEE]">{audit2.contentMetrics?.wordCount || 0}</div>
            </div>

            {/* Missing Alt Images */}
            <div className="p-4 grid grid-cols-3 text-center items-center">
              <div className="text-[#565D68] uppercase tracking-wider font-semibold">Missing Alt Tags</div>
              <div className="text-[#E7EAEE]">{audit1.accessibilityMetrics?.imagesMissingAltCount || 0}</div>
              <div className="text-[#E7EAEE]">{audit2.accessibilityMetrics?.imagesMissingAltCount || 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
