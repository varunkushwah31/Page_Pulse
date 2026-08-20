import type {
  AuditResponse,
  AuditReportDocument,
  SitemapAuditResponse,
  SitemapDeltaResponse,
  PdfBrandingConfig,
  PlatformStatsResponse,
  TrendResponse,
  ScheduledAuditConfig,
  ScheduledAuditRequest,
  ApiKeyResponse,
  AiRecommendation,
  BatchAuditResponse,
  CompetitorComparisonResponse,
} from '../types';

const API_BASE = '';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('pagepulse_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export async function runFullAudit(url: string, enableJsRendering = false): Promise<AuditResponse> {
  const response = await fetch(`${API_BASE}/api/audit/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, enableJsRendering }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Audit failed' }));
    throw new Error(errorData.message || 'Audit failed');
  }
  return response.json();
}

export function streamFullAuditProgress(
  url: string,
  enableJsRendering: boolean,
  onProgress: (data: { progress: number; step: string; message: string }) => void,
  onComplete: (data: AuditResponse) => void,
  onError: (err: string) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/api/audit/stream?url=${encodeURIComponent(url)}&enableJsRendering=${enableJsRendering}`);

  eventSource.addEventListener('PROGRESS', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      onProgress(data);
    } catch (e) {
      console.error('Failed to parse SSE progress:', e);
    }
  });

  eventSource.addEventListener('COMPLETE', (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data);
      onProgress({ progress: 100, step: 'COMPLETE', message: 'Audit completed.' });
      onComplete(payload.data);
      eventSource.close();
    } catch (e) {
      console.error('Failed to parse SSE complete:', e);
      onError('Failed to parse audit response payload.');
      eventSource.close();
    }
  });

  eventSource.addEventListener('ERROR', (event: MessageEvent) => {
    try {
      const errorData = JSON.parse(event.data);
      onError(errorData.message || 'Streaming audit failed.');
    } catch (e) {
      console.warn('Failed to parse SSE error payload:', e);
      onError('Audit stream disconnected unexpectedly.');
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    onError('Connection error during audit stream.');
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function fetchKeywordGap(urlA: string, urlB: string) {
  const response = await fetch(`${API_BASE}/api/v1/competitor/keyword-gap?urlA=${encodeURIComponent(urlA)}&urlB=${encodeURIComponent(urlB)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to analyze keyword gap' }));
    throw new Error(err.message || 'Failed to analyze keyword gap');
  }
  return response.json();
}

export async function saveReportToMongo(tempId: number): Promise<AuditReportDocument> {
  const response = await fetch(`${API_BASE}/api/audit/save/${tempId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_REQUIRED');
    }
    const errorData = await response.json().catch(() => ({ message: 'Failed to save report to MongoDB' }));
    throw new Error(errorData.message || 'Failed to save report to MongoDB');
  }
  return response.json();
}

export async function fetchSavedReports(page = 0, size = 10): Promise<{ content: AuditReportDocument[]; totalElements: number }> {
  const response = await fetch(`${API_BASE}/api/v1/reports?page=${page}&size=${size}`);
  if (!response.ok) {
    throw new Error('Failed to fetch saved reports');
  }
  return response.json();
}

export async function deleteSavedReport(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete saved report');
  }
}

export async function fetchPlatformStats(): Promise<PlatformStatsResponse> {
  const response = await fetch(`${API_BASE}/api/v1/reports/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch platform stats');
  }
  return response.json();
}

export async function auditSitemap(sitemapUrl: string, maxUrls = 15): Promise<SitemapAuditResponse> {
  const response = await fetch(`${API_BASE}/api/v1/sitemap/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sitemapUrl, maxUrls }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Sitemap audit failed' }));
    throw new Error(errorData.message || 'Sitemap audit failed');
  }
  return response.json();
}

export async function fetchSitemapDelta(sitemapUrl: string): Promise<SitemapDeltaResponse> {
  const response = await fetch(`${API_BASE}/api/v1/sitemap/delta?sitemapUrl=${encodeURIComponent(sitemapUrl)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch sitemap delta' }));
    throw new Error(errorData.message || 'Failed to fetch sitemap delta');
  }
  return response.json();
}

export function getPdfDownloadUrl(reportId: string): string {
  return `${API_BASE}/api/v1/reports/${reportId}/pdf`;
}

export async function exportAuditToPdf(
  audit: AuditResponse,
  branding?: PdfBrandingConfig,
  customFilename?: string
): Promise<void> {
  const url = `${API_BASE}/api/v1/reports/pdf/export`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ audit, branding }),
  });

  if (!response.ok) {
    // If direct export fails, fallback to ID lookup if available
    if (audit.id) {
      return downloadPdfReport(audit.id.toString(), customFilename);
    }
    const errorData = await response.json().catch(() => ({ message: 'Failed to generate comprehensive PDF audit report' }));
    throw new Error(errorData.message || 'Failed to generate comprehensive PDF audit report');
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  const domain = audit.domain ? audit.domain.replace(/[^a-zA-Z0-9.-]/g, '_') : 'web';
  a.download = customFilename || `audit-report-${domain}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function downloadPdfReport(reportId: string, customFilename?: string, audit?: AuditResponse): Promise<void> {
  if (audit) {
    try {
      return await exportAuditToPdf(audit, undefined, customFilename);
    } catch (e) {
      console.warn('Direct PDF export failed, falling back to ID download:', e);
    }
  }

  const url = getPdfDownloadUrl(reportId);
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to download PDF report' }));
    throw new Error(errorData.message || 'Failed to download PDF report');
  }
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = customFilename || `audit-report-${reportId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function downloadCustomPdfReport(reportId: string, branding: PdfBrandingConfig, customFilename?: string): Promise<void> {
  const url = `${API_BASE}/api/v1/reports/${reportId}/pdf`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(branding),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to download custom PDF report' }));
    throw new Error(errorData.message || 'Failed to download custom PDF report');
  }
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = customFilename || `audit-report-${reportId}-custom.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function registerUser(username: string, email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: { id: number; username: string; email: string; role: string } }> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
    throw new Error(errorData.message || 'Registration failed');
  }
  return response.json();
}

export async function loginUser(usernameOrEmail: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: { id: number; username: string; email: string; role: string } }> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Invalid credentials' }));
    throw new Error(errorData.message || 'Invalid credentials');
  }
  return response.json();
}

