import React, { useState } from 'react';
import type { AuditResponse } from '../types';
import { saveReportToMongo } from '../lib/api';

interface AuditReportProps {
  audit: AuditResponse;
}

export const AuditReport: React.FC<AuditReportProps> = ({ audit }) => {
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSaveToMongo = async () => {
    setSaving(true);
    try {
      const doc = await saveReportToMongo(audit.id);
      setSavedMessage(`Audit stored permanently in MongoDB! (ID: ${doc.id})`);
    } catch (err: any) {
      setSavedMessage(err.message || 'Failed to save to database.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10';
    if (status >= 300 && status < 400) return 'text-[#7AA2F7] border-[#7AA2F7]/30 bg-[#7AA2F7]/10';
    if (status >= 400 && status < 500) return 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10';
    return 'text-[#F87171] border-[#F87171]/30 bg-[#F87171]/10';
  };

  const responseTimeMs = audit.responseTimeMs || 0;
  const timingWidth = Math.min(100, Math.max(5, (responseTimeMs / 3000) * 100));
  const timingColor = responseTimeMs <= 800 ? 'bg-[#4ADE80]' : responseTimeMs <= 2000 ? 'bg-[#FBBF24]' : 'bg-[#F87171]';

  const seoMetrics = audit.seoMetrics || {};
  const contentMetrics = audit.contentMetrics || {};
  const accessibilityMetrics = audit.accessibilityMetrics || {};

  const pageTitle = seoMetrics.pageTitle || (audit as any).title || null;
  const metaDescription = seoMetrics.metaDescription || (audit as any).metaDescription || null;
  const h1Count = (contentMetrics.headingCounts?.['h1'] !== undefined) ? contentMetrics.headingCounts['h1'] : ((audit as any).h1Count ?? 0);
  const imagesMissingAlt = accessibilityMetrics.imagesMissingAltCount !== undefined ? accessibilityMetrics.imagesMissingAltCount : ((audit as any).imagesMissingAlt ?? 0);
  const wordCount = contentMetrics.wordCount !== undefined ? contentMetrics.wordCount : ((audit as any).approximateWordCount ?? 0);

  return (
    <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
      {/* Report Header Strip */}
      <div className="bg-[#191D24] px-5 py-4 border-b border-[#262B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#565D68]">
            Audit Target
          </span>
          <div className="font-mono text-sm text-[#E7EAEE] font-medium break-all">{audit.url}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs font-bold ${getStatusColor(audit.httpStatus)}`}>
            HTTP {audit.httpStatus}
          </span>
        </div>
      </div>

      {/* Key Performance Metrics Bar */}
      <div className="p-5 border-b border-[#262B33] grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-baseline font-mono text-xs mb-1">
            <span className="text-[#8B93A1]">Response Time</span>
            <span className="text-[#E7EAEE] font-semibold">{responseTimeMs} ms</span>
          </div>
          <div className="w-full h-1.5 bg-[#0A0C0F] rounded-full overflow-hidden">
            <div className={`h-full ${timingColor} transition-all duration-300`} style={{ width: `${timingWidth}%` }}></div>
          </div>
        </div>

        <div className="flex flex-col justify-center font-mono text-xs">
          <span className="text-[#8B93A1]">Content Type</span>
          <span className="text-[#E7EAEE] font-semibold mt-1 truncate">{audit.contentType || 'text/html'}</span>
        </div>
      </div>

      {/* Detailed Page-level Rows */}
      <div className="divide-y divide-[#262B33]">
        {/* Page Title */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[#565D68] uppercase tracking-wider">
            Page Title
          </div>
          <div className="flex-1 font-sans text-sm text-[#E7EAEE]">
            {pageTitle ? (
              <span>{pageTitle}</span>
            ) : (
              <span className="font-mono text-xs italic text-[#565D68]">No &lt;title&gt; found</span>
            )}
          </div>
        </div>

        {/* Meta Description */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[#565D68] uppercase tracking-wider">
            Meta Description
          </div>
          <div className="flex-1 font-sans text-sm text-[#E7EAEE] leading-relaxed">
            {metaDescription ? (
              <span>{metaDescription}</span>
            ) : (
              <span className="font-mono text-xs italic text-[#565D68]">No meta description found</span>
            )}
          </div>
        </div>

        {/* H1 Count */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[#565D68] uppercase tracking-wider">
            H1 Heading Count
          </div>
          <div className="flex-1">
            <span className={`inline-flex items-center rounded px-2.5 py-0.5 font-mono text-xs font-bold ${h1Count === 1 ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30'}`}>
              {h1Count} {h1Count === 1 ? 'H1 tag' : 'H1 tags'}
            </span>
          </div>
        </div>

        {/* Missing Alt Images */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[#565D68] uppercase tracking-wider">
            Missing Alt Images
          </div>
          <div className="flex-1">
            <span className={`inline-flex items-center rounded px-2.5 py-0.5 font-mono text-xs font-bold ${imagesMissingAlt === 0 ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'}`}>
              {imagesMissingAlt} missing alt {imagesMissingAlt === 1 ? 'tag' : 'tags'}
            </span>
          </div>
        </div>

        {/* Word Count */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[#565D68] uppercase tracking-wider">
            Approx. Word Count
          </div>
          <div className="flex-1 font-mono text-sm font-semibold text-[#E7EAEE]">
            {wordCount} words
          </div>
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="bg-[#191D24] p-4 border-t border-[#262B33] flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="font-mono text-xs text-[#8B93A1]">
          {savedMessage || 'Promote this audit to permanent cloud persistence.'}
        </span>

        {savedMessage ? (
          <span className="inline-flex items-center rounded border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-3 py-1.5 font-mono text-xs font-semibold text-[#4ADE80]">
            ✓ Saved to MongoDB
          </span>
        ) : (
          <button
            onClick={handleSaveToMongo}
            disabled={saving}
            className="rounded border border-[#333A45] bg-[#12151A] px-4 py-2 font-mono text-xs font-semibold text-[#4FD8C4] hover:border-[#4FD8C4] hover:bg-[#262B33] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Report to Database'}
          </button>
        )}
      </div>
    </div>
  );
};
