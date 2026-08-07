import React, { useState } from 'react';
import type { AuditResponse, KeywordGapResponse } from '../types';
import { runFullAudit, downloadPdfReport, fetchKeywordGap } from '../lib/api';
import { exportToCsv, exportToJson } from '../lib/ExportUtils';
import { Sparkles, Target, Layers } from 'lucide-react';

export const CompetitorConsole: React.FC = () => {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [loading, setLoading] = useState(false);
  const [audit1, setAudit1] = useState<AuditResponse | null>(null);
  const [audit2, setAudit2] = useState<AuditResponse | null>(null);
  const [keywordGap, setKeywordGap] = useState<KeywordGapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url1.trim() || !url2.trim() || loading) return;

    setError(null);
    setLoading(true);
    try {
      const [res1, res2, gapRes] = await Promise.all([
        runFullAudit(url1.trim()),
        runFullAudit(url2.trim()),
        fetchKeywordGap(url1.trim(), url2.trim()).catch(() => null),
      ]);
      setAudit1(res1);
      setAudit2(res2);
      setKeywordGap(gapRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Competitor comparison scan failed.');
    } finally {
      setLoading(false);
    }
  };

  const getWinnerHighlight = (val1: number, val2: number, higherIsBetter = true) => {
    if (val1 === val2) return { site1: '', site2: '' };
    if (higherIsBetter) {
      return val1 > val2
        ? { site1: 'text-[#4ADE80] font-bold', site2: 'text-[#8B93A1]' }
        : { site1: 'text-[#8B93A1]', site2: 'text-[#4ADE80] font-bold' };
    }
    return val1 < val2
      ? { site1: 'text-[#4ADE80] font-bold', site2: 'text-[#8B93A1]' }
      : { site1: 'text-[#8B93A1]', site2: 'text-[#4ADE80] font-bold' };
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Terminal Prompt Bar for Compare */}
      <form onSubmit={handleCompare} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 focus-within:ring-2 focus-within:ring-[#4FD8C4] focus-within:ring-offset-2 focus-within:ring-offset-[#0A0C0F]">
          <div className="flex items-center gap-1.5 pl-2 pr-1 text-[#565D68] select-none">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#8B93A1]">compare</span>
          </div>

          <input
            type="text"
            placeholder="URL A (e.g. https://siteA.com)"
            value={url1}
            onChange={(e) => setUrl1(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none"
          />

          <span className="text-[#565D68] text-center font-bold px-1">VS</span>

          <input
            type="text"
            placeholder="URL B (e.g. https://siteB.com)"
            value={url2}
            onChange={(e) => setUrl2(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading || !url1.trim() || !url2.trim()}
            className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer"
          >
            {loading ? 'Comparing...' : 'Run'}
          </button>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">COMPARE</span>
            <span className="text-[#E7EAEE] truncate">{url1} vs {url2}</span>
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] cursor-blink"></span>
          </div>
          <p className="mt-2 text-[11px] text-[#565D68]">
            Executing parallel DOM scrapers and evaluating comparative metrics...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 text-[#F87171]">
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Matrix */}
      {audit1 && audit2 && !loading && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden">
          <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex items-center justify-between">
            <span className="font-semibold text-[#565D68] uppercase tracking-wider">Side-by-Side Diagnostic Matrix</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => downloadPdfReport(audit1.id.toString())}
                className="rounded border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-2.5 py-1 text-[#4FD8C4] text-[11px] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer"
              >
                PDF Site A
              </button>
              <button
                onClick={() => downloadPdfReport(audit2.id.toString())}
                className="rounded border border-[#7AA2F7]/30 bg-[#7AA2F7]/10 px-2.5 py-1 text-[#7AA2F7] text-[11px] hover:bg-[#7AA2F7]/20 transition-all cursor-pointer"
              >
                PDF Site B
              </button>
              <button
                onClick={() => {
                  const headers = ['Metric', audit1.url, audit2.url];
                  const rows = [
                    ['Overall Score', audit1.scores?.overallScore || 0, audit2.scores?.overallScore || 0],
                    ['SEO Score', audit1.scores?.seoScore || 0, audit2.scores?.seoScore || 0],
                    ['Content Score', audit1.scores?.contentScore || 0, audit2.scores?.contentScore || 0],
                    ['Accessibility Score', audit1.scores?.accessibilityScore || 0, audit2.scores?.accessibilityScore || 0],
                    ['Performance Score', audit1.scores?.performanceScore || 0, audit2.scores?.performanceScore || 0],
                    ['Response Latency (ms)', audit1.responseTimeMs, audit2.responseTimeMs],
                    ['Word Count', audit1.contentMetrics?.wordCount || 0, audit2.contentMetrics?.wordCount || 0],
                  ];
                  exportToCsv(headers, rows, 'pagepulse-competitor-comparison.csv');
                }}
                className="rounded border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-2.5 py-1 text-[#FBBF24] text-[11px] hover:bg-[#FBBF24]/20 transition-all cursor-pointer"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportToJson({ siteA: audit1, siteB: audit2 }, 'pagepulse-competitor-comparison.json')}
                className="rounded border border-[#E7EAEE]/30 bg-[#E7EAEE]/10 px-2.5 py-1 text-[#E7EAEE] text-[11px] hover:bg-[#E7EAEE]/20 transition-all cursor-pointer"
              >
                Export JSON
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#262B33]">
            {/* Table Headers */}
            <div className="p-4 grid grid-cols-3 text-center bg-[#0A0C0F] text-[#8B93A1] font-bold">
              <div>Metric</div>
              <div className="truncate px-2 text-[#4FD8C4]">{audit1.domain || 'Site A'}</div>
              <div className="truncate px-2 text-[#7AA2F7]">{audit2.domain || 'Site B'}</div>
            </div>

            {/* Overall Score */}
            {(() => {
              const score1 = audit1.scores?.overallScore || 0;
              const score2 = audit2.scores?.overallScore || 0;
              const h = getWinnerHighlight(score1, score2, true);
              return (
                <div className="p-4 grid grid-cols-3 text-center items-center">
                  <div className="text-[#565D68] uppercase tracking-wider font-semibold">Overall Score</div>
                  <div className={`text-base ${h.site1}`}>{score1} / 100</div>
                  <div className={`text-base ${h.site2}`}>{score2} / 100</div>
                </div>
              );
            })()}

            {/* Health Grade */}
            <div className="p-4 grid grid-cols-3 text-center items-center">
              <div className="text-[#565D68] uppercase tracking-wider font-semibold">Health Grade</div>
              <div className="text-[#E7EAEE] font-bold">{audit1.scores?.healthGrade?.replace('_', ' ') || 'N/A'}</div>
              <div className="text-[#E7EAEE] font-bold">{audit2.scores?.healthGrade?.replace('_', ' ') || 'N/A'}</div>
            </div>

            {/* SEO Sub-Score */}
            {(() => {
              const s1 = audit1.scores?.seoScore || 0;
              const s2 = audit2.scores?.seoScore || 0;
              const h = getWinnerHighlight(s1, s2, true);
              return (
                <div className="p-4 grid grid-cols-3 text-center items-center">
                  <div className="text-[#565D68] uppercase tracking-wider font-semibold">SEO Score</div>
                  <div className={h.site1}>{s1} / 100</div>
                  <div className={h.site2}>{s2} / 100</div>
                </div>
              );
            })()}

            {/* Content Sub-Score */}
            {(() => {
              const s1 = audit1.scores?.contentScore || 0;
              const s2 = audit2.scores?.contentScore || 0;
              const h = getWinnerHighlight(s1, s2, true);
              return (
                <div className="p-4 grid grid-cols-3 text-center items-center">
                  <div className="text-[#565D68] uppercase tracking-wider font-semibold">Content Score</div>
                  <div className={h.site1}>{s1} / 100</div>
                  <div className={h.site2}>{s2} / 100</div>
                </div>
              );
            })()}

            {/* Accessibility Sub-Score */}
            {(() => {
              const s1 = audit1.scores?.accessibilityScore || 0;
              const s2 = audit2.scores?.accessibilityScore || 0;
              const h = getWinnerHighlight(s1, s2, true);
              return (
                <div className="p-4 grid grid-cols-3 text-center items-center">
                  <div className="text-[#565D68] uppercase tracking-wider font-semibold">A11y Score</div>
                  <div className={h.site1}>{s1} / 100</div>
                  <div className={h.site2}>{s2} / 100</div>
                </div>
              );
            })()}

            {/* Performance Sub-Score */}
            {(() => {
              const s1 = audit1.scores?.performanceScore || 0;
              const s2 = audit2.scores?.performanceScore || 0;
              const h = getWinnerHighlight(s1, s2, true);
              return (
                <div className="p-4 grid grid-cols-3 text-center items-center">
                  <div className="text-[#565D68] uppercase tracking-wider font-semibold">Performance Score</div>
                  <div className={h.site1}>{s1} / 100</div>
                  <div className={h.site2}>{s2} / 100</div>
                </div>
              );
            })()}

            {/* Latency */}
            {(() => {
              const t1 = audit1.responseTimeMs || 0;
              const t2 = audit2.responseTimeMs || 0;
              const h = getWinnerHighlight(t1, t2, false);
              return (
                <div className="p-4 grid grid-cols-3 text-center items-center">
                  <div className="text-[#565D68] uppercase tracking-wider font-semibold">Latency</div>
                  <div className={h.site1}>{t1} ms</div>
                  <div className={h.site2}>{t2} ms</div>
                </div>
              );
            })()}

            {/* Word Count */}
            {(() => {
              const w1 = audit1.contentMetrics?.wordCount || 0;
              const w2 = audit2.contentMetrics?.wordCount || 0;
              const h = getWinnerHighlight(w1, w2, true);
              return (
                <div className="p-4 grid grid-cols-3 text-center items-center">
                  <div className="text-[#565D68] uppercase tracking-wider font-semibold">Word Count</div>
                  <div className={h.site1}>{w1} words</div>
                  <div className={h.site2}>{w2} words</div>
                </div>
              );
            })()}

            {/* Missing Alt Images */}
            {(() => {
              const m1 = audit1.accessibilityMetrics?.imagesMissingAltCount || 0;
              const m2 = audit2.accessibilityMetrics?.imagesMissingAltCount || 0;
              const h = getWinnerHighlight(m1, m2, false);
              return (
                <div className="p-4 grid grid-cols-3 text-center items-center">
                  <div className="text-[#565D68] uppercase tracking-wider font-semibold">Missing Alt Images</div>
                  <div className={h.site1}>{m1} missing</div>
                  <div className={h.site2}>{m2} missing</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Keyword & Content Gap Matrix */}
      {keywordGap && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#4FD8C4]" />
              <h3 className="font-bold text-[#E7EAEE] text-sm">Competitor Keyword & Content Gap Matrix</h3>
            </div>
            <span className="text-[10px] text-[#8B93A1] bg-[#191D24] border border-[#262B33] px-2 py-0.5 rounded">
              TF-IDF Keyword Intelligence
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Missing Competitor Opportunities */}
            <div className="space-y-2 rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-3.5">
              <span className="text-[#FBBF24] font-bold text-[11px] flex items-center gap-1.5 uppercase">
                <Target className="size-3.5" />
                <span>Keyword Opportunities ({keywordGap.missingCompetitorOpportunities.length})</span>
              </span>
              <p className="text-[10px] text-[#8B93A1]">High-frequency keywords present on Competitor B but missing on Target A.</p>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {keywordGap.missingCompetitorOpportunities.map((k, idx) => (
                  <span key={idx} className="px-2 py-1 rounded border border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24] text-[11px] font-semibold flex items-center gap-1">
                    <span>{k.keyword}</span>
                    <span className="opacity-60 text-[9px]">({k.countUrlB}x)</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Shared Keywords */}
            <div className="space-y-2 rounded-lg border border-[#4FD8C4]/30 bg-[#4FD8C4]/5 p-3.5">
              <span className="text-[#4FD8C4] font-bold text-[11px] flex items-center gap-1.5 uppercase">
                <Layers className="size-3.5" />
                <span>Shared Terms ({keywordGap.sharedKeywords.length})</span>
              </span>
              <p className="text-[10px] text-[#8B93A1]">Core target industry keywords present across both websites.</p>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {keywordGap.sharedKeywords.map((k, idx) => (
                  <span key={idx} className="px-2 py-1 rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 text-[#4FD8C4] text-[11px] font-semibold flex items-center gap-1">
                    <span>{k.keyword}</span>
                    <span className="opacity-60 text-[9px]">{k.countUrlA}x / {k.countUrlB}x</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Unique Target Keywords */}
            <div className="space-y-2 rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/5 p-3.5">
              <span className="text-[#4ADE80] font-bold text-[11px] flex items-center gap-1.5 uppercase">
                <Sparkles className="size-3.5" />
                <span>Unique Target Strengths ({keywordGap.uniqueTargetKeywords.length})</span>
              </span>
              <p className="text-[10px] text-[#8B93A1]">Keywords exclusive to Target A giving rank advantages.</p>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {keywordGap.uniqueTargetKeywords.map((k, idx) => (
                  <span key={idx} className="px-2 py-1 rounded border border-[#4ADE80]/40 bg-[#4ADE80]/10 text-[#4ADE80] text-[11px] font-semibold flex items-center gap-1">
                    <span>{k.keyword}</span>
                    <span className="opacity-60 text-[9px]">({k.countUrlA}x)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
