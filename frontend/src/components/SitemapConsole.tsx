import React, { useState } from 'react';
import type { SitemapAuditResponse, SitemapDeltaResponse } from '../types';
import { auditSitemap, fetchSitemapDelta } from '../lib/api';
import { GitCompare, PlusCircle, MinusCircle, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';

export const SitemapConsole: React.FC = () => {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [maxUrls, setMaxUrls] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SitemapAuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [deltaLoading, setDeltaLoading] = useState(false);
  const [deltaResult, setDeltaResult] = useState<SitemapDeltaResponse | null>(null);
  const [deltaError, setDeltaError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sitemapUrl.trim() || loading) return;

    setError(null);
    setDeltaResult(null);
    setDeltaError(null);
    setLoading(true);
    try {
      const res = await auditSitemap(sitemapUrl.trim(), maxUrls);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Sitemap crawling execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchDelta = async () => {
    const urlToFetch = sitemapUrl.trim() || (result ? result.sitemapUrl : '');
    if (!urlToFetch || deltaLoading) return;

    setDeltaError(null);
    setDeltaLoading(true);
    try {
      const delta = await fetchSitemapDelta(urlToFetch);
      setDeltaResult(delta);
    } catch (err: any) {
      setDeltaError(err.message || 'No previous sitemap crawl snapshot available for delta diff calculation.');
    } finally {
      setDeltaLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Sitemap Terminal Prompt Bar */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 focus-within:ring-2 focus-within:ring-[#4FD8C4] focus-within:ring-offset-2 focus-within:ring-offset-[#0A0C0F]">
          <div className="flex items-center gap-1.5 pl-2 pr-1 text-[#565D68] select-none">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#8B93A1]">sitemap</span>
          </div>

          <input
            type="text"
            placeholder="https://example.com/sitemap.xml"
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent px-2.5 py-2 font-mono text-sm text-[#E7EAEE] placeholder-[#565D68] focus:outline-none disabled:opacity-50"
          />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#191D24] border border-[#333A45] rounded px-2 py-1">
              <span className="text-[#565D68] text-[10px] uppercase font-semibold">MAX:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={maxUrls}
                onChange={(e) => setMaxUrls(Number.parseInt(e.target.value, 10) || 10)}
                disabled={loading}
                className="w-10 bg-transparent text-[#E7EAEE] font-bold text-center focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !sitemapUrl.trim()}
              className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer"
            >
              {loading ? 'Crawling...' : 'Run Audit'}
            </button>
          </div>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">CRAWL</span>
            <span className="text-[#E7EAEE] truncate">{sitemapUrl}</span>
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] cursor-blink"></span>
          </div>
          <p className="mt-2 text-[11px] text-[#565D68]">
            Processing sitemap index and auditing child URLs concurrently with Java Virtual Threads...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 text-[#F87171]">
          <span className="font-semibold uppercase tracking-wider text-[11px]">Sitemap Error: </span>
          <span className="font-sans text-[#E7EAEE]">{error}</span>
        </div>
      )}

      {/* Audit Results Container */}
      {result && !loading && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden space-y-0">
          <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex flex-wrap items-center justify-between gap-3">
            <span className="text-[#565D68] uppercase tracking-wider font-semibold">Sitemap Summary</span>
            <div className="flex items-center gap-4 text-[#8B93A1]">
              <span>Audited: <strong className="text-[#E7EAEE]">{result.totalUrlsAudited} URLs</strong></span>
              <span>Avg Score: <strong className="text-[#4ADE80]">{result.averageOverallScore} / 100</strong></span>
              <button
                onClick={handleFetchDelta}
                disabled={deltaLoading}
                className="inline-flex items-center gap-1.5 rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-3 py-1 font-semibold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <GitCompare className="size-3.5" />
                <span>{deltaLoading ? 'Comparing...' : 'View Delta Diff'}</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#262B33]">
            {result.childAudits?.map((child, idx) => (
              <div key={(child as any).id ?? `${child.url}-${idx}`} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-[#E7EAEE] break-all max-w-sm">{child.url}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[#8B93A1]">{child.responseTimeMs} ms</span>
                  <span className="px-2 py-0.5 rounded border border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80] font-bold">
                    HTTP {child.httpStatus}
                  </span>
                  <span className="font-bold text-[#E7EAEE]">
                    {child.scores?.overallScore} / 100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delta Diff Error Banner */}
      {deltaError && (
        <div className="rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/10 p-4 text-[#FBBF24]">
          ⚠️ {deltaError}
        </div>
      )}

      {/* Sitemap Delta & Diff Panel */}
      {deltaResult && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#262B33] pb-3 text-[#8B93A1]">
            <div className="flex items-center gap-2">
              <GitCompare className="size-4 text-[#4FD8C4]" />
              <span className="font-bold text-[#E7EAEE] text-sm">Sitemap Crawl Delta Diff</span>
            </div>
            <span className="text-[11px] text-[#565D68]">
              {deltaResult.previousCrawlTimestamp
                ? `Compared with previous snapshot from ${new Date(deltaResult.previousCrawlTimestamp).toLocaleString()}`
                : 'Initial snapshot recorded (no previous crawl found)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-3 text-center">
              <span className="text-[10px] text-[#8B93A1] uppercase font-semibold">New Pages</span>
              <div className="text-xl font-bold text-[#4ADE80]">{deltaResult.newPages.length}</div>
            </div>
            <div className="rounded-lg border border-[#F87171]/30 bg-[#F87171]/10 p-3 text-center">
              <span className="text-[10px] text-[#8B93A1] uppercase font-semibold">Removed Pages</span>
              <div className="text-xl font-bold text-[#F87171]">{deltaResult.removedPages.length}</div>
            </div>
            <div className="rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/10 p-3 text-center">
              <span className="text-[10px] text-[#8B93A1] uppercase font-semibold">Regressions</span>
              <div className="text-xl font-bold text-[#FBBF24]">{deltaResult.scoreRegressions.length}</div>
            </div>
            <div className="rounded-lg border border-[#7AA2F7]/30 bg-[#7AA2F7]/10 p-3 text-center">
              <span className="text-[10px] text-[#8B93A1] uppercase font-semibold">Improvements</span>
              <div className="text-xl font-bold text-[#7AA2F7]">{deltaResult.scoreImprovements.length}</div>
            </div>
          </div>

          {/* New Pages List */}
          {deltaResult.newPages.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#4ADE80] font-semibold text-[11px]">
                <PlusCircle className="size-3.5" />
                <span>Newly Added Pages ({deltaResult.newPages.length})</span>
              </div>
              <div className="bg-[#0A0C0F] rounded p-2.5 space-y-1 divide-y divide-[#191D24]">
                {deltaResult.newPages.map((url) => (
                  <div key={url} className="pt-1 text-[#E7EAEE] truncate">{url}</div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Pages List */}
          {deltaResult.removedPages.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#F87171] font-semibold text-[11px]">
                <MinusCircle className="size-3.5" />
                <span>Removed Pages ({deltaResult.removedPages.length})</span>
              </div>
              <div className="bg-[#0A0C0F] rounded p-2.5 space-y-1 divide-y divide-[#191D24]">
                {deltaResult.removedPages.map((url) => (
                  <div key={url} className="pt-1 text-[#8B93A1] line-through truncate">{url}</div>
                ))}
              </div>
            </div>
          )}

          {/* Score Regressions */}
          {deltaResult.scoreRegressions.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#FBBF24] font-semibold text-[11px]">
                <TrendingDown className="size-3.5" />
                <span>Score Regressions ({deltaResult.scoreRegressions.length})</span>
              </div>
              <div className="bg-[#0A0C0F] rounded p-2.5 space-y-2">
                {deltaResult.scoreRegressions.map((reg) => (
                  <div key={reg.url} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#E7EAEE] truncate max-w-xs">{reg.url}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#8B93A1]">{reg.previousScore} → <strong className="text-[#F87171]">{reg.currentScore}</strong></span>
                      <span className="px-1.5 py-0.5 rounded bg-[#F87171]/10 text-[#F87171] font-bold">-{reg.scoreDrop} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score Improvements */}
          {deltaResult.scoreImprovements.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#7AA2F7] font-semibold text-[11px]">
                <TrendingUp className="size-3.5" />
                <span>Score Improvements ({deltaResult.scoreImprovements.length})</span>
              </div>
              <div className="bg-[#0A0C0F] rounded p-2.5 space-y-2">
                {deltaResult.scoreImprovements.map((imp) => (
                  <div key={imp.url} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#E7EAEE] truncate max-w-xs">{imp.url}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#8B93A1]">{imp.previousScore} → <strong className="text-[#4ADE80]">{imp.currentScore}</strong></span>
                      <span className="px-1.5 py-0.5 rounded bg-[#4ADE80]/10 text-[#4ADE80] font-bold">+{imp.scoreGain} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
