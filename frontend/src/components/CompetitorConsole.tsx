import React, { useState } from 'react';
import type { AuditResponse, KeywordGapResponse } from '../types';
import { runFullAudit, downloadPdfReport, fetchKeywordGap } from '../lib/api';
import { exportToCsv } from '../lib/ExportUtils';
import {
  SparkleIcon,
  StackIcon,
  TargetIcon,
  TrophyIcon,
  UsersIcon,
} from '@phosphor-icons/react';

export const CompetitorConsole: React.FC = () => {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [loading, setLoading] = useState(false);
  const [audit1, setAudit1] = useState<AuditResponse | null>(null);
  const [audit2, setAudit2] = useState<AuditResponse | null>(null);
  const [keywordGap, setKeywordGap] = useState<KeywordGapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keywordTab, setKeywordTab] = useState<'ALL' | 'OPPORTUNITIES' | 'SHARED' | 'UNIQUE'>('ALL');

  const competitorPresets = [
    { name: 'GitHub vs GitLab', a: 'https://github.com', b: 'https://gitlab.com' },
    { name: 'React vs Vue', a: 'https://react.dev', b: 'https://vuejs.org' },
    { name: 'Wikipedia vs Britannica', a: 'https://wikipedia.org', b: 'https://britannica.com' },
  ];

  const handleCompare = async (e: React.ChangeEvent<HTMLFormElement>) => {
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
    if (val1 === val2) return { site1: 'text-[#E7EAEE]', site2: 'text-[#E7EAEE]', winner: 0, delta: 0 };
    if (higherIsBetter) {
      return val1 > val2
        ? { site1: 'text-[#4ADE80] font-bold', site2: 'text-[#8B93A1]', winner: 1, delta: val1 - val2 }
        : { site1: 'text-[#8B93A1]', site2: 'text-[#4ADE80] font-bold', winner: 2, delta: val2 - val1 };
    }
    return val1 < val2
      ? { site1: 'text-[#4ADE80] font-bold', site2: 'text-[#8B93A1]', winner: 1, delta: val2 - val1 }
      : { site1: 'text-[#8B93A1]', site2: 'text-[#4ADE80] font-bold', winner: 2, delta: val1 - val2 };
  };

  // Calculate total category wins
  const winCounts = (() => {
    if (!audit1 || !audit2) return { site1: 0, site2: 0, ties: 0 };
    let s1 = 0, s2 = 0, ties = 0;

    const metrics = [
      getWinnerHighlight(audit1.scores?.overallScore || 0, audit2.scores?.overallScore || 0, true),
      getWinnerHighlight(audit1.scores?.seoScore || 0, audit2.scores?.seoScore || 0, true),
      getWinnerHighlight(audit1.scores?.contentScore || 0, audit2.scores?.contentScore || 0, true),
      getWinnerHighlight(audit1.scores?.accessibilityScore || 0, audit2.scores?.accessibilityScore || 0, true),
      getWinnerHighlight(audit1.scores?.performanceScore || 0, audit2.scores?.performanceScore || 0, true),
      getWinnerHighlight(audit1.responseTimeMs || 0, audit2.responseTimeMs || 0, false),
      getWinnerHighlight(audit1.contentMetrics?.wordCount || 0, audit2.contentMetrics?.wordCount || 0, true),
      getWinnerHighlight(audit1.accessibilityMetrics?.imagesMissingAltCount || 0, audit2.accessibilityMetrics?.imagesMissingAltCount || 0, false),
    ];

    metrics.forEach((m) => {
      if (m.winner === 1) s1++;
      else if (m.winner === 2) s2++;
      else ties++;
    });

    return { site1: s1, site2: s2, ties };
  })();

  return (
    <div className="space-y-6 font-mono text-xs text-[#E7EAEE]">
      {/* Terminal Prompt Bar for Compare */}
      <form onSubmit={handleCompare} className="w-full space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 focus-within:border-[#4FD8C4] transition-colors">
          <div className="flex items-center gap-1.5 pl-2 pr-1 text-[#565D68] select-none shrink-0">
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

          <span className="text-[#4FD8C4] text-center font-bold px-2 py-0.5 rounded bg-[#191D24] border border-[#262B33] text-[10px]">
            VS
          </span>

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
            className="rounded border border-[#333A45] bg-[#191D24] px-5 py-2 font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <UsersIcon className="size-3.5" />
            <span>{loading ? 'Comparing...' : 'Run Benchmark'}</span>
          </button>
        </div>

        {/* Competitor Presets */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#565D68] pl-1">
          <span>Benchmark Presets:</span>
          {competitorPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              disabled={loading}
              onClick={() => {
                setUrl1(preset.a);
                setUrl2(preset.b);
              }}
              className="rounded border border-[#262B33] bg-[#12151A] px-2 py-0.5 text-[#8B93A1] hover:text-[#4FD8C4] hover:border-[#4FD8C4]/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 text-[#8B93A1]">
          <div className="flex items-center gap-2">
            <span className="text-[#4FD8C4] font-semibold">BENCHMARK ACTIVE</span>
            <span className="text-[#E7EAEE] truncate">{url1} vs {url2}</span>
            <span className="inline-block w-2 h-4 bg-[#4FD8C4] cursor-blink" />
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

      {/* Comparison Head-to-Head Winner Banner */}
      {audit1 && audit2 && !loading && (() => {
        let winnerText = 'Dead Heat Tie!';
        if (winCounts.site1 > winCounts.site2) {
          winnerText = `${audit1.domain || 'Site A'} (${winCounts.site1} Categories)`;
        } else if (winCounts.site2 > winCounts.site1) {
          winnerText = `${audit2.domain || 'Site B'} (${winCounts.site2} Categories)`;
        }

        return (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#FBBF24]/10 border border-[#FBBF24]/30 text-[#FBBF24]">
                <TrophyIcon className="size-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#E7EAEE] flex items-center gap-2">
                  <span>Head-to-Head Benchmark Winner:</span>
                  <span className="text-[#4ADE80]">
                    {winnerText}
                  </span>
                </div>
                <div className="text-[11px] text-[#8B93A1]">
                  Evaluated across 8 key performance, SEO, content, and accessibility vectors.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 text-[#4FD8C4] font-bold text-xs">
                Site A: {winCounts.site1} Wins
              </span>
              <span className="px-2.5 py-1 rounded bg-[#7AA2F7]/10 border border-[#7AA2F7]/30 text-[#7AA2F7] font-bold text-xs">
                Site B: {winCounts.site2} Wins
              </span>
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
            <div className="bg-[#191D24] p-4 border-b border-[#262B33] flex items-center justify-between">
              <span className="font-semibold text-[#565D68] uppercase tracking-wider">Side-by-Side Diagnostic Matrix</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPdfReport(audit1.id.toString())}
                  className="rounded border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-2.5 py-1 text-[#4FD8C4] text-[11px] font-bold hover:bg-[#4FD8C4]/20 transition-all cursor-pointer"
                >
                  PDF Site A
                </button>
                <button
                  type="button"
                  onClick={() => downloadPdfReport(audit2.id.toString())}
                  className="rounded border border-[#7AA2F7]/30 bg-[#7AA2F7]/10 px-2.5 py-1 text-[#7AA2F7] text-[11px] font-bold hover:bg-[#7AA2F7]/20 transition-all cursor-pointer"
                >
                  PDF Site B
                </button>
                <button
                  type="button"
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
                    exportToCsv(headers, rows, 'sitelook-competitor-comparison.csv');
                  }}
                  className="rounded border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-2.5 py-1 text-[#FBBF24] text-[11px] font-bold hover:bg-[#FBBF24]/20 transition-all cursor-pointer"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#262B33]">
              {/* Table Headers */}
              <div className="p-3.5 grid grid-cols-3 text-center bg-[#0A0C0F] text-[#8B93A1] font-bold">
                <div className="text-left font-mono">Performance & Audit Vector</div>
                <div className="text-[#4FD8C4] truncate">Site A ({audit1.domain || 'Target'})</div>
                <div className="text-[#7AA2F7] truncate">Site B ({audit2.domain || 'Competitor'})</div>
              </div>

              {/* Row 1: Overall Score */}
              {(() => {
                const s1 = audit1.scores?.overallScore || 0;
                const s2 = audit2.scores?.overallScore || 0;
                const h = getWinnerHighlight(s1, s2);
                return (
                  <div className="p-3.5 grid grid-cols-3 text-center items-center hover:bg-[#191D24]/30">
                    <div className="text-left font-semibold text-[#E7EAEE]">Overall Score</div>
                    <div className={h.site1}>{s1} / 100</div>
                    <div className={h.site2}>{s2} / 100</div>
                  </div>
                );
              })()}

              {/* Row 2: Latency */}
              {(() => {
                const l1 = audit1.responseTimeMs;
                const l2 = audit2.responseTimeMs;
                const h = getWinnerHighlight(l1, l2, false);
                return (
                  <div className="p-3.5 grid grid-cols-3 text-center items-center hover:bg-[#191D24]/30">
                    <div className="text-left font-semibold text-[#E7EAEE]">Server Latency (TTFB)</div>
                    <div className={h.site1}>{l1} ms</div>
                    <div className={h.site2}>{l2} ms</div>
                  </div>
                );
              })()}

              {/* Row 3: SEO Score */}
              {(() => {
                const s1 = audit1.scores?.seoScore || 0;
                const s2 = audit2.scores?.seoScore || 0;
                const h = getWinnerHighlight(s1, s2);
                return (
                  <div className="p-3.5 grid grid-cols-3 text-center items-center hover:bg-[#191D24]/30">
                    <div className="text-left font-semibold text-[#E7EAEE]">SEO Metadata Optimization</div>
                    <div className={h.site1}>{s1} / 100</div>
                    <div className={h.site2}>{s2} / 100</div>
                  </div>
                );
              })()}

              {/* Row 4: Content Density */}
              {(() => {
                const s1 = audit1.scores?.contentScore || 0;
                const s2 = audit2.scores?.contentScore || 0;
                const h = getWinnerHighlight(s1, s2);
                return (
                  <div className="p-3.5 grid grid-cols-3 text-center items-center hover:bg-[#191D24]/30">
                    <div className="text-left font-semibold text-[#E7EAEE]">Content & Heading Hierarchy</div>
                    <div className={h.site1}>{s1} / 100</div>
                    <div className={h.site2}>{s2} / 100</div>
                  </div>
                );
              })()}

              {/* Row 5: Word Count */}
              {(() => {
                const w1 = audit1.contentMetrics?.wordCount || 0;
                const w2 = audit2.contentMetrics?.wordCount || 0;
                const h = getWinnerHighlight(w1, w2);
                return (
                  <div className="p-3.5 grid grid-cols-3 text-center items-center hover:bg-[#191D24]/30">
                    <div className="text-left font-semibold text-[#E7EAEE]">Extracted Word Count</div>
                    <div className={h.site1}>{w1} words</div>
                    <div className={h.site2}>{w2} words</div>
                  </div>
                );
              })()}

              {/* Row 6: Accessibility */}
              {(() => {
                const a1 = audit1.scores?.accessibilityScore || 0;
                const a2 = audit2.scores?.accessibilityScore || 0;
                const h = getWinnerHighlight(a1, a2);
                return (
                  <div className="p-3.5 grid grid-cols-3 text-center items-center hover:bg-[#191D24]/30">
                    <div className="text-left font-semibold text-[#E7EAEE]">Accessibility Compliance</div>
                    <div className={h.site1}>{a1} / 100</div>
                    <div className={h.site2}>{a2} / 100</div>
                  </div>
                );
              })()}

              {/* Row 7: Missing Alt Tags */}
              {(() => {
                const m1 = audit1.accessibilityMetrics?.imagesMissingAltCount || 0;
                const m2 = audit2.accessibilityMetrics?.imagesMissingAltCount || 0;
                const h = getWinnerHighlight(m1, m2, false);
                return (
                  <div className="p-3.5 grid grid-cols-3 text-center items-center hover:bg-[#191D24]/30">
                    <div className="text-left font-semibold text-[#E7EAEE]">Images Missing Alt Text</div>
                    <div className={h.site1}>{m1} missing</div>
                    <div className={h.site2}>{m2} missing</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Keyword & Content Gap Matrix with Filter Tabs */}
      {keywordGap && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262B33] pb-3">
            <div className="flex items-center gap-2">
              <SparkleIcon className="size-4 text-[#4FD8C4]" />
              <h3 className="font-bold text-[#E7EAEE] text-sm">Competitor Keyword & Content Gap Intelligence</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {(['ALL', 'OPPORTUNITIES', 'SHARED', 'UNIQUE'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setKeywordTab(tab)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    keywordTab === tab
                      ? 'bg-[#191D24] text-[#4FD8C4] border border-[#333A45]'
                      : 'text-[#8B93A1] hover:text-[#E7EAEE]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Missing Competitor Opportunities */}
            {(keywordTab === 'ALL' || keywordTab === 'OPPORTUNITIES') && (
              <div className="space-y-2 rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-3.5">
                <span className="text-[#FBBF24] font-bold text-[11px] flex items-center gap-1.5 uppercase">
                  <TargetIcon className="size-3.5" />
                  <span>Keyword Opportunities ({keywordGap.missingCompetitorOpportunities.length})</span>
                </span>
                <p className="text-[10px] text-[#8B93A1]">High-frequency keywords present on Competitor B but missing on Target A.</p>

                <div className="flex flex-wrap gap-1.5 pt-2 max-h-48 overflow-y-auto">
                  {keywordGap.missingCompetitorOpportunities.map((k) => (
                    <span key={k.keyword} className="px-2 py-1 rounded border border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24] text-[11px] font-semibold flex items-center gap-1">
                      <span>{k.keyword}</span>
                      <span className="opacity-60 text-[9px]">({k.countUrlB}x)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Shared Keywords */}
            {(keywordTab === 'ALL' || keywordTab === 'SHARED') && (
              <div className="space-y-2 rounded-lg border border-[#4FD8C4]/30 bg-[#4FD8C4]/5 p-3.5">
                <span className="text-[#4FD8C4] font-bold text-[11px] flex items-center gap-1.5 uppercase">
                  <StackIcon className="size-3.5" />
                  <span>Shared Terms ({keywordGap.sharedKeywords.length})</span>
                </span>
                <p className="text-[10px] text-[#8B93A1]">Core target industry keywords present across both websites.</p>

                <div className="flex flex-wrap gap-1.5 pt-2 max-h-48 overflow-y-auto">
                  {keywordGap.sharedKeywords.map((k) => (
                    <span key={k.keyword} className="px-2 py-1 rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 text-[#4FD8C4] text-[11px] font-semibold flex items-center gap-1">
                      <span>{k.keyword}</span>
                      <span className="opacity-60 text-[9px]">{k.countUrlA}x / {k.countUrlB}x</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Unique Target Keywords */}
            {(keywordTab === 'ALL' || keywordTab === 'UNIQUE') && (
              <div className="space-y-2 rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/5 p-3.5">
                <span className="text-[#4ADE80] font-bold text-[11px] flex items-center gap-1.5 uppercase">
                  <SparkleIcon className="size-3.5" />
                  <span>Unique Target Strengths ({keywordGap.uniqueTargetKeywords.length})</span>
                </span>
                <p className="text-[10px] text-[#8B93A1]">Keywords exclusive to Target A giving rank advantages.</p>

                <div className="flex flex-wrap gap-1.5 pt-2 max-h-48 overflow-y-auto">
                  {keywordGap.uniqueTargetKeywords.map((k) => (
                    <span key={k.keyword} className="px-2 py-1 rounded border border-[#4ADE80]/40 bg-[#4ADE80]/10 text-[#4ADE80] text-[11px] font-semibold flex items-center gap-1">
                      <span>{k.keyword}</span>
                      <span className="opacity-60 text-[9px]">({k.countUrlA}x)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
