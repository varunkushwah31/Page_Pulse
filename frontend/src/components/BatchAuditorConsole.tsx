import React, { useState, useMemo } from 'react';
import type { AuditResponse, HealthGrade, SeoMetrics, ContentMetrics, AccessibilityMetrics } from '../types';
import { runFullAudit, downloadPdfReport, saveReportToMongo } from '../lib/api';
import { exportToCsv, exportToJson } from '../lib/ExportUtils';
import {
  BookmarkSimpleIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  CircleNotchIcon,
  DownloadSimpleIcon,
  LightningIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';

export const BatchAuditorConsole: React.FC = () => {
  const [urlListText, setUrlListText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AuditResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [savedMap, setSavedMap] = useState<Record<number, string>>({});
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [saveErrorMap, setSaveErrorMap] = useState<Record<number, string>>({});
  const [downloadingPdfMap, setDownloadingPdfMap] = useState<Record<number, boolean>>({});
  const [filterQuery, setFilterQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  const presets = [
    {
      name: 'Developer Hubs',
      urls: 'https://github.com\nhttps://stackoverflow.com\nhttps://developer.mozilla.org',
    },
    {
      name: 'Competitive Programming',
      urls: 'https://leetcode.com\nhttps://codeforces.com\nhttps://atcoder.jp',
    },
    {
      name: 'Search & Encyclopedias',
      urls: 'https://wikipedia.org\nhttps://duckduckgo.com\nhttps://archive.org',
    },
  ];

  const handleBatchAudit = async (e: React.SubmitEvent<HTMLFormElement>) => {
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
    if (expandedIndices.size === filteredResults.length) {
      setExpandedIndices(new Set());
    } else {
      setExpandedIndices(new Set(filteredResults.map((_, i) => i)));
    }
  };

  const handleSaveReport = async (audit: AuditResponse, idx: number) => {
    setSavingMap((prev) => ({ ...prev, [idx]: true }));
    setSaveErrorMap((prev) => ({ ...prev, [idx]: '' }));
    try {
      const doc = await saveReportToMongo(audit.id);
      setSavedMap((prev) => ({ ...prev, [idx]: doc.id }));
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
        localStorage.removeItem('pagepulse_token');
        localStorage.removeItem('pagepulse_user');
        setSaveErrorMap((prev) => ({ ...prev, [idx]: 'Authentication required to save report.' }));
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to save report to database.';
        setSaveErrorMap((prev) => ({ ...prev, [idx]: msg }));
      }
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
        return <span className="rounded bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-2 py-0.5 text-[#4ADE80] font-bold">EXCELLENT</span>;
      case 'GOOD':
        return <span className="rounded bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 px-2 py-0.5 text-[#4FD8C4] font-bold">GOOD</span>;
      case 'NEEDS_IMPROVEMENT':
        return <span className="rounded bg-[#FBBF24]/10 border border-[#FBBF24]/30 px-2 py-0.5 text-[#FBBF24] font-bold">NEEDS IMPROVEMENT</span>;
      case 'POOR':
        return <span className="rounded bg-[#F87171]/10 border border-[#F87171]/30 px-2 py-0.5 text-[#F87171] font-bold">POOR</span>;
      default:
        return null;
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const matchesText = filterQuery ? r.url.toLowerCase().includes(filterQuery.toLowerCase()) : true;
      const matchesGrade = gradeFilter === 'ALL' || r.scores?.healthGrade === gradeFilter;
      return matchesText && matchesGrade;
    });
  }, [results, filterQuery, gradeFilter]);

  const avgScore = results.length
    ? Math.round(results.reduce((acc, curr) => acc + (curr.scores?.overallScore || 0), 0) / results.length)
    : 0;

  const avgLatency = results.length
    ? Math.round(results.reduce((acc, curr) => acc + (curr.responseTimeMs || 0), 0) / results.length)
    : 0;

  const topPerformer = results.length
    ? [...results].sort((a, b) => (b.scores?.overallScore || 0) - (a.scores?.overallScore || 0))[0]
    : null;

  return (
    <div className="space-y-6 font-mono text-xs text-[#E7EAEE]">
      {/* Batch Input Form */}
      <form onSubmit={handleBatchAudit} className="space-y-4 rounded-xl border border-[#262B33] bg-[#12151A] p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3 text-[#565D68]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#E7EAEE] font-semibold">batch --parallel --max=10</span>
          </div>
          <span className="text-[11px] text-[#4FD8C4]">Multi-URL Parallel Engine</span>
        </div>

        <textarea
          rows={5}
          placeholder="Enter one target URL per line (up to 10 endpoints)...&#10;https://example.com&#10;https://github.com"
          value={urlListText}
          onChange={(e) => setUrlListText(e.target.value)}
          disabled={loading}
          className="w-full rounded border border-[#333A45] bg-[#191D24] p-3 font-mono text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:ring-1 focus:ring-[#4FD8C4] disabled:opacity-50"
        />

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#565D68]">
          <span>Presets:</span>
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              disabled={loading}
              onClick={() => setUrlListText(preset.urls)}
              className="rounded border border-[#262B33] bg-[#0A0C0F] px-2 py-0.5 text-[#8B93A1] hover:text-[#4FD8C4] hover:border-[#4FD8C4]/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between font-mono text-xs pt-1">
          <span className="text-[#8B93A1]">
            Target count:{' '}
            <strong className="text-[#E7EAEE]">
              {urlListText.split('\n').filter((u) => u.trim()).length}
            </strong>
          </span>

          <button
            type="submit"
            disabled={loading || !urlListText.trim()}
            className="rounded border border-[#333A45] bg-[#191D24] px-5 py-2 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <LightningIcon className="size-3.5" />
            <span>{loading ? 'Auditing Batch...' : 'Run Parallel Batch'}</span>
          </button>
        </div>
      </form>

      {/* Loading Indicator */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 font-mono text-xs text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">PROCESSING</span>
            <span>Batch URLs concurrently with Spring Boot Virtual Threads...</span>
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] animate-pulse" />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 font-mono text-xs text-[#F87171]">
          {error}
        </div>
      )}

      {/* Results Summary Dashboard */}
      {results.length > 0 && !loading && (
        <div className="space-y-4">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
              <span className="text-[10px] text-[#565D68] uppercase font-bold">Audited URLs</span>
              <div className="text-2xl font-bold text-[#E7EAEE]">{results.length}</div>
            </div>
            <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
              <span className="text-[10px] text-[#565D68] uppercase font-bold">Average Score</span>
              <div className="text-2xl font-bold text-[#4ADE80]">{avgScore} / 100</div>
            </div>
            <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
              <span className="text-[10px] text-[#565D68] uppercase font-bold">Avg Response Latency</span>
              <div className="text-2xl font-bold text-[#FBBF24]">{avgLatency} ms</div>
            </div>
            <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
              <span className="text-[10px] text-[#565D68] uppercase font-bold">Top Performer</span>
              <div className="text-sm font-bold text-[#4FD8C4] truncate">
                {topPerformer ? topPerformer.url.replace(/^https?:\/\//, '') : 'N/A'}
              </div>
            </div>
          </div>

          {/* Results Container with Search & Filter */}
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden space-y-0 font-mono text-xs shadow-2xl">
            <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[#565D68] uppercase tracking-wider font-semibold">
                  Batch Results ({filteredResults.length} of {results.length})
                </span>
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="rounded border border-[#333A45] bg-[#12151A] px-2.5 py-1 text-[11px] text-[#4FD8C4] hover:bg-[#262B33] transition-all cursor-pointer"
                >
                  {expandedIndices.size === filteredResults.length ? 'Collapse All' : 'Expand All'}
                </button>
              </div>

              {/* Filter Controls & Exports */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44">
                  <MagnifyingGlassIcon className="size-3 text-[#565D68] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter URLs..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="w-full bg-[#0A0C0F] border border-[#262B33] rounded pl-7 pr-2 py-1 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4]"
                  />
                </div>

                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="bg-[#0A0C0F] border border-[#262B33] rounded px-2 py-1 text-xs text-[#E7EAEE] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Grades</option>
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="NEEDS_IMPROVEMENT">Needs Work</option>
                  <option value="POOR">Poor</option>
                </select>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['URL', 'HTTP Status', 'Latency (ms)', 'SEO Score', 'Content Score', 'Accessibility Score', 'Performance Score', 'Overall Score', 'Health Grade'];
                      const rows = filteredResults.map((r) => [
                        r.url,
                        r.httpStatus,
                        r.responseTimeMs,
                        r.scores?.seoScore || 0,
                        r.scores?.contentScore || 0,
                        r.scores?.accessibilityScore || 0,
                        r.scores?.performanceScore || 0,
                        r.scores?.overallScore || 0,
                        r.scores?.healthGrade || 'N/A',
                      ]);
                      exportToCsv(headers, rows, 'pagepulse-batch-audit-results.csv');
                    }}
                    className="rounded border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-2 py-1 text-[11px] font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => exportToJson(filteredResults, 'pagepulse-batch-audit-results.json')}
                    className="rounded border border-[#7AA2F7]/30 bg-[#7AA2F7]/10 px-2 py-1 text-[11px] font-bold text-[#7AA2F7] hover:bg-[#7AA2F7]/20 transition-all cursor-pointer"
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#262B33]">
              {filteredResults.map((r, idx) => {
                const isExpanded = expandedIndices.has(idx);
                const scores = r.scores || { seoScore: 0, contentScore: 0, accessibilityScore: 0, performanceScore: 0, overallScore: 0, healthGrade: 'POOR' as HealthGrade };
                const seo: Partial<SeoMetrics> = r.seoMetrics || {};
                const content: Partial<ContentMetrics> = r.contentMetrics || {};
                const accessibility: Partial<AccessibilityMetrics> = r.accessibilityMetrics || {};
                const isSaved = !!savedMap[idx];
                const isSaving = !!savingMap[idx];
                const isDownloadingPdf = !!downloadingPdfMap[idx];

                let saveStatusText = 'Transient audit result.';
                if (isSaved) {
                  saveStatusText = `Saved to MongoDB Atlas (Doc ID: ${savedMap[idx]})`;
                } else if (saveErrorMap[idx]) {
                  saveStatusText = `Save failed: ${saveErrorMap[idx]}`;
                }

                return (
                  <div key={r.id ?? `${r.url}-${idx}`} className="transition-colors">
                    {/* Summary Bar Row */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(idx)}
                      className="w-full text-left p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#191D24]/50 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 max-w-lg truncate">
                        <span className="text-[#4FD8C4] shrink-0">
                          {isExpanded ? <CaretUpIcon className="size-4" /> : <CaretDownIcon className="size-4" />}
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
                        {getGradeBadge(scores.healthGrade)}
                      </div>
                    </button>

                    {/* Expanded Detailed Summary Panel */}
                    {isExpanded && (
                      <div className="bg-[#0A0C0F] p-5 border-t border-b border-[#262B33]/80 space-y-4">
                        {/* Sub-Scores Grid */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[#8B93A1] uppercase tracking-wider font-semibold text-[10px]">
                              Audit Sub-Score Breakdown
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1.5">
                              <div className="flex justify-between text-[#8B93A1]">
                                <span>SEO Metric</span>
                                <span className="font-bold text-[#E7EAEE]">{scores.seoScore} / 100</span>
                              </div>
                              <div className="text-[10px] text-[#565D68] truncate">
                                Title: {seo.hasTitle ? 'Valid' : 'Missing'} | Desc: {seo.hasMetaDescription ? 'Valid' : 'Missing'}
                              </div>
                            </div>

                            <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1.5">
                              <div className="flex justify-between text-[#8B93A1]">
                                <span>Content Density</span>
                                <span className="font-bold text-[#E7EAEE]">{scores.contentScore} / 100</span>
                              </div>
                              <div className="text-[10px] text-[#565D68]">
                                {content.wordCount || 0} words | {content.textToHtmlRatioPercentage || 0}% ratio
                              </div>
                            </div>

                            <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1.5">
                              <div className="flex justify-between text-[#8B93A1]">
                                <span>Accessibility</span>
                                <span className="font-bold text-[#E7EAEE]">{scores.accessibilityScore} / 100</span>
                              </div>
                              <div className="text-[10px] text-[#565D68]">
                                {accessibility.imagesMissingAltCount || 0} images missing alt
                              </div>
                            </div>

                            <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1.5">
                              <div className="flex justify-between text-[#8B93A1]">
                                <span>DOM Latency</span>
                                <span className="font-bold text-[#E7EAEE]">{scores.performanceScore} / 100</span>
                              </div>
                              <div className="text-[10px] text-[#565D68]">
                                Response: {r.responseTimeMs} ms
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Item Action Bar */}
                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[11px] ${saveErrorMap[idx] ? 'text-[#F87171]' : 'text-[#565D68]'}`}>
                            {saveStatusText}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePdfDownload(r, idx);
                              }}
                              disabled={isDownloadingPdf}
                              className="inline-flex items-center gap-1 rounded border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-3 py-1.5 text-[11px] font-semibold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isDownloadingPdf ? (
                                <>
                                  <CircleNotchIcon className="size-3 animate-spin" /> Downloading...
                                </>
                              ) : (
                                <>
                                  <DownloadSimpleIcon className="size-3" /> Export PDF
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveReport(r, idx);
                              }}
                              disabled={isSaved || isSaving}
                              className="inline-flex items-center gap-1 rounded border border-[#333A45] bg-[#191D24] px-3 py-1.5 text-[11px] font-semibold text-[#E7EAEE] hover:bg-[#262B33] transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isSaved && (
                                <>
                                  <CheckIcon className="size-3 text-[#4ADE80]" /> Saved
                                </>
                              )}
                              {!isSaved && isSaving && (
                                <>
                                  <CircleNotchIcon className="size-3 animate-spin" /> Saving...
                                </>
                              )}
                              {!isSaved && !isSaving && (
                                <>
                                  <BookmarkSimpleIcon className="size-3" /> Save to Database
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
        </div>
      )}
    </div>
  );
};
