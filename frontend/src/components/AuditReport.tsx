import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AuditResponse } from '../types';
import { saveReportToMongo, exportAuditToPdf } from '../lib/api';
import {
  BookOpenIcon,
  CheckIcon,
  CheckCircleIcon,
  CodeIcon,
  CompassIcon,
  CopyIcon,
  CpuIcon,
  DatabaseIcon,
  DesktopIcon,
  DeviceMobileIcon,
  DownloadSimpleIcon,
  GlobeIcon,
  LockIcon,
  MagnifyingGlassIcon,
  StackIcon,
  WarningIcon,
  WarningCircleIcon,
  XCircleIcon
} from '@phosphor-icons/react';
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

const getOverallScoreStrokeColor = (score: number): string => {
  if (score >= 80) return '#4ADE80';
  if (score >= 60) return '#4FD8C4';
  if (score >= 40) return '#FBBF24';
  return '#F87171';
};

const getStructuredDataStatusLabel = (info?: { hasStructuredData?: boolean; validJsonLd?: boolean } | null): string => {
  if (!info?.hasStructuredData) return 'No Schema Found';
  return info.validJsonLd ? 'Valid JSON-LD' : 'Syntax Error';
};

export const AuditReport: React.FC<AuditReportProps> = ({ audit }) => {
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONTENT' | 'SCHEMA' | 'ENGINE' | 'AI_FIXES'>('OVERVIEW');
  const [serpViewMode, setSerpViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!localStorage.getItem('sitelook_token');

  // Keyboard shortcut navigation (1-5 for tabs, Ctrl+S for save, Ctrl+P for PDF)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveToMongo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePdfDownload();
      } else if (e.key === '1') {
        setActiveTab('OVERVIEW');
      } else if (e.key === '2') {
        setActiveTab('CONTENT');
      } else if (e.key === '3') {
        setActiveTab('SCHEMA');
      } else if (e.key === '4') {
        setActiveTab('ENGINE');
      } else if (e.key === '5') {
        setActiveTab('AI_FIXES');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audit]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
        localStorage.removeItem('sitelook_token');
        localStorage.removeItem('sitelook_user');
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
      await exportAuditToPdf(audit);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const seoMetrics = audit.seoMetrics;
  const contentMetrics = audit.contentMetrics;
  const accessibilityMetrics = audit.accessibilityMetrics;
  const perfMetrics = audit.performanceMetrics;
  const scores = audit.scores;

  const pageTitle = seoMetrics?.pageTitle ?? null;
  const metaDescription = seoMetrics?.metaDescription ?? null;

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

  // Radial progress calculations
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  return (
    <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden shadow-2xl space-y-0 font-mono text-xs text-[#E7EAEE]">
      {/* Report Header Strip */}
      <div className="bg-[#191D24] px-5 py-4 border-b border-[#262B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#565D68]">
              Target Host & Domain
            </span>
            {seoMetrics?.charset && (
              <span className="text-[10px] bg-[#262B33] text-[#8B93A1] px-1.5 py-0.2 rounded font-mono">
                {seoMetrics.charset}
              </span>
            )}
          </div>
          <div className="font-mono text-sm text-[#E7EAEE] font-medium break-all">{audit.url}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${getStatusColor(audit.httpStatus)}`}>
            HTTP {audit.httpStatus}
          </span>
          {audit.cached && (
            <span className="rounded bg-[#7AA2F7]/10 border border-[#7AA2F7]/30 px-2 py-0.5 text-[10px] text-[#7AA2F7] font-bold">
              CACHED
            </span>
          )}
        </div>
      </div>

      {/* Health Grade & Radial Meter Breakdown */}
      <div className="p-5 border-b border-[#262B33] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Radial SVG Circular Score Gauge */}
            <div className="relative size-20 flex items-center justify-center shrink-0">
              <svg className="size-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#191D24"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke={getOverallScoreStrokeColor(overallScore)}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-[#E7EAEE] leading-none">{overallScore}</span>
                <span className="text-[9px] text-[#565D68]">/100</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#565D68]">
                Overall Health Grade & Indexability
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold ${getGradeColor(healthGrade)}`}>
                  {healthGrade.replace('_', ' ')}
                </span>

                {seoMetrics?.isIndexable ? (
                  <span className="rounded bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-2.5 py-0.5 text-[11px] text-[#4ADE80] font-bold inline-flex items-center gap-1">
                    <CheckCircleIcon className="size-3" /> Indexable
                  </span>
                ) : (
                  <span className="rounded bg-[#F87171]/10 border border-[#F87171]/30 px-2.5 py-0.5 text-[11px] text-[#F87171] font-bold inline-flex items-center gap-1">
                    <XCircleIcon className="size-3" /> NoIndex Detected
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={downloadingPdf}
              className="rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-3 py-2 font-semibold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              title="Export Report as PDF (Ctrl+P)"
            >
              <DownloadSimpleIcon className="size-3.5" />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveToMongo}
              disabled={saving}
              className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-semibold text-[#E7EAEE] hover:border-[#4FD8C4] hover:text-[#4FD8C4] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              title="Persist Report to MongoDB Atlas (Ctrl+S)"
            >
              <DatabaseIcon className="size-3.5 text-[#4ADE80]" />
              <span>{saving ? 'Saving...' : 'Save to Cloud DB'}</span>
            </button>
          </div>
        </div>

        {/* 4-Way Sub-Score Visual Progress Bars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#8B93A1]">Technical SEO</span>
              <span className="font-bold text-[#4FD8C4]">{seoScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#191D24] rounded-full overflow-hidden">
              <div className="h-full bg-[#4FD8C4] transition-all" style={{ width: `${seoScore}%` }} />
            </div>
          </div>

          <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#8B93A1]">Content & Readability</span>
              <span className="font-bold text-[#7AA2F7]">{contentScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#191D24] rounded-full overflow-hidden">
              <div className="h-full bg-[#7AA2F7] transition-all" style={{ width: `${contentScore}%` }} />
            </div>
          </div>

          <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#8B93A1]">WCAG Accessibility</span>
              <span className="font-bold text-[#4ADE80]">{accessibilityScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#191D24] rounded-full overflow-hidden">
              <div className="h-full bg-[#4ADE80] transition-all" style={{ width: `${accessibilityScore}%` }} />
            </div>
          </div>

          <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#8B93A1]">Performance & Vitals</span>
              <span className="font-bold text-[#FBBF24]">{performanceScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#191D24] rounded-full overflow-hidden">
              <div className="h-full bg-[#FBBF24] transition-all" style={{ width: `${performanceScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation View Switcher Tabs with Keyboard Badges */}
      <div className="flex flex-wrap items-center gap-1 px-5 py-2.5 bg-[#161A20] border-b border-[#262B33]">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'OVERVIEW' ? 'bg-[#191D24] text-[#4FD8C4] border border-[#4FD8C4]/40 shadow' : 'text-[#8B93A1] hover:text-[#E7EAEE]'
          }`}
        >
          <MagnifyingGlassIcon className="size-3.5" />
          <span>SEO & SERP Preview</span>
          <span className="text-[9px] bg-[#0A0C0F] text-[#565D68] px-1 py-0.2 rounded border border-[#262B33]">1</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONTENT')}
          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'CONTENT' ? 'bg-[#191D24] text-[#7AA2F7] border border-[#7AA2F7]/40 shadow' : 'text-[#8B93A1] hover:text-[#E7EAEE]'
          }`}
        >
          <BookOpenIcon className="size-3.5" />
          <span>Editorial & Hierarchy</span>
          <span className="text-[9px] bg-[#0A0C0F] text-[#565D68] px-1 py-0.2 rounded border border-[#262B33]">2</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SCHEMA')}
          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'SCHEMA' ? 'bg-[#191D24] text-[#4ADE80] border border-[#4ADE80]/40 shadow' : 'text-[#8B93A1] hover:text-[#E7EAEE]'
          }`}
        >
          <CodeIcon className="size-3.5" />
          <span>Schema & Social Meta</span>
          <span className="text-[9px] bg-[#0A0C0F] text-[#565D68] px-1 py-0.2 rounded border border-[#262B33]">3</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ENGINE')}
          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'ENGINE' ? 'bg-[#191D24] text-[#FBBF24] border border-[#FBBF24]/40 shadow' : 'text-[#8B93A1] hover:text-[#E7EAEE]'
          }`}
        >
          <CpuIcon className="size-3.5" />
          <span>Advanced Diagnostics</span>
          <span className="text-[9px] bg-[#0A0C0F] text-[#565D68] px-1 py-0.2 rounded border border-[#262B33]">4</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AI_FIXES')}
          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'AI_FIXES' ? 'bg-[#191D24] text-[#4FD8C4] border border-[#4FD8C4]/40 shadow' : 'text-[#8B93A1] hover:text-[#E7EAEE]'
          }`}
        >
          <CompassIcon className="size-3.5" />
          <span>AI Recommendations</span>
          <span className="text-[9px] bg-[#0A0C0F] text-[#565D68] px-1 py-0.2 rounded border border-[#262B33]">5</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TECHNICAL SEO */}
      {activeTab === 'OVERVIEW' && (
        <div className="divide-y divide-[#262B33]">
          {/* SERP Simulator Card with Desktop / Mobile Toggle */}
          {seoMetrics?.serpPreview && (
            <div className="p-5 bg-[#0A0C0F]/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#4FD8C4] flex items-center gap-1.5">
                  <MagnifyingGlassIcon className="size-3.5" /> Google Search SERP Simulator
                </span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#12151A] border border-[#262B33] rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setSerpViewMode('desktop')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        serpViewMode === 'desktop'
                          ? 'bg-[#191D24] text-[#4FD8C4] border border-[#333A45]'
                          : 'text-[#8B93A1] hover:text-[#E7EAEE]'
                      }`}
                    >
                      <DesktopIcon className="size-3" />
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerpViewMode('mobile')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        serpViewMode === 'mobile'
                          ? 'bg-[#191D24] text-[#4FD8C4] border border-[#333A45]'
                          : 'text-[#8B93A1] hover:text-[#E7EAEE]'
                      }`}
                    >
                      <DeviceMobileIcon className="size-3" />
                      <span>Mobile</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-[#8B93A1]">
                    Pixel width: {seoMetrics.serpPreview.titlePixelWidth}px / 600px
                  </span>
                </div>
              </div>

              {/* SERP Preview Box */}
              <div
                className={`bg-[#12151A] p-4 rounded-xl border border-[#262B33] font-sans space-y-1 transition-all ${
                  serpViewMode === 'mobile' ? 'max-w-sm border-l-4 border-l-[#4FD8C4]' : 'max-w-2xl'
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-[#8B93A1]">
                  <GlobeIcon className="size-3 text-[#4ADE80]" />
                  <span className="text-[#8B93A1] font-mono text-[11px] truncate">{seoMetrics.serpPreview.displayedUrl}</span>
                </div>
                <h4 className="text-[#7AA2F7] text-base font-medium hover:underline cursor-pointer">
                  {seoMetrics.serpPreview.displayedTitle}
                </h4>
                <p className="text-xs text-[#A9B1D6] leading-relaxed">
                  {seoMetrics.serpPreview.displayedDescription}
                </p>
              </div>
            </div>
          )}

          {/* Page Title Row with 1-Click Copy */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
            <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider flex items-center justify-between">
              <span>Title Tag ({seoMetrics?.titleLength ?? 0})</span>
              {pageTitle && (
                <button
                  type="button"
                  onClick={() => handleCopy(pageTitle, 'title')}
                  className="text-[#8B93A1] hover:text-[#4FD8C4] cursor-pointer p-0.5"
                  title="Copy Title"
                >
                  {copiedField === 'title' ? <CheckIcon className="size-3 text-[#4ADE80]" /> : <CopyIcon className="size-3" />}
                </button>
              )}
            </div>
            <div className="flex-1 font-sans text-sm text-[#E7EAEE]">
              {pageTitle ? (
                <div className="space-y-1">
                  <span>{pageTitle}</span>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                    {seoMetrics && seoMetrics.titleLength >= 30 && seoMetrics.titleLength <= 60 ? (
                      <span className="text-[#4ADE80] bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-2 py-0.5 rounded">
                        Optimal Length (30–60 chars)
                      </span>
                    ) : (
                      <span className="text-[#FBBF24] bg-[#FBBF24]/10 border border-[#FBBF24]/30 px-2 py-0.5 rounded">
                        {seoMetrics && seoMetrics.titleLength > 60 ? 'Too Long (Will Truncate)' : 'Too Short'}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="font-mono text-xs italic text-[#F87171]">No {'<title>'} found</span>
              )}
            </div>
          </div>

          {/* Meta Description Row with 1-Click Copy */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
            <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider flex items-center justify-between">
              <span>Description ({seoMetrics?.descriptionLength ?? 0})</span>
              {metaDescription && (
                <button
                  type="button"
                  onClick={() => handleCopy(metaDescription, 'description')}
                  className="text-[#8B93A1] hover:text-[#4FD8C4] cursor-pointer p-0.5"
                  title="Copy Description"
                >
                  {copiedField === 'description' ? <CheckIcon className="size-3 text-[#4ADE80]" /> : <CopyIcon className="size-3" />}
                </button>
              )}
            </div>
            <div className="flex-1 font-sans text-sm text-[#E7EAEE] leading-relaxed">
              {metaDescription ? (
                <div className="space-y-1">
                  <span>{metaDescription}</span>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                    {seoMetrics && seoMetrics.descriptionLength >= 120 && seoMetrics.descriptionLength <= 160 ? (
                      <span className="text-[#4ADE80] bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-2 py-0.5 rounded">
                        Optimal SERP Snippet Length (120–160 chars)
                      </span>
                    ) : (
                      <span className="text-[#FBBF24] bg-[#FBBF24]/10 border border-[#FBBF24]/30 px-2 py-0.5 rounded">
                        {seoMetrics && seoMetrics.descriptionLength > 160 ? 'Truncated on SERP (>160 chars)' : 'Brief Description (<120 chars)'}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="font-mono text-xs italic text-[#F87171]">No meta description tag found</span>
              )}
            </div>
          </div>

          {/* Canonical & Hreflang Row */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
            <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider">
              Canonical & Indexing
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#8B93A1]">Canonical Status:</span>
                <span className="rounded bg-[#191D24] border border-[#262B33] px-2 py-0.5 text-xs text-[#4FD8C4] font-bold">
                  {seoMetrics?.canonicalStatus || 'MISSING'}
                </span>
                {seoMetrics?.canonicalUrl && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#8B93A1] font-mono break-all">{seoMetrics.canonicalUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(seoMetrics.canonicalUrl!, 'canonical')}
                      className="text-[#8B93A1] hover:text-[#4FD8C4] cursor-pointer p-0.5"
                      title="Copy Canonical URL"
                    >
                      {copiedField === 'canonical' ? <CheckIcon className="size-3 text-[#4ADE80]" /> : <CopyIcon className="size-3" />}
                    </button>
                  </div>
                )}
              </div>

              {seoMetrics?.hreflangTags && Object.keys(seoMetrics.hreflangTags).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[#8B93A1] text-[11px]">Hreflang Directives ({Object.keys(seoMetrics.hreflangTags).length}):</span>
                  {Object.entries(seoMetrics.hreflangTags).map(([lang, url]) => (
                    <span key={lang} className="rounded bg-[#0A0C0F] border border-[#262B33] px-2 py-0.5 text-[10px] text-[#E7EAEE]" title={url}>
                      {lang}
                    </span>
                  ))}
                  {seoMetrics.hasXDefaultHreflang && (
                    <span className="rounded bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-2 py-0.5 text-[10px] text-[#4ADE80] font-bold">
                      x-default present
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Core Technical Flags Row */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
            <div className="w-full sm:w-[180px] shrink-0 text-xs text-[#565D68] uppercase tracking-wider">
              Compliance Signals
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${seoMetrics?.hasViewportMeta ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'}`}>
                {seoMetrics?.hasViewportMeta ? <CheckCircleIcon className="size-3" /> : <XCircleIcon className="size-3" />}
                <span>Mobile Viewport Meta</span>
              </span>

              <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${seoMetrics?.hasFavicon ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30'}`}>
                {seoMetrics?.hasFavicon ? <CheckCircleIcon className="size-3" /> : <WarningIcon className="size-3" />}
                <span>Favicon Icon</span>
              </span>

              <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${accessibilityMetrics?.hasHtmlLangAttribute ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'}`}>
                {accessibilityMetrics?.hasHtmlLangAttribute ? <CheckCircleIcon className="size-3" /> : <XCircleIcon className="size-3" />}
                <span>HTML Lang: {accessibilityMetrics?.htmlLangValue || 'missing'}</span>
              </span>

              <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${perfMetrics?.hasCompression ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#191D24] text-[#8B93A1] border border-[#262B33]'}`}>
                {perfMetrics?.hasCompression ? <CheckCircleIcon className="size-3" /> : <WarningIcon className="size-3" />}
                <span>Compression ({perfMetrics?.contentEncoding || 'none'})</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTENT & EDITORIAL READABILITY */}
      {activeTab === 'CONTENT' && (
        <div className="p-5 space-y-6">
          {/* Readability Score Dashboard */}
          {contentMetrics?.readabilityMetrics && (
            <div className="rounded-xl border border-[#262B33] bg-[#0A0C0F] p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
                <div className="flex items-center gap-2">
                  <BookOpenIcon className="size-4 text-[#7AA2F7]" />
                  <h3 className="font-bold text-[#E7EAEE] text-sm">Linguistic Readability & Content Health</h3>
                </div>
                <span className="rounded bg-[#7AA2F7]/10 border border-[#7AA2F7]/30 px-2.5 py-0.5 text-xs text-[#7AA2F7] font-bold">
                  {contentMetrics.readabilityMetrics.readingEaseLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                  <span className="text-[10px] text-[#8B93A1] uppercase font-semibold">Flesch Reading Ease</span>
                  <div className="text-xl font-extrabold text-[#4ADE80]">
                    {contentMetrics.readabilityMetrics.fleschKincaidReadingEase} / 100
                  </div>
                </div>

                <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                  <span className="text-[10px] text-[#8B93A1] uppercase font-semibold">FK Grade Level</span>
                  <div className="text-xl font-extrabold text-[#7AA2F7]">
                    Grade {contentMetrics.readabilityMetrics.fleschKincaidGradeLevel}
                  </div>
                </div>

                <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                  <span className="text-[10px] text-[#8B93A1] uppercase font-semibold">Avg Words / Sentence</span>
                  <div className="text-xl font-extrabold text-[#E7EAEE]">
                    {contentMetrics.readabilityMetrics.averageWordsPerSentence}
                  </div>
                </div>

                <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1">
                  <span className="text-[10px] text-[#8B93A1] uppercase font-semibold">Complex Words Ratio</span>
                  <div className="text-xl font-extrabold text-[#FBBF24]">
                    {contentMetrics.readabilityMetrics.complexWordsPercentage}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Heading Structure & Tree */}
          <div className="rounded-xl border border-[#262B33] bg-[#0A0C0F] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#262B33] pb-2">
              <div className="flex items-center gap-2">
                <StackIcon className="size-4 text-[#4FD8C4]" />
                <h3 className="font-bold text-[#E7EAEE] text-sm">Heading Hierarchy (H1-H6)</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${contentMetrics?.hasValidHeadingHierarchy ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30'}`}>
                {contentMetrics?.hasValidHeadingHierarchy ? 'Valid Hierarchy' : 'Hierarchy Warnings'}
              </span>
            </div>

            {contentMetrics?.headingIssues && contentMetrics.headingIssues.length > 0 && (
              <div className="p-3 bg-[#FBBF24]/5 border border-[#FBBF24]/20 rounded-lg space-y-1 text-xs text-[#FBBF24]">
                {contentMetrics.headingIssues.map((issue) => (
                  <div key={issue} className="flex items-center gap-1.5">
                    <span>⚠</span> <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5 max-h-60 overflow-y-auto pt-1">
              {contentMetrics?.headingHierarchy?.map((node, idx) => (
                <div
                  key={`${node.tag}-${node.text}-${idx}`}
                  className="flex items-center justify-between p-2 rounded bg-[#12151A] border border-[#262B33] text-xs"
                  style={{ marginLeft: `${(node.level - 1) * 16}px` }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="px-1.5 py-0.5 rounded bg-[#191D24] text-[#4FD8C4] font-bold text-[10px] uppercase">
                      {node.tag}
                    </span>
                    <span className="text-[#E7EAEE] font-sans truncate">{node.text || '(empty heading)'}</span>
                  </div>
                  {node.issues.length > 0 && (
                    <span className="text-[10px] text-[#F87171] border border-[#F87171]/30 bg-[#F87171]/10 px-1.5 rounded">
                      {node.issues.join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Top Keywords / N-Grams */}
          {contentMetrics?.topKeywords && contentMetrics.topKeywords.length > 0 && (
            <div className="rounded-xl border border-[#262B33] bg-[#0A0C0F] p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase text-[#8B93A1] block">
                Top N-Gram Key Phrases & Density
              </span>
              <div className="flex flex-wrap gap-2">
                {contentMetrics.topKeywords.map((kw) => (
                  <span
                    key={kw.phrase}
                    className={`rounded border px-2.5 py-1 text-xs inline-flex items-center gap-1.5 ${
                      kw.isStuffingWarning
                        ? 'bg-[#F87171]/10 border-[#F87171]/30 text-[#F87171]'
                        : 'bg-[#12151A] border-[#262B33] text-[#E7EAEE]'
                    }`}
                  >
                    <span className="font-semibold">{kw.phrase}</span>
                    <span className="text-[10px] text-[#8B93A1]">({kw.count}x / {kw.densityPercentage}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SCHEMA & SOCIAL METADATA */}
      {activeTab === 'SCHEMA' && (
        <div className="p-5 space-y-6">
          {/* Schema.org Deep Inspection */}
          <div className="rounded-xl border border-[#262B33] bg-[#0A0C0F] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
              <div className="flex items-center gap-2">
                <CodeIcon className="size-4 text-[#4ADE80]" />
                <h3 className="font-bold text-[#E7EAEE] text-sm">Schema.org JSON-LD Structured Data</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${seoMetrics?.structuredDataInfo?.validJsonLd ? 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'}`}>
                {getStructuredDataStatusLabel(seoMetrics?.structuredDataInfo)}
              </span>
            </div>

            {seoMetrics?.structuredDataInfo?.detectedSchemaTypes && seoMetrics.structuredDataInfo.detectedSchemaTypes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#8B93A1]">Detected Schema Types:</span>
                  {seoMetrics.structuredDataInfo.detectedSchemaTypes.map((type) => (
                    <span key={type} className="rounded bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-2 py-0.5 text-xs text-[#4ADE80] font-bold">
                      @{type}
                    </span>
                  ))}
                </div>

                {seoMetrics.structuredDataInfo.rawJsonLdSnippets.map((snippet, idx) => (
                  <div key={`${snippet.slice(0, 20)}-${idx}`} className="relative group">
                    <pre className="p-3 bg-[#12151A] rounded border border-[#262B33] text-[11px] text-[#A9B1D6] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                      {snippet}
                    </pre>
                    <button
                      type="button"
                      onClick={() => handleCopy(snippet, `jsonld-${idx}`)}
                      className="absolute top-2 right-2 rounded bg-[#191D24] border border-[#262B33] p-1.5 text-[#8B93A1] hover:text-[#4FD8C4] transition-all cursor-pointer"
                      title="Copy JSON-LD Schema"
                    >
                      {copiedField === `jsonld-${idx}` ? <CheckIcon className="size-3 text-[#4ADE80]" /> : <CopyIcon className="size-3" />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded bg-[#12151A] text-xs text-[#8B93A1]">
                No structured schema markup detected. Adding JSON-LD schemas unlocks rich snippets in Google search results.
              </div>
            )}
          </div>

          {/* OpenGraph & Twitter Cards Checklist */}
          <div className="rounded-xl border border-[#262B33] bg-[#0A0C0F] p-4 space-y-4">
            <h3 className="font-bold text-[#E7EAEE] text-sm border-b border-[#262B33] pb-2">
              Social Media OpenGraph & Twitter Card Tags
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#12151A] rounded border border-[#262B33] space-y-2">
                <span className="text-xs font-bold text-[#7AA2F7] block">OpenGraph Protocol (og:*)</span>
                <div className="space-y-1 text-xs">
                  {seoMetrics?.openGraphTags && Object.keys(seoMetrics.openGraphTags).length > 0 ? (
                    Object.entries(seoMetrics.openGraphTags).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-[11px] border-b border-[#191D24] py-1">
                        <span className="text-[#8B93A1]">{k}</span>
                        <span className="text-[#E7EAEE] font-sans truncate max-w-[200px]" title={v}>{v}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-[#F87171]">Missing OpenGraph tags</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-[#12151A] rounded border border-[#262B33] space-y-2">
                <span className="text-xs font-bold text-[#4FD8C4] block">Twitter / X Cards (twitter:*)</span>
                <div className="space-y-1 text-xs">
                  {seoMetrics?.twitterCardTags && Object.keys(seoMetrics.twitterCardTags).length > 0 ? (
                    Object.entries(seoMetrics.twitterCardTags).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-[11px] border-b border-[#191D24] py-1">
                        <span className="text-[#8B93A1]">{k}</span>
                        <span className="text-[#E7EAEE] font-sans truncate max-w-[200px]" title={v}>{v}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-[#F87171]">Missing Twitter card tags</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ADVANCED DIAGNOSTICS & ENGINES */}
      {activeTab === 'ENGINE' && (
        <div className="p-5 space-y-6">
          <AdvancedEngineConsole audit={audit} />
          {((audit.accessibilityMetrics?.domIssues && audit.accessibilityMetrics.domIssues.length > 0) ||
            (audit.seoMetrics?.domIssues && audit.seoMetrics.domIssues.length > 0)) && (
            <div className="space-y-4 pt-4 border-t border-[#262B33]">
              {audit.accessibilityMetrics?.domIssues && audit.accessibilityMetrics.domIssues.length > 0 && (
                <DomInspectorConsole issues={audit.accessibilityMetrics.domIssues} title="Accessibility DOM Visual Inspector" />
              )}
              {audit.seoMetrics?.domIssues && audit.seoMetrics.domIssues.length > 0 && (
                <DomInspectorConsole issues={audit.seoMetrics.domIssues} title="SEO DOM Visual Inspector" />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AI RECOMMENDATIONS */}
      {activeTab === 'AI_FIXES' && (
        <div className="p-5">
          <AiFixConsole audit={audit} />
        </div>
      )}

      {/* Permanent Save Confirmation Footer */}
      {savedMessage && (
        <div className="bg-[#4ADE80]/10 p-4 border-t border-[#4ADE80]/30 text-[#4ADE80] flex items-center gap-2">
          <CheckCircleIcon className="size-4 shrink-0 text-[#4ADE80]" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Save Error Footer */}
      {saveError && (
        <div className="bg-[#F87171]/10 p-4 border-t border-[#F87171]/30 text-[#F87171] flex items-center gap-2">
          <WarningCircleIcon className="size-4 shrink-0 text-[#F87171]" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-[#12151A] border border-[#262B33] rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-center mx-auto">
              <div className="size-12 rounded-full bg-[#F87171]/10 border border-[#F87171]/30 flex items-center justify-center mx-auto text-[#F87171]">
                <LockIcon className="size-6" />
              </div>
              <div>
                <h3 className="font-mono text-base font-bold text-[#E7EAEE]">Authentication Required</h3>
                <p className="text-xs text-[#8B93A1] mt-1 font-sans">You must be signed in to save reports to MongoDB Atlas.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-mono text-xs font-semibold text-[#8B93A1] hover:bg-[#262B33] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLoginPromptAction}
                  className="flex-1 rounded border border-[#4FD8C4] bg-[#4FD8C4] px-4 py-2 font-mono text-xs font-semibold text-[#0A0C0F] hover:bg-[#4FD8C4]/90 transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <WarningCircleIcon className="size-3.5" />
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