export type HealthGrade = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';

export interface SeoMetrics {
  pageTitle: string | null;
  titleLength: number;
  hasTitle: boolean;
  metaDescription: string | null;
  descriptionLength: number;
  hasMetaDescription: boolean;
  metaKeywords: string | null;
  canonicalUrl: string | null;
  openGraphTags: Record<string, string>;
  twitterCardTags: Record<string, string>;
  robotsDirective: string | null;
  isFollowable: boolean;
  isIndexable: boolean;
  hasFavicon?: boolean;
  hasViewportMeta?: boolean;
  hasOgImage?: boolean;
  hasStructuredData?: boolean;
  seoRecommendations?: string[];
}

export interface ContentMetrics {
  headingCounts: Record<string, number>;
  wordCount: number;
  estimatedReadingTimeMinutes: number;
  paragraphCount: number;
  textToHtmlRatioPercentage: number;
}

export interface AccessibilityMetrics {
  totalImageCount: number;
  imagesMissingAltCount: number;
  imagesMissingAltUrls: string[];
  hasHtmlLangAttribute: boolean;
  htmlLangValue: string | null;
  formInputsMissingLabelsCount: number;
}

export interface PerformanceMetrics {
  statusCode: number;
  responseTimeMs: number;
  contentType: string;
  scriptResourceCount: number;
  stylesheetResourceCount: number;
  imageResourceCount: number;
  secureSsl: boolean;
}

export interface AuditScoreBreakdown {
  seoScore: number;
  contentScore: number;
  accessibilityScore: number;
  performanceScore: number;
  overallScore: number;
  healthGrade: HealthGrade;
}

export interface AuditResponse {
  id: number;
  url: string;
  domain: string;
  httpStatus: number;
  responseTimeMs: number;
  contentType: string;
  seoMetrics: SeoMetrics;
  contentMetrics: ContentMetrics;
  accessibilityMetrics: AccessibilityMetrics;
  performanceMetrics: PerformanceMetrics;
  scores: AuditScoreBreakdown;
  cached: boolean;
  timestamp: string;
}

export interface AuditReportDocument {
  id: string;
  originalTempId: number;
  url: string;
  domain: string;
  httpStatus: number;
  responseTimeMs: number;
  pageTitle: string | null;
  metaDescription: string | null;
  h1Count: number;
  imagesMissingAltCount: number;
  wordCount: number;
  contentType: string;
  seoScore: number;
  contentScore: number;
  accessibilityScore: number;
  performanceScore: number;
  overallScore: number;
  healthGrade: HealthGrade;
  savedAt: string;
}

export interface SitemapAuditResponse {
  sitemapUrl: string;
  totalUrlsAudited: number;
  averageOverallScore: number;
  childAudits: AuditResponse[];
  timestamp: string;
}

export interface PlatformStatsResponse {
  totalTransientAuditsRun: number;
  totalSavedReports: number;
  averageOverallScore: number;
  averageResponseTimeMs: number;
  topDomains: Record<string, number>;
}

export interface AuditProgress {
  step: string;
  percentage: number;
  message: string;
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  auditId?: number;
}

export interface TrendSummary {
  min?: number;
  max?: number;
  average?: number;
  latest?: number;
  previous?: number;
  change?: number;
  changePercent?: number;
  trend?: string;
}

export interface TrendResponse {
  domain: string;
  metric: string;
  from: string;
  to: string;
  dataPoints: number;
  data: TrendDataPoint[];
  summary?: TrendSummary;
}

export interface ScheduledAuditConfig {
  id: number;
  url: string;
  webhookUrl: string | null;
  email: string | null;
  frequencyMinutes: number;
  lastAuditTime: string | null;
  previousOverallScore: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  regressionThreshold: number;
  notifyOnRegressionOnly: boolean;
}

export interface ScheduledAuditRequest {
  url: string;
  webhookUrl?: string | null;
  email?: string | null;
  frequencyMinutes?: number;
  regressionThreshold?: number;
  notifyOnRegressionOnly?: boolean;
}
