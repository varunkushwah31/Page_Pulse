import React, { useState } from 'react';
import type { AuditResponse } from '../types';
import { saveReportToMongo } from '../lib/api';
import { getStatusSeverity, getTimingSeverity, getTimingPercentage } from '../lib/audit-helpers';
import { ReportRow } from './report-row';

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
      setSavedMessage(err.message || 'Failed to save report to database.');
    } finally {
      setSaving(false);
    }
  };

  const statusSeverity = getStatusSeverity(audit.httpStatus);
  const getStatusColorClass = (sev: string) => {
    switch (sev) {
      case 'success': return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10';
      case 'info': return 'text-[#7AA2F7] border-[#7AA2F7]/30 bg-[#7AA2F7]/10';
      case 'warning': return 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10';
      case 'destructive': return 'text-[#F87171] border-[#F87171]/30 bg-[#F87171]/10';
      default: return 'text-[#E7EAEE] border-[#262B33] bg-[#12151A]';
    }
  };

  const responseTimeMs = audit.responseTimeMs || 0;
  const timingPercentage = getTimingPercentage(responseTimeMs);
  const timingSeverity = getTimingSeverity(responseTimeMs);
  const timingColor = timingSeverity === 'success' ? 'bg-[#4ADE80]' : timingSeverity === 'warning' ? 'bg-[#FBBF24]' : 'bg-[#F87171]';

  const seo = audit.seoMetrics || {};
  const content = audit.contentMetrics || {};
  const accessibility = audit.accessibilityMetrics || {};

  const pageTitle = seo.pageTitle || (audit as any).title || null;
  const metaDescription = seo.metaDescription || (audit as any).metaDescription || null;
  const h1Count = (content.headingCounts?.['h1'] !== undefined) ? content.headingCounts['h1'] : ((audit as any).h1Count ?? 0);
  const missingAltCount = accessibility.imagesMissingAltCount !== undefined ? accessibility.imagesMissingAltCount : ((audit as any).imagesMissingAlt ?? 0);
  const wordCount = content.wordCount !== undefined ? content.wordCount : ((audit as any).approximateWordCount ?? 0);

  return (
    <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
      {/* Report Header Strip */}
      <div className="bg-[#191D24] px-5 py-4 border-b border-[#262B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#565D68]">
            Audit Target
          </span>
          <div className="text-sm text-[#E7EAEE] font-medium break-all">{audit.url}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${getStatusColorClass(statusSeverity)}`}>
            HTTP {audit.httpStatus}
          </span>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="p-5 border-b border-[#262B33] grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[#8B93A1]">Response Time</span>
            <span className="text-[#E7EAEE] font-semibold">{responseTimeMs} ms</span>
          </div>
          <div className="w-full h-1.5 bg-[#0A0C0F] rounded-full overflow-hidden">
            <div className={`h-full ${timingColor} transition-all duration-300`} style={{ width: `${timingPercentage}%` }}></div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-[#8B93A1]">Content Type</span>
          <span className="text-[#E7EAEE] font-semibold mt-1 truncate">{audit.contentType || 'text/html'}</span>
        </div>
      </div>

      {/* Page-level Rows */}
      <div className="divide-y divide-[#262B33]">
        <ReportRow
          label="Page Title"
          value={pageTitle}
          emptyText="No <title> found"
        />

        <ReportRow
          label="Meta Description"
          value={metaDescription}
          emptyText="No meta description found"
        />

        <ReportRow
          label="H1 Heading Count"
          value={`${h1Count} ${h1Count === 1 ? 'tag' : 'tags'}`}
          badge={
            <span className={`inline-flex items-center rounded px-2.5 py-0.5 font-mono text-xs font-bold ${h1Count === 1 ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30'}`}>
              {h1Count === 1 ? 'Optimal' : 'Check H1s'}
            </span>
          }
        />

        <ReportRow
          label="Missing Alt Images"
          value={`${missingAltCount} missing alt ${missingAltCount === 1 ? 'tag' : 'tags'}`}
          badge={
            <span className={`inline-flex items-center rounded px-2.5 py-0.5 font-mono text-xs font-bold ${missingAltCount === 0 ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'}`}>
              {missingAltCount === 0 ? 'Passed' : 'Needs Alt Text'}
            </span>
          }
        />

        <ReportRow
          label="Approx. Word Count"
          value={`${wordCount} words`}
        />
      </div>

      {/* Save Action Bar */}
      <div className="bg-[#191D24] p-4 border-t border-[#262B33] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
        <span className="text-[#8B93A1]">
          {savedMessage || 'Promote this audit to permanent cloud persistence.'}
        </span>

        {savedMessage ? (
          <span className="inline-flex items-center rounded border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-3 py-1.5 font-semibold text-[#4ADE80]">
            ✓ Saved to MongoDB
          </span>
        ) : (
          <button
            onClick={handleSaveToMongo}
            disabled={saving}
            className="rounded border border-[#333A45] bg-[#12151A] px-4 py-2 font-semibold text-[#4FD8C4] hover:border-[#4FD8C4] hover:bg-[#262B33] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Report to Database'}
          </button>
        )}
      </div>
    </div>
  );
};
