export type HealthGrade = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';

export interface DomIssueSnippet {
  elementType: 'IMG' | 'INPUT' | 'LINK' | 'META';
  issueType: 'MISSING_ALT' | 'MISSING_LABEL' | 'BROKEN_CANONICAL' | 'MISSING_DESCRIPTION' | 'MISSING_TITLE';
  outerHtml: string;
  selector: string;
  lineHint: number;
}

export interface StructuredDataInfo {
  hasStructuredData: boolean;
  totalSchemasFound: number;
  validJsonLd: boolean;
  detectedSchemaTypes: string[];
  validationErrors: string[];
  missingRecommendedProperties: string[];
  rawJsonLdSnippets: string[];
}

export interface SerpPreview {
  displayedTitle: string;
  displayedUrl: string;
  displayedDescription: string;
  titlePixelWidth: number;
  descriptionPixelWidth: number;
  titleTruncated: boolean;
  descriptionTruncated: boolean;
  mobilePreviewTitle: string;
  mobilePreviewDescription: string;
}

export interface ReadabilityMetrics {
  fleschKincaidReadingEase: number;
  fleschKincaidGradeLevel: number;
  automatedReadabilityIndex: number;
  readingEaseLevel: string;
  sentenceCount: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  complexWordsPercentage: number;
}

export interface HeadingNode {
  tag: string;
  level: number;
  text: string;
  estimatedLine: number;
  issues: string[];
}

export interface KeywordPhrase {
  phrase: string;
  count: number;
  densityPercentage: number;
  nGramSize: number;
  isStuffingWarning: boolean;
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
  canonicalStatus?: string;
  openGraphTags: Record<string, string>;
  twitterCardTags: Record<string, string>;
  openGraphComplete?: boolean;
  twitterCardComplete?: boolean;
  robotsDirective: string | null;
  xRobotsTagHeader?: string | null;
  isFollowable: boolean;
  isIndexable: boolean;
  hasFavicon?: boolean;
  hasViewportMeta?: boolean;
  hasOgImage?: boolean;
  hasStructuredData?: boolean;
  hreflangTags?: Record<string, string>;
  hasXDefaultHreflang?: boolean;
  invalidHreflangCodes?: string[];
  structuredDataInfo?: StructuredDataInfo;
  serpPreview?: SerpPreview;
  charset?: string;
  hasAuthor?: boolean;
  author?: string;
  socialCardPreviewImage?: string;
  seoRecommendations?: string[];
  domIssues?: DomIssueSnippet[];
}

export interface ContentMetrics {
  headingCounts: Record<string, number>;
  wordCount: number;
  characterCount?: number;
  estimatedReadingTimeMinutes: number;
  paragraphCount: number;
  textToHtmlRatioPercentage: number;
  readabilityMetrics?: ReadabilityMetrics;
  headingHierarchy?: HeadingNode[];
  headingIssues?: string[];
  hasValidHeadingHierarchy?: boolean;
  duplicateHeadingTexts?: string[];
  topKeywords?: KeywordPhrase[];
  hasKeywordStuffing?: boolean;
  isThinContent?: boolean;
  contentLinkDensityPercentage?: number;
  genericAnchorWarnings?: string[];
}

export interface AccessibilityMetrics {
  totalImageCount: number;
  imagesMissingAltCount: number;
  imagesMissingAltUrls: string[];
  hasHtmlLangAttribute: boolean;
  htmlLangValue: string | null;
  validLangCode?: boolean;
  formInputsMissingLabelsCount: number;
  buttonsMissingAccessibleNameCount?: number;
  linksMissingAccessibleTextCount?: number;
  hasMainLandmark?: boolean;
  hasHeaderLandmark?: boolean;
  hasNavLandmark?: boolean;
  hasFooterLandmark?: boolean;
  positiveTabindexCount?: number;
  mediaMissingCaptionsCount?: number;
  hasTextDirection?: boolean;
  textDirectionValue?: string | null;
  wcagViolationsSummary?: string[];
  domIssues?: DomIssueSnippet[];
}

export interface PerformanceMetrics {
  statusCode: number;
  responseTimeMs: number;
  contentType: string;
  scriptResourceCount: number;
  stylesheetResourceCount: number;
  imageResourceCount: number;
  fontResourceCount?: number;
  renderBlockingHeadScriptsCount?: number;
  asyncOrDeferScriptsCount?: number;
  modernImageFormatsCount?: number;
  legacyImageFormatsCount?: number;
  modernImageRatioPercentage?: number;
  resourceHintsCount?: number;
  totalDomNodesCount?: number;
  maxDomDepth?: number;
  contentEncoding?: string;
  cacheControlHeader?: string | null;
  hasCompression?: boolean;
  hasBrowserCaching?: boolean;
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
  internalLinksCount?: number;
  externalLinksCount?: number;
  inPageAnchorLinksCount?: number;
  protocolLinksCount?: number;
  targetBlankWithoutNoopenerCount?: number;
  insecureHttpLinksCount?: number;
  nofollowLinksCount?: number;
  genericAnchorLinksCount?: number;
  emptyAnchorLinksCount?: number;
  securityWarnings?: string[];
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
  assetBottleneckMetrics?: AssetBottleneckMetrics;
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
  category: 'SEO' | 'ACCESSIBILITY' | 'CONTENT' | 'PERFORMANCE' | 'SECURITY';
  priority?: 'P0_CRITICAL' | 'P1_MAJOR' | 'P2_MODERATE' | 'P3_LOW';
  issue: string;
  title: string;
  codeSnippet: string;
  explanation: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedScoreImprovement?: string;
  guidelineReference?: string;
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

export interface AssetBottleneckMetrics {
  renderBlockingFontsCount: number;
  unSizedImagesCount: number;
  estimatedUnminifiedCssBytes: number;
  estimatedUnminifiedJsBytes: number;
  totalBlockingTimeMs: number;
  bottleneckIssues: string[];
}

export interface KeywordFrequency {
  keyword: string;
  countUrlA: number;
  countUrlB: number;
  densityUrlA: number;
  densityUrlB: number;
  gapType: 'SHARED' | 'UNIQUE_TARGET' | 'MISSING_OPPORTUNITY';
}

export interface KeywordGapResponse {
  urlA: string;
  urlB: string;
  totalKeywordsUrlA: number;
  totalKeywordsUrlB: number;
  sharedKeywords: KeywordFrequency[];
  uniqueTargetKeywords: KeywordFrequency[];
  missingCompetitorOpportunities: KeywordFrequency[];
}

export interface PdfBrandingConfig {
  companyName?: string;
  primaryColorHex?: string;
  headerText?: string;
  footerText?: string;
  logoBase64?: string;
}
