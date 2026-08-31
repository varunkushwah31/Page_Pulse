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
  SeoCollection,
  CreateSeoCollectionRequest,
  UpdateSeoCollectionRequest,
  CreateSeoCollectionItemRequest,
  UpdateSeoCollectionItemRequest,
  CollectionRunRequest,
  CollectionRunResult,
  CollectionExportData,
  UserProfile,
  GeminiModelsResponse,
  GeminiValidationResponse,
  GeminiCustomPromptResponse,
  UserAiPreferences,
  AiTitleVariationsResponse,
  AiExecutiveSummaryResponse,
  AiSchemaGenerationResponse,
  AiChatMessage,
  AiChatResponse,
} from '../types';

const API_BASE = '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('pagepulse_token');
  const customGeminiKey = localStorage.getItem('pagepulse_gemini_key');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(customGeminiKey && { 'X-Gemini-Api-Key': customGeminiKey.trim() }),
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

export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/api/v1/user/profile`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
}

export async function saveUserGeminiKey(apiKey: string): Promise<UserProfile> {
  const trimmed = apiKey.trim();
  localStorage.setItem('pagepulse_gemini_key', trimmed);

  const token = localStorage.getItem('pagepulse_token');
  if (token) {
    try {
      const response = await fetch(`${API_BASE}/api/v1/user/gemini-key`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ apiKey: trimmed }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Could not sync Gemini key to server profile, stored locally:', err);
    }
  }

  // Return local user profile representation if guest
  const masked = trimmed.length > 8 ? `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}` : '••••••••';
  return {
    id: 0,
    username: 'Guest',
    email: '',
    role: 'GUEST',
    hasGeminiApiKey: true,
    geminiApiKeyMasked: masked,
  };
}

export async function removeUserGeminiKey(): Promise<UserProfile> {
  localStorage.removeItem('pagepulse_gemini_key');

  const token = localStorage.getItem('pagepulse_token');
  if (token) {
    try {
      const response = await fetch(`${API_BASE}/api/v1/user/gemini-key`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Could not remove key from server profile:', err);
    }
  }

  return {
    id: 0,
    username: 'Guest',
    email: '',
    role: 'GUEST',
    hasGeminiApiKey: false,
    geminiApiKeyMasked: null,
  };
}

export async function validateGeminiKey(apiKey: string): Promise<GeminiValidationResponse> {
  const response = await fetch(`${API_BASE}/api/v1/user/gemini-key/validate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ apiKey }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Validation request failed' }));
    throw new Error(err.message || 'Validation request failed');
  }
  return response.json();
}

export async function fetchAvailableGeminiModels(apiKey?: string): Promise<GeminiModelsResponse> {
  const localKey = apiKey || localStorage.getItem('pagepulse_gemini_key') || '';
  try {
    if (apiKey) {
      const response = await fetch(`${API_BASE}/api/v1/ai/models/discover`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ apiKey }),
      });
      if (response.ok) {
        return await response.json();
      }
    }

    const headers = getAuthHeaders();
    if (localKey) {
      headers['X-Gemini-Api-Key'] = localKey;
    }
    const response = await fetch(`${API_BASE}/api/v1/ai/models`, {
      method: 'GET',
      headers,
    });
    if (response.ok) {
      return await response.json();
    }
    const err = await response.json().catch(() => ({ error: 'Failed to retrieve available models' }));
    return { success: false, models: [], error: err.error || err.message };
  } catch (e: any) {
    return { success: false, models: [], error: e?.message || 'Network error fetching models' };
  }
}

export async function saveUserAiPreferences(preferences: UserAiPreferences): Promise<UserProfile> {
  localStorage.setItem('pagepulse_ai_preferences', JSON.stringify(preferences));

  const token = localStorage.getItem('pagepulse_token');
  if (token) {
    try {
      const response = await fetch(`${API_BASE}/api/v1/user/ai-preferences`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(preferences),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Could not sync AI preferences to server profile:', err);
    }
  }

  const existingProfile = await fetchUserProfile().catch(() => ({
    id: 0,
    username: 'Guest',
    email: '',
    role: 'GUEST',
  }));

  return {
    ...existingProfile,
    ...preferences,
  };
}

export function getLocalAiPreferences(): UserAiPreferences {
  try {
    const raw = localStorage.getItem('pagepulse_ai_preferences');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not parse local AI preferences, using defaults:', err);
  }
  return {
    targetNiche: 'SaaS & B2B Tech',
    brandTone: 'Authoritative & Professional',
    targetCountry: 'Global / International',
    primaryObjective: 'Maximize Organic CTR & Rankings',
    aiCreativityLevel: 'BALANCED',
    preferredAiModel: 'gemini-2.0-flash',
  };
}

export async function fetchAiTitleVariations(audit: AuditResponse): Promise<AiTitleVariationsResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/title-variations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(audit),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to generate title variations' }));
      return { success: false, error: err.error || err.message || 'Generation failed' };
    }
    return await response.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error while generating variations' };
  }
}

