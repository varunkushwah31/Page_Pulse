import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AuditResponse } from '../types';
import { saveReportToMongo, downloadPdfReport } from '../lib/api';
import { Download, Database, Lock, AlertCircle, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { AiFixConsole } from './AiFixConsole';
import { AdvancedEngineConsole } from './AdvancedEngineConsole';
import { DomInspectorConsole } from './DomInspectorConsole';

interface AuditReportProps {
  audit: AuditResponse;
}

const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10';
  if (status >= 300 && status < 400) return 'text-[#7AA2F7] border-[#7AA2F7]/30 bg-[#7AA2F7]/10';
  if (status >= 400 && status < 500) return 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10';
  return 'text-[#F87171] border-[#F87171]/30 bg-[#F87171]/10';
};

export const AuditReport: React.FC<AuditReportProps> = ({ audit }) => {
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!localStorage.getItem('pagepulse_token');

  const handleSaveToMongo = async () => {
    setSaveError(null);
    setSavedMessage(null);

    if (!audit.id) {
      setSaveError('Cannot save report: missing temporary audit ID.');
      return;
    }

    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    setSaving(true);
    try {
      const doc = await saveReportToMongo(audit.id);
      setSavedMessage(`Saved permanently! Document ID: ${doc.id}`);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
        localStorage.removeItem('pagepulse_token');
        localStorage.removeItem('pagepulse_user');
        setShowLoginPrompt(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to save report to database.';
        setSaveError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLoginPromptAction = () => {
    setShowLoginPrompt(false);
    navigate('/auth', { state: { from: location.pathname, auditId: audit.id } });
  };

  const handlePdfDownload = async () => {
    setDownloadingPdf(true);
    try {
      await downloadPdfReport(audit.id.toString());
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const responseTimeMs = audit.responseTimeMs || 0;
  const timingWidth = Math.min(100, Math.max(5, (responseTimeMs / 3000) * 100));
  const timingColor = responseTimeMs <= 800 ? 'bg-[#4ADE80]' : responseTimeMs <= 2000 ? 'bg-[#FBBF24]' : 'bg-[#F87171]';

  const seoMetrics = audit.seoMetrics;
  const contentMetrics = audit.contentMetrics;
  const accessibilityMetrics = audit.accessibilityMetrics;
  const scores = audit.scores;

  const pageTitle = seoMetrics?.pageTitle ?? null;
  const metaDescription = seoMetrics?.metaDescription ?? null;
  const h1Count = contentMetrics?.headingCounts?.['h1'] ?? 0;
  const imagesMissingAlt = accessibilityMetrics?.imagesMissingAltCount ?? 0;
  const wordCount = contentMetrics?.wordCount ?? 0;

  const overallScore = scores?.overallScore ?? 0;
  const seoScore = scores?.seoScore ?? 0;
  const contentScore = scores?.contentScore ?? 0;
  const accessibilityScore = scores?.accessibilityScore ?? 0;
  const performanceScore = scores?.performanceScore ?? 0;
  const healthGrade = scores?.healthGrade || 'POOR';

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT': return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10';
      case 'GOOD': return 'text-[#4FD8C4] border-[#4FD8C4]/30 bg-[#4FD8C4]/10';
      case 'NEEDS_IMPROVEMENT': return 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10';
      default: return 'text-[#F87171] border-[#F87171]/30 bg-[#F87171]/10';
    }
  };

  return (
    <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden shadow-2xl space-y-0 font-mono text-xs">
      {/* Report Header Strip */}
      <div className="bg-[#191D24] px-5 py-4 border-b border-[#262B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#565D68]">
            Audit Target URL
          </span>
          <div className="font-mono text-sm text-[#E7EAEE] font-medium break-all">{audit.url}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${getStatusColor(audit.httpStatus)}`}>
            HTTP {audit.httpStatus}
          </span>
        </div>
      </div>

      {/* Health Grade & 4-Way Sub-Scores Breakdown */}
      <div className="p-5 border-b border-[#262B33] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#565D68]">
              Overall Health Grade
            </span>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${getGradeColor(healthGrade)}`}>
                {healthGrade.replace('_', ' ')}
              </span>
              <span className="text-3xl font-extrabold text-[#E7EAEE]">{overallScore} / 100</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePdfDownload}
              disabled={downloadingPdf}
              className="rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-3 py-1.5 font-semibold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Download className="size-3.5" />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
            </button>
            <button
              onClick={handleSaveToMongo}
              disabled={saving}
              className="rounded border border-[#333A45] bg-[#191D24] px-4 py-1.5 font-semibold text-[#E7EAEE] hover:border-[#4FD8C4] hover:text-[#4FD8C4] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Database className="size-3.5 text-[#4ADE80]" />
              <span>{saving ? 'Saving...' : 'Save to DB'}</span>
            </button>
          </div>
        </div>

        {/* 4-Way Sub-Score Visual Progress Bars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#8B93A1]">SEO Score</span>
              <span className="font-bold text-[#4FD8C4]">{seoScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#191D24] rounded-full overflow-hidden">
              <div className="h-full bg-[#4FD8C4] transition-all" style={{ width: `${seoScore}%` }}></div>
            </div>
          </div>

          <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#8B93A1]">Content Score</span>
              <span className="font-bold text-[#7AA2F7]">{contentScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#191D24] rounded-full overflow-hidden">
              <div className="h-full bg-[#7AA2F7] transition-all" style={{ width: `${contentScore}%` }}></div>
            </div>
          </div>

          <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#8B93A1]">Accessibility</span>
              <span className="font-bold text-[#4ADE80]">{accessibilityScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#191D24] rounded-full overflow-hidden">
              <div className="h-full bg-[#4ADE80] transition-all" style={{ width: `${accessibilityScore}%` }}></div>
            </div>
          </div>

          <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#8B93A1]">Performance</span>
              <span className="font-bold text-[#FBBF24]">{performanceScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#191D24] rounded-full overflow-hidden">
              <div className="h-full bg-[#FBBF24] transition-all" style={{ width: `${performanceScore}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Latency & Content-Type Telemetry Bar */}
      <div className="p-5 border-b border-[#262B33] grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-baseline text-xs mb-1">
            <span className="text-[#8B93A1]">Response Latency</span>
            <span className="text-[#E7EAEE] font-semibold">{responseTimeMs} ms</span>
          </div>
          <div className="w-full h-1.5 bg-[#0A0C0F] rounded-full overflow-hidden">
            <div className={`h-full ${timingColor} transition-all duration-300`} style={{ width: `${timingWidth}%` }}></div>
          </div>
        </div>

        <div className="flex flex-col justify-center text-xs">
          <span className="text-[#8B93A1]">Content Type Header</span>
          <span className="text-[#E7EAEE] font-semibold mt-1 truncate">{audit.contentType || 'text/html'}</span>
        </div>
      </div>

      {/* Detailed Technical Metric Rows */}
      <div className="divide-y divide-[#262B33]">
        {/* Page Title */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider">
            Page Title
          </div>
          <div className="flex-1 font-sans text-sm text-[#E7EAEE]">
            {pageTitle ? (
              <span>{pageTitle}</span>
            ) : (
              <span className="font-mono text-xs italic text-[#8B93A1]">No {'<title>'} found</span>
            )}
          </div>
        </div>

        {/* Meta Description */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider">
            Meta Description
          </div>
          <div className="flex-1 font-sans text-sm text-[#E7EAEE] leading-relaxed">
            {metaDescription ? (
              <span>{metaDescription}</span>
            ) : (
              <span className="font-mono text-xs italic text-[#8B93A1]">No meta description tag found</span>
            )}
          </div>
        </div>

        {/* H1 Count */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider">
            H1 Heading Count
          </div>
          <div className="flex-1">
            <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-bold ${h1Count === 1 ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30'}`}>
              {h1Count} {h1Count === 1 ? 'H1 tag' : 'H1 tags'}
            </span>
          </div>
        </div>

        {/* Missing Alt Images */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider">
            Missing Alt Images
          </div>
          <div className="flex-1">
            <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-bold ${imagesMissingAlt === 0 ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'}`}>
              {imagesMissingAlt} missing alt {imagesMissingAlt === 1 ? 'tag' : 'tags'}
            </span>
          </div>
        </div>

        {/* Word Count */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider">
            Approx. Word Count
          </div>
          <div className="flex-1 text-sm font-semibold text-[#E7EAEE]">
            {wordCount} words
          </div>
        </div>

        {/* SEO Metadata Compliance Tags */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider">
            SEO Tags Compliance
          </div>
          <div className="flex-1 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${seoMetrics?.hasViewportMeta ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'}`}>
              {seoMetrics?.hasViewportMeta ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
              <span>Mobile Viewport Meta</span>
            </span>
            <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${seoMetrics?.hasFavicon ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30'}`}>
              {seoMetrics?.hasFavicon ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
              <span>Favicon Icon</span>
            </span>
            <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${seoMetrics?.hasOgImage ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30'}`}>
              {seoMetrics?.hasOgImage ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
              <span>OpenGraph Image</span>
            </span>
            <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${seoMetrics?.hasStructuredData ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#191D24] text-[#8B93A1] border border-[#262B33]'}`}>
              {seoMetrics?.hasStructuredData ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
              <span>JSON-LD Schema</span>
            </span>
          </div>
        </div>

        {/* Actionable Recommendations Plan */}
        {seoMetrics?.seoRecommendations && seoMetrics.seoRecommendations.length > 0 && (
          <div className="p-4 sm:p-5 bg-[#0A0C0F]/60 space-y-3">
            <div className="text-xs text-[#4FD8C4] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <FileText className="size-4 text-[#4FD8C4]" />
              <span>SEO Optimization Recommendations ({seoMetrics.seoRecommendations.length})</span>
            </div>
            <div className="space-y-2">
              {seoMetrics.seoRecommendations.map((rec, idx) => (
                <div key={`${rec}-${idx}`} className="flex items-start gap-2.5 text-xs font-sans text-[#E7EAEE] bg-[#12151A] p-2.5 rounded border border-[#262B33]">
                  <span className="text-[#FBBF24] shrink-0 font-mono font-bold">→</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visual DOM Element Inspector */}
      {((audit.accessibilityMetrics?.domIssues && audit.accessibilityMetrics.domIssues.length > 0) ||
        (audit.seoMetrics?.domIssues && audit.seoMetrics.domIssues.length > 0)) && (
        <div className="p-4 sm:p-5 border-t border-[#262B33] bg-[#0A0C0F]/40 space-y-4">
          {audit.accessibilityMetrics?.domIssues && audit.accessibilityMetrics.domIssues.length > 0 && (
            <DomInspectorConsole issues={audit.accessibilityMetrics.domIssues} title="Accessibility DOM Inspector (Missing Alt & Unlabelled Inputs)" />
          )}
          {audit.seoMetrics?.domIssues && audit.seoMetrics.domIssues.length > 0 && (
            <DomInspectorConsole issues={audit.seoMetrics.domIssues} title="SEO DOM Inspector (Meta & Structure Issues)" />
          )}
        </div>
      )}

      {/* Advanced Engine Metrics (Core Web Vitals, Security/SSL, Link Inspector) */}
      <div className="p-4 sm:p-5 border-t border-[#262B33] bg-[#0A0C0F]/40">
        <AdvancedEngineConsole audit={audit} />
      </div>

      {/* AI Actionable Fix Suggestions */}
      <div className="p-4 sm:p-5 border-t border-[#262B33] bg-[#0A0C0F]/40">
        <AiFixConsole audit={audit} />
      </div>

      {/* Permanent Save Confirmation Footer */}
      {savedMessage && (
        <div className="bg-[#4ADE80]/10 p-4 border-t border-[#4ADE80]/30 text-[#4ADE80] flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-[#4ADE80]" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Save Error Footer */}
      {saveError && (
        <div className="bg-[#F87171]/10 p-4 border-t border-[#F87171]/30 text-[#F87171] flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0 text-[#F87171]" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-[#12151A] border border-[#262B33] rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-center mx-auto">
              <div className="size-12 rounded-full bg-[#F87171]/10 border border-[#F87171]/30 flex items-center justify-center mx-auto text-[#F87171]">
                <Lock className="size-6" />
              </div>
              <div>
                <h3 className="font-mono text-base font-bold text-[#E7EAEE]">Authentication Required</h3>
                <p className="text-xs text-[#8B93A1] mt-1 font-sans">You must be signed in to save reports to MongoDB Atlas.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-mono text-xs font-semibold text-[#8B93A1] hover:bg-[#262B33] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLoginPromptAction}
                  className="flex-1 rounded border border-[#4FD8C4] bg-[#4FD8C4] px-4 py-2 font-mono text-xs font-semibold text-[#0A0C0F] hover:bg-[#4FD8C4]/90 transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <AlertCircle className="size-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};