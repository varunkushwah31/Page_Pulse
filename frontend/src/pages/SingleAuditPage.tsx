import React, { useState, useEffect } from 'react';
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

  const handleAuditSubmit = async (url: string) => {
    setTargetUrl(url);
    setError(null);
    setLoading(true);
    setAuditResult(null);

    try {
      const result = await runFullAudit(url);
      setAuditResult(result);
    } catch (err: any) {
      setError(err.message || 'The site refused the connection or returned an error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialUrl && !auditResult && !loading) {
      handleAuditSubmit(initialUrl);
    }
  }, [initialUrl]);

  return (
    <div className="space-y-6">
      <PromptBar onAuditSubmit={handleAuditSubmit} isLoading={loading} />
      {loading && <LoadingTrace targetUrl={targetUrl} />}
      {error && <ErrorBanner message={error} />}
      {auditResult && !loading && <AuditReport audit={auditResult} />}
    </div>
  );
};
