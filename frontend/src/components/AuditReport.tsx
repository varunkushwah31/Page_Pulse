import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AuditResponse } from '../types';
import { saveReportToMongo, getPdfDownloadUrl } from '../lib/api';
import { Download, Database, Lock, AlertCircle } from 'lucide-react';

interface AuditReportProps {
  audit: AuditResponse;
}

const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'text-success border-success/30 bg-success/10';
  if (status >= 300 && status < 400) return 'text-info border-info/30 bg-info/10';
  if (status >= 400 && status < 500) return 'text-warning border-warning/30 bg-warning/10';
  return 'text-destructive border-destructive/30 bg-destructive/10';
};

export const AuditReport: React.FC<AuditReportProps> = ({ audit }) => {
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!localStorage.getItem('pagepulse_token');

  const handleSaveToMongo = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    setSaving(true);
    try {
      const doc = await saveReportToMongo(audit.id);
      setSavedMessage(`Audit stored permanently in MongoDB! (ID: ${doc.id})`);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
        setShowLoginPrompt(true);
      } else {
        setSavedMessage(err instanceof Error ? err.message : 'Failed to save to database.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLoginPromptAction = () => {
    setShowLoginPrompt(false);
    navigate('/auth', { state: { from: location.pathname, auditId: audit.id } });
  };

  const handlePdfDownload = () => {
    const url = getPdfDownloadUrl(audit.id.toString());
    window.open(url, '_blank');
  };

  const responseTimeMs = audit.responseTimeMs || 0;
  const timingWidth = Math.min(100, Math.max(5, (responseTimeMs / 3000) * 100));
  const timingColor = responseTimeMs <= 800 ? 'bg-success' : responseTimeMs <= 2000 ? 'bg-warning' : 'bg-destructive';

  const seoMetrics = audit.seoMetrics || {};
  const contentMetrics = audit.contentMetrics || {};
  const accessibilityMetrics = audit.accessibilityMetrics || {};
  const scores = audit.scores || {};

  const pageTitle = seoMetrics.pageTitle || null;
  const metaDescription = seoMetrics.metaDescription || null;
  const h1Count = contentMetrics.headingCounts?.['h1'] ?? 0;
  const imagesMissingAlt = accessibilityMetrics.imagesMissingAltCount ?? 0;
  const wordCount = contentMetrics.wordCount ?? 0;

  const overallScore = scores.overallScore ?? 0;
  const seoScore = scores.seoScore ?? 0;
  const contentScore = scores.contentScore ?? 0;
  const accessibilityScore = scores.accessibilityScore ?? 0;
  const performanceScore = scores.performanceScore ?? 0;
  const healthGrade = scores.healthGrade || 'POOR';

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT': return 'text-success border-success/30 bg-success/10';
      case 'GOOD': return 'text-info border-info/30 bg-info/10';
      case 'NEEDS_IMPROVEMENT': return 'text-warning border-warning/30 bg-warning/10';
      default: return 'text-destructive border-destructive/30 bg-destructive/10';
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl space-y-0">
      {/* Report Header Strip */}
      <div className="bg-popover px-5 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Audit Target
          </span>
          <div className="font-mono text-sm text-foreground font-medium break-all">{audit.url}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs font-bold ${getStatusColor(audit.httpStatus)}`}>
            HTTP {audit.httpStatus}
          </span>
        </div>
      </div>

      {/* Health Grade & Score Summary */}
      <div className="p-5 border-b border-border grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Overall Health Grade
          </span>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs font-bold ${getGradeColor(healthGrade)}`}>
              {healthGrade.replace('_', ' ')}
            </span>
            <span className="font-mono text-2xl font-bold text-foreground">{overallScore}/100</span>
          </div>
        </div>
        <div className="text-center">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground block mb-1">SEO</span>
          <span className="font-mono text-xl font-bold text-foreground">{seoScore}</span>
        </div>
        <div className="text-center">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Content</span>
          <span className="font-mono text-xl font-bold text-foreground">{contentScore}</span>
        </div>
        <div className="text-center">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground block mb-1">A11y</span>
          <span className="font-mono text-xl font-bold text-foreground">{accessibilityScore}</span>
        </div>
        <div className="text-center">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Perf</span>
          <span className="font-mono text-xl font-bold text-foreground">{performanceScore}</span>
        </div>
      </div>

      {/* Key Performance Metrics Bar */}
      <div className="p-5 border-b border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-baseline font-mono text-xs mb-1">
            <span className="text-muted-foreground">Response Time</span>
            <span className="text-foreground font-semibold">{responseTimeMs} ms</span>
          </div>
          <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
            <div className={`h-full ${timingColor} transition-all duration-300`} style={{ width: `${timingWidth}%` }}></div>
          </div>
        </div>

        <div className="flex flex-col justify-center font-mono text-xs">
          <span className="text-muted-foreground">Content Type</span>
          <span className="text-foreground font-semibold mt-1 truncate">{audit.contentType || 'text/html'}</span>
        </div>
      </div>

      {/* Detailed Page-level Rows */}
      <div className="divide-y divide-border">
        {/* Page Title */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[var(--text-faint)] uppercase tracking-wider">
            Page Title
          </div>
          <div className="flex-1 font-sans text-sm text-foreground">
            {pageTitle ? (
              <span>{pageTitle}</span>
            ) : (
              <span className="font-mono text-xs italic text-muted-foreground">No {'<title>'} found</span>
            )}
          </div>
        </div>

        {/* Meta Description */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[var(--text-faint)] uppercase tracking-wider">
            Meta Description
          </div>
          <div className="flex-1 font-sans text-sm text-foreground leading-relaxed">
            {metaDescription ? (
              <span>{metaDescription}</span>
            ) : (
              <span className="font-mono text-xs italic text-muted-foreground">No meta description found</span>
            )}
          </div>
        </div>

        {/* H1 Count */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[var(--text-faint)] uppercase tracking-wider">
            H1 Heading Count
          </div>
          <div className="flex-1">
            <span className={`inline-flex items-center rounded px-2.5 py-0.5 font-mono text-xs font-bold ${h1Count === 1 ? 'bg-success/10 text-success border border-success/30' : 'bg-warning/10 text-warning border border-warning/30'}`}>
              {h1Count} {h1Count === 1 ? 'H1 tag' : 'H1 tags'}
            </span>
          </div>
        </div>

        {/* Missing Alt Images */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[var(--text-faint)] uppercase tracking-wider">
            Missing Alt Images
          </div>
          <div className="flex-1">
            <span className={`inline-flex items-center rounded px-2.5 py-0.5 font-mono text-xs font-bold ${imagesMissingAlt === 0 ? 'bg-success/10 text-success border border-success/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
              {imagesMissingAlt} missing alt {imagesMissingAlt === 1 ? 'tag' : 'tags'}
            </span>
          </div>
        </div>

        {/* Word Count */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
          <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[var(--text-faint)] uppercase tracking-wider">
            Approx. Word Count
          </div>
          <div className="flex-1 font-mono text-sm font-semibold text-foreground">
            {wordCount} words
          </div>
        </div>

        {/* Additional SEO Metrics */}
        {seoMetrics.canonicalUrl && (
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-6">
            <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[var(--text-faint)] uppercase tracking-wider">
              Canonical URL
            </div>
            <div className="flex-1 font-sans text-sm text-foreground break-all">
              <span>{seoMetrics.canonicalUrl}</span>
            </div>
          </div>
        )}

        {seoMetrics.robotsDirective && (
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
            <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[var(--text-faint)] uppercase tracking-wider">
              Robots Directive
            </div>
            <div className="flex-1">
              <span className="inline-flex items-center rounded px-2.5 py-0.5 font-mono text-xs font-bold bg-muted/50 text-muted-foreground border border-border">
                {seoMetrics.robotsDirective}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Save Action Bar */}
      <div className="bg-popover p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted-foreground">
          {savedMessage || 'Promote this audit to permanent cloud persistence.'}
        </span>

        <div className="flex items-center gap-2">
          {savedMessage ? (
            <span className="inline-flex items-center rounded border border-success/30 bg-success/10 px-3 py-1.5 font-mono text-xs font-semibold text-success">
              <Database className="size-3 mr-1" />
              Saved to MongoDB
            </span>
          ) : (
            <>
              <button
                onClick={handlePdfDownload}
                className="rounded border border-input bg-popover px-3 py-1.5 font-mono text-xs font-semibold text-primary hover:bg-accent transition-all cursor-pointer"
              >
                <Download className="size-3 mr-1" />
                PDF
              </button>
              <button
                onClick={handleSaveToMongo}
                disabled={saving}
                className="rounded border border-input bg-card px-4 py-2 font-mono text-xs font-semibold text-primary hover:border-primary hover:bg-accent transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save to Database'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-center mx-auto">
              <div className="size-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto">
                <Lock className="size-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-mono text-lg font-semibold text-foreground">Authentication Required</h3>
                <p className="text-sm text-muted-foreground mt-1">You must be logged in to save audits to the database.</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Save this audit report to your personal MongoDB collection for future reference and comparison.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 rounded border border-input bg-popover px-4 py-2 font-mono text-xs font-semibold text-muted-foreground hover:bg-accent transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLoginPromptAction}
                  className="flex-1 rounded border border-primary bg-primary px-4 py-2 font-mono text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <AlertCircle className="size-3 mr-1 inline-block" />
                  Sign In to Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};