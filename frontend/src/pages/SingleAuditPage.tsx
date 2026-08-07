import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PromptBar } from '../components/PromptBar';
import { AuditReport } from '../components/AuditReport';
import { LoadingTrace } from '../components/LoadingTrace';
import { ErrorBanner } from '../components/ErrorBanner';
import type { AuditResponse } from '../types';
import { runFullAudit } from '../lib/api';

export const SingleAuditPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || '';
  const [loading, setLoading] = useState(false);
  const [targetUrl, setTargetUrl] = useState(initialUrl);
  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasRunInitialAudit = useRef(false);

  const handleAuditSubmit = async (url: string, enableJsRendering = false) => {
    setTargetUrl(url);
    setError(null);
    setLoading(true);
    setAuditResult(null);

    try {
      const result = await runFullAudit(url, enableJsRendering);
      setAuditResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'The site refused the connection or returned an error.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialUrl && !auditResult && !loading && !hasRunInitialAudit.current) {
      hasRunInitialAudit.current = true;
      handleAuditSubmit(initialUrl);
    }
  }, [initialUrl, auditResult, loading]);

  return (
    <div className="space-y-6">
      <PromptBar onAuditSubmit={handleAuditSubmit} isLoading={loading} />
      {loading && <LoadingTrace targetUrl={targetUrl} />}
      {error && <ErrorBanner message={error} />}
      {auditResult && !loading && <AuditReport audit={auditResult} />}
    </div>
  );
};