export async function fetchAiExecutiveSummary(audit: AuditResponse): Promise<AiExecutiveSummaryResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/executive-summary`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(audit),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to generate executive summary' }));
      return { success: false, error: err.error || err.message || 'Generation failed' };
    }
    return await response.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error while generating summary' };
  }
}

export async function generateAiSchemaJsonLd(audit: AuditResponse, schemaType: string = 'AUTO'): Promise<AiSchemaGenerationResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/schema-generator`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        audit,
        schemaType,
        preferences: getLocalAiPreferences(),
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to generate Schema.org JSON-LD' }));
      return { success: false, error: err.error || err.message || 'Generation failed' };
    }
    return await response.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error while generating schema' };
  }
}

export async function chatWithAiAdvisor(
  audit: AuditResponse,
  conversationHistory: AiChatMessage[],
  userMessage: string
): Promise<AiChatResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        audit,
        conversationHistory,
        userMessage,
        preferences: getLocalAiPreferences(),
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to chat with AI assistant' }));
      return { success: false, error: err.error || err.message || 'Chat request failed' };
    }
    return await response.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error while contacting AI assistant' };
  }
}

export async function askGeminiCustomSeo(audit: AuditResponse, prompt: string): Promise<GeminiCustomPromptResponse> {
  const response = await fetch(`${API_BASE}/api/v1/ai/custom-seo-prompt`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ audit, prompt }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Custom SEO prompt request failed' }));
    return {
      success: false,
      error: err.error || err.message || 'Custom SEO prompt request failed',
    };
  }
  return response.json();
}

export async function fetchAiRecommendations(audit: AuditResponse): Promise<AiRecommendation[]> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/recommendations`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
  const response = await fetch(`${API_BASE}/api/v1/ai/recommendations/${tempId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch AI recommendations for ID ${tempId}`);
  }
  return response.json();
}

export async function fetchAiRecommendationsByUrl(url: string): Promise<AiRecommendation[]> {
  const response = await fetch(`${API_BASE}/api/v1/ai/recommendations?url=${encodeURIComponent(url)}`, {
    headers: getAuthHeaders(),
  });
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

/* ───── SEO Collections API ("Postman for SEO") ───── */

export async function fetchUserCollections(): Promise<SeoCollection[]> {
  const response = await fetch(`${API_BASE}/api/v1/collections`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) return [];
    throw new Error('Failed to fetch user SEO collections');
  }
  return response.json();
}

export async function fetchCollectionById(id: string): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch collection details');
  }
  return response.json();
}

export async function createCollection(data: CreateSeoCollectionRequest): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to create collection' }));
    throw new Error(err.message || 'Failed to create collection');
  }
  return response.json();
}

export async function updateCollection(id: string, data: UpdateSeoCollectionRequest): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to update collection' }));
    throw new Error(err.message || 'Failed to update collection');
  }
  return response.json();
}

export async function deleteCollection(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete collection');
  }
}

export async function duplicateCollection(id: string): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to duplicate collection');
  }
  return response.json();
}

export async function addCollectionItem(collectionId: string, item: CreateSeoCollectionItemRequest): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(collectionId)}/items`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to add item to collection' }));
    throw new Error(err.message || 'Failed to add item to collection');
  }
  return response.json();
}

export async function updateCollectionItem(collectionId: string, itemId: string, item: UpdateSeoCollectionItemRequest): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to update collection item' }));
    throw new Error(err.message || 'Failed to update collection item');
  }
  return response.json();
}

export async function deleteCollectionItem(collectionId: string, itemId: string): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to remove item from collection');
  }
  return response.json();
}

export async function runCollectionItem(collectionId: string, itemId: string): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}/run`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to execute audit on collection item' }));
    throw new Error(err.message || 'Failed to execute audit on collection item');
  }
  return response.json();
}

export async function runFullCollection(collectionId: string, request?: CollectionRunRequest): Promise<CollectionRunResult> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(collectionId)}/run`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request || {}),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Collection runner execution failed' }));
    throw new Error(err.message || 'Collection runner execution failed');
  }
  return response.json();
}

export async function exportCollectionJson(collectionId: string): Promise<CollectionExportData> {
  const response = await fetch(`${API_BASE}/api/v1/collections/${encodeURIComponent(collectionId)}/export`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to export collection JSON');
  }
  return response.json();
}

export async function importCollectionJson(data: CollectionExportData): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/import`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to import collection JSON' }));
    throw new Error(err.message || 'Failed to import collection JSON');
  }
  return response.json();
}

export async function createStarterCollectionTemplate(templateKey: string): Promise<SeoCollection> {
  const response = await fetch(`${API_BASE}/api/v1/collections/starter-template/${encodeURIComponent(templateKey)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to create starter collection template');
  }
  return response.json();
}



