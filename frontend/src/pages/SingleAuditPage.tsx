import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PromptBar } from '../components/PromptBar';
import { AuditReport } from '../components/AuditReport';
import { LoadingTrace } from '../components/LoadingTrace';
import { ErrorBanner } from '../components/ErrorBanner';
import type { AuditResponse } from '../types';
import { streamFullAuditProgress } from '../lib/api';
import { LightningIcon } from '@phosphor-icons/react';

export const SingleAuditPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || '';
  const [loading, setLoading] = useState(false);
  const [targetUrl, setTargetUrl] = useState(initialUrl);
  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const hasRunInitialAudit = useRef(false);

  const handleAuditSubmit = (url: string, enableJsRendering = false) => {
    setTargetUrl(url);
    setError(null);
    setLoading(true);
    setAuditResult(null);
    setProgressPercent(10);
    setProgressMessage('Connecting to Audit Progress Stream...');

    streamFullAuditProgress(
      url,
      enableJsRendering,
      (progressData) => {
        setProgressPercent(progressData.progress);
        setProgressMessage(progressData.message);
      },
      (completeResult) => {
        setAuditResult(completeResult);
        setLoading(false);
      },
      (errMessage) => {
        setError(errMessage);
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    if (initialUrl && !auditResult && !loading && !hasRunInitialAudit.current) {
      hasRunInitialAudit.current = true;
      handleAuditSubmit(initialUrl);
    }
  }, [initialUrl, auditResult, loading]);

  return (
    <div className="space-y-6">
      {/* Page Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262B33] pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <LightningIcon className="size-4 text-[#4FD8C4]" />
          <span className="text-[#565D68]">SITELOOK</span>
          <span className="text-[#565D68]">/</span>
          <h1 className="font-bold text-[#E7EAEE]">SINGLE DOM AUDIT & DIAGNOSTIC ENGINE</h1>
          <span className="rounded bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 px-1.5 py-0.2 text-[9px] font-bold text-[#4FD8C4] uppercase">
            REAL-TIME
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#565D68]">
          SEO, Accessibility, Content Hierarchy & Core Web Vitals
        </span>
      </div>

      <PromptBar 
        onAuditSubmit={handleAuditSubmit} 
        isLoading={loading} 
        progressPercent={progressPercent}
        progressStepMessage={progressMessage}
      />
      {loading && <LoadingTrace targetUrl={targetUrl} />}
      {error && <ErrorBanner message={error} />}
      {auditResult && !loading && <AuditReport audit={auditResult} />}
    </div>
  );
};