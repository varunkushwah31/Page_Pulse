import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SitemapAuditResponse, SitemapDeltaResponse } from '../types';
import { auditSitemap, fetchSitemapDelta } from '../lib/api';
import { exportToCsv, exportToJson } from '../lib/ExportUtils';
import {
  GitDiffIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  TrendDownIcon,
  TrendUpIcon,
  MagnifyingGlassIcon,
  ArrowsDownUpIcon,
  ArrowRightIcon,
  HardDrivesIcon
} from '@phosphor-icons/react';

type SortField = 'url' | 'httpStatus' | 'responseTimeMs' | 'score';
type SortOrder = 'asc' | 'desc';

export const SitemapConsole: React.FC = () => {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [maxUrls, setMaxUrls] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SitemapAuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [deltaLoading, setDeltaLoading] = useState(false);
  const [deltaResult, setDeltaResult] = useState<SitemapDeltaResponse | null>(null);
  const [deltaError, setDeltaError] = useState<string | null>(null);

  const navigate = useNavigate();

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sitemap crawling execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchDelta = async () => {
    const urlToFetch = sitemapUrl.trim() || (result ? result.sitemapUrl : '');
    if (!urlToFetch || deltaLoading) return;

    setDeltaLoading(true);
    setDeltaError(null);
    try {
      const delta = await fetchSitemapDelta(urlToFetch);
      setDeltaResult(delta);
    } catch (err: unknown) {
      setDeltaError(err instanceof Error ? err.message : 'Could not calculate sitemap crawl delta.');
    } finally {
      setDeltaLoading(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedAudits = useMemo(() => {
    if (!result?.childAudits) return [];
    let list = result.childAudits.filter((a) =>
      a.url.toLowerCase().includes(filterQuery.toLowerCase().trim())
    );

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'url') {
        comparison = a.url.localeCompare(b.url);
      } else if (sortField === 'httpStatus') {
        comparison = a.httpStatus - b.httpStatus;
      } else if (sortField === 'responseTimeMs') {
        comparison = a.responseTimeMs - b.responseTimeMs;
      } else if (sortField === 'score') {
        const scoreA = a.scores?.overallScore || 0;
        const scoreB = b.scores?.overallScore || 0;
        comparison = scoreA - scoreB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [result, filterQuery, sortField, sortOrder]);

  const presetSitemaps = [
    { name: 'Vercel', url: 'https://vercel.com/sitemap.xml' },
    { name: 'Shopify', url: 'https://www.shopify.com/sitemap.xml' },
    { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/sitemap.xml' },
    { name: 'Stripe', url: 'https://stripe.com/sitemap/sitemap.xml' },
  ];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Input Control Box */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#262B33] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-bold text-sm">$ sitemap</span>
            <span className="text-[#8B93A1] text-xs">— Virtual Threads Concurrent XML Scraper</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#565D68] text-[11px]">Presets:</span>
            {presetSitemaps.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setSitemapUrl(preset.url)}
                className="rounded border border-[#262B33] bg-[#0A0C0F] px-2 py-0.5 text-[10px] text-[#8B93A1] hover:text-[#4FD8C4] hover:border-[#4FD8C4]/40 transition-all cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8 flex items-center rounded-lg border border-[#333A45] bg-[#0A0C0F] px-3 py-1.5 focus-within:border-[#4FD8C4] transition-all">
            <span className="text-[#565D68] mr-2 text-xs">XML</span>
            <input
              type="text"
              placeholder="https://example.com/sitemap.xml"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              disabled={loading}
              className="w-full bg-transparent text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-[#333A45] bg-[#0A0C0F] px-3 py-2 text-xs text-[#8B93A1]">
              <span className="mr-2">Max:</span>
              <select
                value={maxUrls}
                onChange={(e) => setMaxUrls(Number(e.target.value))}
                disabled={loading}
                className="bg-transparent text-[#E7EAEE] focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-[#12151A]">5 URLs</option>
                <option value={10} className="bg-[#12151A]">10 URLs</option>
                <option value={25} className="bg-[#12151A]">25 URLs</option>
                <option value={50} className="bg-[#12151A]">50 URLs</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !sitemapUrl.trim()}
              className="flex-1 rounded-lg border border-[#333A45] bg-[#191D24] px-4 py-2.5 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer text-center"
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
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] cursor-blink" />
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
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden space-y-0 shadow-2xl">
          <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HardDrivesIcon className="size-4 text-[#4FD8C4]" />
              <span className="text-[#565D68] uppercase tracking-wider font-semibold">Sitemap Summary</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[#8B93A1]">
              <span>Audited: <strong className="text-[#E7EAEE]">{result.totalUrlsAudited} URLs</strong></span>
              <span>Avg Score: <strong className="text-[#4ADE80]">{result.averageOverallScore} / 100</strong></span>
              <button
                type="button"
                onClick={handleFetchDelta}
                disabled={deltaLoading}
                className="inline-flex items-center gap-1.5 rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-3 py-1 font-semibold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <GitDiffIcon className="size-3.5" />
                <span>{deltaLoading ? 'Comparing...' : 'View Delta Diff'}</span>
              </button>
            </div>
          </div>

          {/* Search, Filter & Column Sort Bar */}
          <div className="p-3 border-b border-[#262B33] bg-[#0A0C0F] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlassIcon className="size-3 text-[#565D68] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter sitemap URLs..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-[#12151A] border border-[#262B33] rounded pl-7 pr-2 py-1 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleSort('score')}
                className={`px-2 py-1 rounded border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  sortField === 'score'
                    ? 'border-[#4FD8C4] bg-[#4FD8C4]/10 text-[#4FD8C4]'
                    : 'border-[#262B33] bg-[#12151A] text-[#8B93A1]'
                }`}
              >
                <span>Score</span>
                <ArrowsDownUpIcon className="size-2.5" />
              </button>

              <button
                type="button"
                onClick={() => toggleSort('responseTimeMs')}
                className={`px-2 py-1 rounded border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  sortField === 'responseTimeMs'
                    ? 'border-[#4FD8C4] bg-[#4FD8C4]/10 text-[#4FD8C4]'
                    : 'border-[#262B33] bg-[#12151A] text-[#8B93A1]'
                }`}
              >
                <span>Latency</span>
                <ArrowsDownUpIcon className="size-2.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const headers = ['URL', 'HTTP Status', 'Latency (ms)', 'Overall Score', 'Health Grade'];
                  const rows = filteredAndSortedAudits.map((c) => [
                    c.url,
                    c.httpStatus,
                    c.responseTimeMs,
                    c.scores?.overallScore || 0,
                    c.scores?.healthGrade || 'N/A',
                  ]);
                  exportToCsv(headers, rows, 'pagepulse-sitemap-crawl-results.csv');
                }}
                className="rounded border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-2 py-1 text-[11px] font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => exportToJson(filteredAndSortedAudits, 'pagepulse-sitemap-crawl-results.json')}
                className="rounded border border-[#7AA2F7]/30 bg-[#7AA2F7]/10 px-2 py-1 text-[11px] font-bold text-[#7AA2F7] hover:bg-[#7AA2F7]/20 transition-all cursor-pointer"
              >
                JSON
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#262B33]">
            {filteredAndSortedAudits.map((child, idx) => (
              <div
                key={`${child.url}-${idx}`}
                className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-[#191D24]/50 transition-colors"
              >
                <div className="flex items-center gap-2 max-w-lg min-w-0">
                  <span className="text-[#565D68] text-[10px] w-6">#{idx + 1}</span>
                  <span className="text-[#E7EAEE] truncate text-xs">{child.url}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[#8B93A1]">{child.responseTimeMs} ms</span>
                  <span className="px-2 py-0.5 rounded border border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80] font-bold">
                    HTTP {child.httpStatus}
                  </span>
                  <span className="font-bold text-[#E7EAEE] w-20 text-right">
                    {child.scores?.overallScore} / 100
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/audit?url=${encodeURIComponent(child.url)}`)}
                    className="p-1 rounded text-[#8B93A1] hover:text-[#4FD8C4] hover:bg-[#191D24] transition-all cursor-pointer"
                    title="Run deep audit on this URL"
                  >
                    <ArrowRightIcon className="size-3.5" />
                  </button>
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
              <GitDiffIcon className="size-4 text-[#4FD8C4]" />
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
                <PlusCircleIcon className="size-3.5" />
                <span>Newly Added Pages ({deltaResult.newPages.length})</span>
              </div>
              <div className="bg-[#0A0C0F] rounded p-2.5 space-y-1 divide-y divide-[#191D24] max-h-40 overflow-y-auto">
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
                <MinusCircleIcon className="size-3.5" />
                <span>Removed Pages ({deltaResult.removedPages.length})</span>
              </div>
              <div className="bg-[#0A0C0F] rounded p-2.5 space-y-1 divide-y divide-[#191D24] max-h-40 overflow-y-auto">
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
                <TrendDownIcon className="size-3.5" />
                <span>Score Regressions ({deltaResult.scoreRegressions.length})</span>
              </div>
              <div className="bg-[#0A0C0F] rounded p-2.5 space-y-2 max-h-40 overflow-y-auto">
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
                <TrendUpIcon className="size-3.5" />
                <span>Score Improvements ({deltaResult.scoreImprovements.length})</span>
              </div>
              <div className="bg-[#0A0C0F] rounded p-2.5 space-y-2 max-h-40 overflow-y-auto">
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
