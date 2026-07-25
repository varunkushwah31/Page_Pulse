import React, { useState } from 'react';
import type { AuditResponse } from '../types';
import { runFullAudit } from '../lib/api';

export const BatchAuditorConsole: React.FC = () => {
  const [urlListText, setUrlListText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AuditResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleBatchAudit = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    const urls = urlListText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0 || loading) return;

    setError(null);
    setLoading(true);
    setResults([]);

    try {
      const auditPromises = urls.slice(0, 10).map((u) => runFullAudit(u).catch(() => null));
      const res = await Promise.all(auditPromises);
      const validResults = res.filter((r): r is AuditResponse => r !== null);
      setResults(validResults);
      if (validResults.length === 0) {
        setError('All batch audit attempts failed or returned malformed payloads.');
      }
    } catch (err: any) {
      setError(err.message || 'Batch audit processing encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const avgScore = results.length
    ? Math.round(results.reduce((acc, curr) => acc + (curr.scores?.overallScore || 0), 0) / results.length)
    : 0;

  const avgLatency = results.length
    ? Math.round(results.reduce((acc, curr) => acc + (curr.responseTimeMs || 0), 0) / results.length)
    : 0;

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Batch Input Form */}
      <form onSubmit={handleBatchAudit} className="space-y-4 rounded-xl border border-[#262B33] bg-[#12151A] p-5">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3 text-[#565D68]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#E7EAEE] font-semibold">batch --urls</span>
          </div>
          <span className="text-[11px] text-[#4FD8C4]">Multi-URL Parallel Engine</span>
        </div>

        <textarea
          rows={5}
          placeholder="Enter one target URL per line...&#10;https://example.com&#10;https://google.com"
          value={urlListText}
          onChange={(e) => setUrlListText(e.target.value)}
          disabled={loading}
          className="w-full rounded border border-[#333A45] bg-[#191D24] p-3 font-mono text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:ring-1 focus:ring-[#4FD8C4] disabled:opacity-50"
        />

        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-[#8B93A1]">
            Line count:{' '}
            <strong className="text-[#E7EAEE]">
              {urlListText.split('\n').filter((u) => u.trim()).length}
            </strong>
          </span>

          <button
            type="submit"
            disabled={loading || !urlListText.trim()}
            className="rounded border border-[#333A45] bg-[#191D24] px-5 py-2 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer"
          >
            {loading ? 'Auditing Batch...' : 'Run Batch Audit'}
          </button>
        </div>
      </form>

      {/* Loading Indicator */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 font-mono text-xs text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">PROCESSING</span>
            <span>Batch URLs concurrently with Spring Boot Virtual Threads...</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 font-mono text-xs text-[#F87171]">
          {error}
        </div>
      )}

      {/* Results Summary */}
      {results.length > 0 && !loading && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden space-y-0 font-mono text-xs">
          <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex items-center justify-between">
            <span className="text-[#565D68] uppercase tracking-wider font-semibold">Batch Audit Summary</span>
            <div className="flex items-center gap-4 text-[#8B93A1]">
              <span>Audited: <strong className="text-[#E7EAEE]">{results.length} URLs</strong></span>
              <span>Avg Latency: <strong className="text-[#FBBF24]">{avgLatency} ms</strong></span>
              <span>Avg Score: <strong className="text-[#4ADE80]">{avgScore} / 100</strong></span>
            </div>
          </div>

          <div className="divide-y divide-[#262B33]">
            {results.map((r, idx) => (
              <div key={(r as any).id ?? `${r.url}-${idx}`} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-[#E7EAEE] break-all max-w-sm">{r.url}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[#8B93A1]">{r.responseTimeMs} ms</span>
                  <span className="px-2 py-0.5 rounded border border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80] font-bold">
                    HTTP {r.httpStatus}
                  </span>
                  <span className="font-bold text-[#E7EAEE]">
                    {r.scores?.overallScore || 0} / 100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
