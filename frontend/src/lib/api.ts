import type {
  AuditResponse,
  AuditReportDocument,
  SitemapAuditResponse,
  PlatformStatsResponse,
} from '../types';

const API_BASE = '';

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
  });
  if (!response.ok) {
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
