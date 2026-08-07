import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PromptBar } from '../components/PromptBar';
import { AuditReport } from '../components/AuditReport';
import { LoadingTrace } from '../components/LoadingTrace';
import { ErrorBanner } from '../components/ErrorBanner';
import type { AuditResponse } from '../types';
import { streamFullAuditProgress } from '../lib/api';

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