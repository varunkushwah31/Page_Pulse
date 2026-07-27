import React, { useState } from 'react';
import type { AuditResponse, HealthGrade } from '../types';
import { runFullAudit, downloadPdfReport, saveReportToMongo } from '../lib/api';
import { ChevronDown, ChevronUp, Download, BookmarkPlus, Check, ExternalLink, Loader2, Sparkles } from 'lucide-react';

export const BatchAuditorConsole: React.FC = () => {
  const [urlListText, setUrlListText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AuditResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [savedMap, setSavedMap] = useState<Record<number, string>>({});
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [downloadingPdfMap, setDownloadingPdfMap] = useState<Record<number, boolean>>({});

  const handleBatchAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = urlListText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0 || loading) return;

    setError(null);
    setLoading(true);
    setResults([]);
    setExpandedIndices(new Set());
    setSavedMap({});

    try {
      const auditPromises = urls.slice(0, 10).map((u) => runFullAudit(u).catch(() => null));
      const res = await Promise.all(auditPromises);
      const validResults = res.filter((r): r is AuditResponse => r !== null);
      setResults(validResults);
      if (validResults.length === 0) {
        setError('All batch audit attempts failed or returned malformed payloads.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Batch audit processing encountered an error.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedIndices.size === results.length) {
      setExpandedIndices(new Set());
    } else {
      setExpandedIndices(new Set(results.map((_, i) => i)));
    }
  };

  const handleSaveReport = async (audit: AuditResponse, idx: number) => {
    setSavingMap((prev) => ({ ...prev, [idx]: true }));
    try {
      const doc = await saveReportToMongo(audit.id);
      setSavedMap((prev) => ({ ...prev, [idx]: doc.id }));
    } catch (err) {
      console.error('Failed to save batch report:', err);
    } finally {
      setSavingMap((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handlePdfDownload = async (audit: AuditResponse, idx: number) => {
    const reportId = savedMap[idx] || audit.id.toString();
    setDownloadingPdfMap((prev) => ({ ...prev, [idx]: true }));
    try {
      await downloadPdfReport(reportId);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloadingPdfMap((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const getGradeBadge = (grade?: HealthGrade) => {
    switch (grade) {
      case 'EXCELLENT':
        return <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-emerald-400 font-bold">EXCELLENT</span>;
      case 'GOOD':
        return <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-blue-400 font-bold">GOOD</span>;
      case 'NEEDS_IMPROVEMENT':
        return <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-amber-400 font-bold">NEEDS IMPROVEMENT</span>;
      case 'POOR':
        return <span className="rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-rose-400 font-bold">POOR</span>;
      default:
        return null;
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
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] animate-pulse"></span>
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
          <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[#565D68] uppercase tracking-wider font-semibold">Batch Audit Summary</span>
              <button
                onClick={toggleExpandAll}
                className="rounded border border-[#333A45] bg-[#12151A] px-2.5 py-1 text-[11px] text-[#4FD8C4] hover:bg-[#262B33] transition-all cursor-pointer"
              >
                {expandedIndices.size === results.length ? 'Collapse All' : 'Expand All Summaries'}
              </button>
            </div>

            <div className="flex items-center gap-4 text-[#8B93A1]">
              <span>Audited: <strong className="text-[#E7EAEE]">{results.length} URLs</strong></span>
              <span>Avg Latency: <strong className="text-[#FBBF24]">{avgLatency} ms</strong></span>
              <span>Avg Score: <strong className="text-[#4ADE80]">{avgScore} / 100</strong></span>
            </div>
          </div>

          <div className="divide-y divide-[#262B33]">
            {results.map((r, idx) => {
              const isExpanded = expandedIndices.has(idx);
              const scores = r.scores || { seoScore: 0, contentScore: 0, accessibilityScore: 0, performanceScore: 0, overallScore: 0 };
              const seo = r.seoMetrics || {};
              const content = r.contentMetrics || {};
              const accessibility = r.accessibilityMetrics || {};
              const isSaved = !!savedMap[idx];
              const isSaving = !!savingMap[idx];
              const isDownloadingPdf = !!downloadingPdfMap[idx];

              return (
                <div key={r.id ?? `${r.url}-${idx}`} className="transition-colors">
                  {/* Summary Bar Row */}
                  <div
                    onClick={() => toggleExpand(idx)}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#191D24]/50 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 max-w-lg truncate">
                      <span className="text-[#4FD8C4] shrink-0">
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </span>
                      <span className="text-[#E7EAEE] font-semibold truncate">{r.url}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[#8B93A1]">{r.responseTimeMs} ms</span>
                      <span className="px-2 py-0.5 rounded border border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80] font-bold">
                        HTTP {r.httpStatus}
                      </span>
                      <span className="font-bold text-[#E7EAEE] w-20 text-right">
                        {scores.overallScore || 0} / 100
                      </span>
                      <span className="text-[#4FD8C4] text-[11px] hover:underline ml-1">
                        {isExpanded ? 'Hide Details' : 'Expand Details'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Detailed Summary Panel */}
                  {isExpanded && (
                    <div className="bg-[#0A0C0F] p-5 border-t border-b border-[#262B33]/80 space-y-4">
                      {/* Sub-Scores Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#8B93A1] uppercase tracking-wider font-semibold text-[10px]">
                            Audit Sub-Score Breakdown
                          </span>
                          {getGradeBadge(scores.healthGrade)}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1.5">
                            <div className="flex justify-between text-[#8B93A1]">
                              <span>SEO</span>
                              <strong className="text-[#E7EAEE]">{scores.seoScore} / 100</strong>
                            </div>
                            <div className="w-full bg-[#191D24] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#4FD8C4] h-full" style={{ width: `${scores.seoScore}%` }}></div>
                            </div>
                          </div>

                          <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1.5">
                            <div className="flex justify-between text-[#8B93A1]">
                              <span>Content</span>
                              <strong className="text-[#E7EAEE]">{scores.contentScore} / 100</strong>
                            </div>
                            <div className="w-full bg-[#191D24] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-400 h-full" style={{ width: `${scores.contentScore}%` }}></div>
                            </div>
                          </div>

                          <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1.5">
                            <div className="flex justify-between text-[#8B93A1]">
                              <span>Accessibility</span>
                              <strong className="text-[#E7EAEE]">{scores.accessibilityScore} / 100</strong>
                            </div>
                            <div className="w-full bg-[#191D24] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-purple-400 h-full" style={{ width: `${scores.accessibilityScore}%` }}></div>
                            </div>
                          </div>

                          <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1.5">
                            <div className="flex justify-between text-[#8B93A1]">
                              <span>Performance</span>
                              <strong className="text-[#E7EAEE]">{scores.performanceScore} / 100</strong>
                            </div>
                            <div className="w-full bg-[#191D24] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-400 h-full" style={{ width: `${scores.performanceScore}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed DOM & Scraping Metrics Grid */}
                      <div>
                        <span className="text-[#8B93A1] uppercase tracking-wider font-semibold text-[10px] block mb-2">
                          DOM & Content Inspection
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-[#262B33] bg-[#12151A] p-3 text-[11px]">
                          <div>
                            <span className="text-[#565D68]">Page Title: </span>
                            <span className="text-[#E7EAEE]">{seo.pageTitle || 'None'}</span>
                          </div>
                          <div>
                            <span className="text-[#565D68]">Meta Description: </span>
                            <span className="text-[#E7EAEE] truncate block">{seo.metaDescription || 'None'}</span>
                          </div>
                          <div>
                            <span className="text-[#565D68]">H1 Headings: </span>
                            <span className="text-[#E7EAEE]">{content.headingCounts?.['h1'] ?? 0}</span>
                          </div>
                          <div>
                            <span className="text-[#565D68]">Word Count: </span>
                            <span className="text-[#E7EAEE]">{content.wordCount ?? 0} words</span>
                          </div>
                          <div>
                            <span className="text-[#565D68]">Missing Alt Images: </span>
                            <span className="text-[#E7EAEE]">{accessibility.imagesMissingAltCount ?? 0}</span>
                          </div>
                          <div>
                            <span className="text-[#565D68]">Content Type: </span>
                            <span className="text-[#E7EAEE]">{r.contentType || 'text/html'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Item Action Bar */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[#565D68] text-[11px]">
                          {isSaved ? `Saved to MongoDB Atlas (Doc ID: ${savedMap[idx]})` : 'Transient audit result.'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePdfDownload(r, idx);
                            }}
                            disabled={isDownloadingPdf}
                            className="inline-flex items-center gap-1 rounded border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-3 py-1.5 text-[11px] font-semibold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isDownloadingPdf ? (
                              <>
                                <Loader2 className="size-3 animate-spin" /> Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="size-3" /> Export PDF
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveReport(r, idx);
                            }}
                            disabled={isSaved || isSaving}
                            className="inline-flex items-center gap-1 rounded border border-[#333A45] bg-[#191D24] px-3 py-1.5 text-[11px] font-semibold text-[#E7EAEE] hover:bg-[#262B33] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSaved ? (
                              <>
                                <Check className="size-3 text-emerald-400" /> Saved
                              </>
                            ) : isSaving ? (
                              <>
                                <Loader2 className="size-3 animate-spin" /> Saving...
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="size-3" /> Save to Database
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
