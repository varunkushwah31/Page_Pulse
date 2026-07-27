import type {
  AuditResponse,
  AuditReportDocument,
  SitemapAuditResponse,
  PlatformStatsResponse,
  TrendResponse,
  ScheduledAuditConfig,
  ScheduledAuditRequest,
} from '../types';

const API_BASE = '';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('pagepulse_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export async function runFullAudit(url: string): Promise<AuditResponse> {
  const response = await fetch(`${API_BASE}/api/audit/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Audit failed' }));
    throw new Error(errorData.message || 'Audit failed');
  }
  return response.json();
}

export async function saveReportToMongo(tempId: number): Promise<AuditReportDocument> {
  const response = await fetch(`${API_BASE}/api/audit/save/${tempId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('AUTH_REQUIRED');
    }
    throw new Error('Failed to save report to MongoDB');
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

export function getPdfDownloadUrl(reportId: string): string {
  return `${API_BASE}/api/v1/reports/${reportId}/pdf`;
}

export async function downloadPdfReport(reportId: string, customFilename?: string): Promise<void> {
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