export async function fetchDomainTrends(domain: string, metric = 'overallScore', days = 30): Promise<TrendResponse> {
  let cleanDomain = domain.trim();
  try {
    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
      const parsed = new URL(cleanDomain);
      cleanDomain = parsed.hostname;
    } else if (cleanDomain.includes('/')) {
      cleanDomain = cleanDomain.split('/')[0];
    }
  } catch (_) {}

  const response = await fetch(`${API_BASE}/api/v1/reports/${encodeURIComponent(cleanDomain)}/trends?metric=${metric}&days=${days}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Trend data lookup failed for domain.' }));
    throw new Error(errorData.message || 'Trend data lookup failed for domain.');
  }
  return response.json();
}

export async function fetchScheduledAudits(): Promise<ScheduledAuditConfig[]> {
  const response = await fetch(`${API_BASE}/api/v1/scheduled-audits`);
  if (!response.ok) {
    throw new Error('Failed to fetch scheduled audit monitors.');
  }
  return response.json();
}

export async function createScheduledAudit(data: ScheduledAuditRequest): Promise<ScheduledAuditConfig> {
  const response = await fetch(`${API_BASE}/api/v1/scheduled-audits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create scheduled audit configuration.' }));
    throw new Error(errorData.message || 'Failed to create scheduled audit configuration.');
  }
  return response.json();
}

export async function toggleScheduledAudit(id: number): Promise<ScheduledAuditConfig> {
  const response = await fetch(`${API_BASE}/api/v1/scheduled-audits/${id}/toggle`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Failed to toggle scheduled audit active status.');
  }
  return response.json();
}

export async function deleteScheduledAudit(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/scheduled-audits/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete scheduled audit configuration.');
  }
}

export async function createApiKey(name: string): Promise<ApiKeyResponse> {
  const response = await fetch(`${API_BASE}/api/v1/api-keys`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error('Failed to generate API Key.');
  }
  return response.json();
}

export async function fetchApiKeys(): Promise<ApiKeyResponse[]> {
  const response = await fetch(`${API_BASE}/api/v1/api-keys`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function revokeApiKey(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/api-keys/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function fetchAiRecommendations(audit: AuditResponse): Promise<AiRecommendation[]> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audit),
    });
    if (!response.ok) {
      // Fallback: If POST with full body fails, try GET by audit ID if present
      if (audit.id) {
        return await fetchAiRecommendationsById(audit.id);
      }
      throw new Error(`AI recommendations request returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    if (audit.id) {
      try {
        return await fetchAiRecommendationsById(audit.id);
      } catch (_) {
        // Continue to throw outer error
      }
    }
    throw err;
  }
}

export async function fetchAiRecommendationsById(tempId: number): Promise<AiRecommendation[]> {
  const response = await fetch(`${API_BASE}/api/v1/ai/recommendations/${tempId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch AI recommendations for ID ${tempId}`);
  }
  return response.json();
}

export async function fetchAiRecommendationsByUrl(url: string): Promise<AiRecommendation[]> {
  const response = await fetch(`${API_BASE}/api/v1/ai/recommendations?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch AI recommendations for URL: ${url}`);
  }
  return response.json();
}

export async function submitBatchAuditJob(urls: string[], webhookUrl?: string): Promise<BatchAuditResponse> {
  const response = await fetch(`${API_BASE}/api/audit/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, webhookUrl }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Batch audit job submission failed' }));
    throw new Error(errorData.message || 'Batch audit job submission failed');
  }
  return response.json();
}

export async function getBatchJobStatus(jobId: string): Promise<BatchAuditResponse> {
  const response = await fetch(`${API_BASE}/api/audit/batch/${encodeURIComponent(jobId)}`);
  if (!response.ok) {
    throw new Error('Failed to retrieve batch audit job status');
  }
  return response.json();
}

export async function compareCompetitors(urls: string[]): Promise<CompetitorComparisonResponse> {
  const response = await fetch(`${API_BASE}/api/v1/competitor-comparison`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Competitor comparison analysis failed' }));
    throw new Error(errorData.message || 'Competitor comparison analysis failed');
  }
  return response.json();
}


