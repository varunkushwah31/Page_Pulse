import React, { useState } from 'react';
import type { SitemapAuditResponse } from '../types';
import { auditSitemap } from '../lib/api';

export const SitemapConsole: React.FC = () => {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [maxUrls, setMaxUrls] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SitemapAuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sitemapUrl.trim() || loading) return;

    setError(null);
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

  return (
    <div className="space-y-6">
      {/* Sitemap Terminal Prompt Bar */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 focus-within:ring-2 focus-within:ring-[#4FD8C4] focus-within:ring-offset-2 focus-within:ring-offset-[#0A0C0F]">
          <div className="flex items-center gap-1.5 pl-2 pr-1 font-mono text-xs text-[#565D68] select-none">
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
            <input
              type="number"
              min="1"
              max="50"
              value={maxUrls}
              onChange={(e) => setMaxUrls(parseInt(e.target.value) || 10)}
              disabled={loading}
              className="w-16 bg-[#191D24] border border-[#333A45] rounded px-2 py-2 font-mono text-xs text-[#E7EAEE] text-center focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !sitemapUrl.trim()}
              className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-mono text-xs font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer"
            >
              {loading ? 'Crawling...' : 'Run'}
            </button>
          </div>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 font-mono text-xs text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">CRAWL</span>
            <span className="text-[#E7EAEE] truncate">{sitemapUrl}</span>
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] animate-pulse"></span>
          </div>
          <p className="mt-2 text-[11px] text-[#565D68]">
            Processing sitemap index and auditing child URLs concurrently with Java Virtual Threads...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 font-mono text-xs text-[#F87171]">
          <span className="font-semibold uppercase tracking-wider text-[11px]">Sitemap Error: </span>
          <span className="font-sans text-[#E7EAEE]">{error}</span>
        </div>
      )}

      {/* Audit Results Container */}
      {result && !loading && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden space-y-0">
          <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex items-center justify-between font-mono text-xs">
            <span className="text-[#565D68] uppercase tracking-wider font-semibold">Sitemap Summary</span>
            <div className="flex items-center gap-4 text-[#8B93A1]">
              <span>Audited: <strong className="text-[#E7EAEE]">{result.totalUrlsAudited} URLs</strong></span>
              <span>Avg Score: <strong className="text-[#4ADE80]">{result.averageOverallScore} / 100</strong></span>
            </div>
          </div>

          <div className="divide-y divide-[#262B33]">
            {result.childAudits?.map((child, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono text-xs">
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
    </div>
  );
};
