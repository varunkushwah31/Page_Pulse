export type HealthGrade = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';

export interface DomIssueSnippet {
  elementType: 'IMG' | 'INPUT' | 'LINK' | 'META';
  issueType: 'MISSING_ALT' | 'MISSING_LABEL' | 'BROKEN_CANONICAL' | 'MISSING_DESCRIPTION' | 'MISSING_TITLE';
  outerHtml: string;
  selector: string;
  lineHint: number;
}

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
  domIssues?: DomIssueSnippet[];
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
  domIssues?: DomIssueSnippet[];
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

export interface CoreWebVitals {
  lcpMs: number;
  inpMs: number;
  clsRatio: number;
  fcpMs: number;
  ttfbMs: number;
  overallGrade: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  cruxDataAvailable?: boolean;
  dataSource?: 'CRUX_FIELD' | 'LAB_ESTIMATED';
}

export interface BrokenLinkInfo {
  url: string;
  anchorText: string;
  statusCode: number;
  statusMessage: string;
  external: boolean;
}

export interface LinkInspectionMetrics {
  totalLinksFound: number;
  workingLinksCount: number;
  brokenLinksCount: number;
  redirectLinksCount: number;
  brokenLinks: BrokenLinkInfo[];
}

export interface SecurityMetrics {
  isHttps: boolean;
  sslValid: boolean;
  daysUntilSslExpiry: number;
  sslIssuer: string;
  tlsVersion: string;
  cipherSuite: string;
  securityHeadersPresent: Record<string, boolean>;
  missingSecurityHeadersCount: number;
  mixedContentCount: number;
  hasMixedContent: boolean;
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
  coreWebVitals?: CoreWebVitals;
  linkMetrics?: LinkInspectionMetrics;
  securityMetrics?: SecurityMetrics;
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

export interface ApiKeyResponse {
  id?: string;
  name: string;
  apiKey: string;
  createdAt: string;
}

export interface AiRecommendation {
  category: 'SEO' | 'ACCESSIBILITY' | 'CONTENT' | 'PERFORMANCE';
  issue: string;
  title: string;
  codeSnippet: string;
  explanation: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BatchAuditUrlResult {
  url: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  auditId?: number;
  overallScore?: number;
  error?: string;
}

export interface BatchAuditResponse {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  results: BatchAuditUrlResult[];
  submittedAt: string;
  completedAt?: string;
  webhookUrl?: string;
  correlationId?: string;
}

export interface CompetitorResult {
  rank: number;
  url: string;
  status: string;
  auditId?: number;
  overallScore?: number;
  seoScore?: number;
  contentScore?: number;
  accessibilityScore?: number;
  performanceScore?: number;
  healthGrade?: HealthGrade;
  responseTimeMs?: number;
  wordCount?: number;
  h1Count?: number;
  imagesMissingAlt?: number;
  cached?: boolean;
  error?: string;
}

export interface CompetitorSummary {
  bestOverall?: string;
  worstOverall?: string;
  averageOverallScore?: number;
  bestSeo?: string;
  bestContent?: string;
  bestAccessibility?: string;
  bestPerformance?: string;
}

export interface CompetitorComparisonResponse {
  totalCompetitors: number;
  successfulAudits: number;
  failedAudits: number;
  results: CompetitorResult[];
  summary: CompetitorSummary;
  generatedAt: string;
  correlationId?: string;
}

export interface ScoreRegressionItem {
  url: string;
  previousScore: number;
  currentScore: number;
  scoreDrop: number;
}

export interface ScoreImprovementItem {
  url: string;
  previousScore: number;
  currentScore: number;
  scoreGain: number;
}

export interface SitemapDeltaResponse {
  sitemapUrl: string;
  currentCrawlTimestamp: string;
  previousCrawlTimestamp: string | null;
  newPages: string[];
  removedPages: string[];
  scoreRegressions: ScoreRegressionItem[];
  scoreImprovements: ScoreImprovementItem[];
  unchangedCount: number;
}

export interface PdfBrandingConfig {
  companyName?: string;
  primaryColorHex?: string;
  headerText?: string;
  footerText?: string;
  logoBase64?: string;
}

