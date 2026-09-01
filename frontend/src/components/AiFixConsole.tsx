import React, { useState, useEffect, useRef } from 'react';
import type {
  AuditResponse,
  AiRecommendation,
  AiTitleOption,
  AiExecutiveSummaryResponse,
  AiSchemaGenerationResponse,
  AiChatMessage,
  GeminiModelDto,
} from '../types';
import {
  fetchAiRecommendations,
  saveUserGeminiKey,
  removeUserGeminiKey,
  validateGeminiKey,
  fetchAiTitleVariations,
  fetchAiExecutiveSummary,
  generateAiSchemaJsonLd,
  chatWithAiAdvisor,
  getLocalAiPreferences,
  saveUserAiPreferences,
  fetchAvailableGeminiModels,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  SparkleIcon,
  CopyIcon,
  CheckIcon,
  CodeIcon,
  ShieldWarningIcon,
  CpuIcon,
  CheckCircleIcon,
  ArrowsClockwiseIcon,
  MagnifyingGlassIcon,
  GitDiffIcon,
  BookOpenIcon,
  TagIcon,
  ChatCircleDotsIcon,
  PaperPlaneRightIcon,
  XIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowSquareOutIcon,
  GearIcon,
  WarningCircleIcon,
  DownloadSimpleIcon,
  ListChecksIcon,
  RocketLaunchIcon,
  BracketsCurlyIcon,
  ChartBarIcon,
  GlobeIcon,
  TargetIcon,
} from '@phosphor-icons/react';

interface AiFixConsoleProps {
  audit: AuditResponse;
}

// Client-side AI code fix rule engine fallback to guarantee 100% reliability
export function generateClientSideAiRecommendations(report: AuditResponse): AiRecommendation[] {
  if (!report) return [];
  const recs: AiRecommendation[] = [];
  const seo = report.seoMetrics;
  const content = report.contentMetrics;
  const a11y = report.accessibilityMetrics;
  const perf = report.performanceMetrics;
  const links = report.linkMetrics;
  const sec = report.securityMetrics;
  const bottlenecks = report.assetBottleneckMetrics;

  const rawDomain = report.domain || (report.url ? report.url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0] : 'example.com');
  const domain = rawDomain.replace('www.', '');
  const brandName = domain.split('.')[0] ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : 'SiteLook';

  // 1. SEO Fixes
  if (seo) {
    if (!seo.hasTitle || !seo.pageTitle || seo.pageTitle.trim() === '') {
      recs.push({
        category: 'SEO',
        priority: 'P0_CRITICAL',
        issue: 'Missing HTML <title> tag inside the document <head>.',
        title: 'Add Descriptive Page Title Tag',
        codeSnippet: `<title>${brandName} | Official Website</title>`,
        diffSnippet: `- <head>\n+ <head>\n+   <title>${brandName} | Official Website</title>`,
        targetElementSelector: 'head',
        explanation: 'Title tags define the document title displayed on Search Engine Results Pages (SERPs) and browser tabs.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+10 to +15 pts',
        guidelineReference: 'Google Search Central: Title Tags',
      });
    } else if (seo.titleLength > 60) {
      const truncated = seo.pageTitle.slice(0, 55) + '...';
      recs.push({
        category: 'SEO',
        priority: 'P2_MODERATE',
        issue: `Page title exceeds optimal 60-character SERP limit (${seo.titleLength} chars).`,
        title: 'Optimize Page Title Length',
        codeSnippet: `<title>${truncated}</title>`,
        diffSnippet: `- <title>${seo.pageTitle}</title>\n+ <title>${truncated}</title>`,
        targetElementSelector: 'head > title',
        explanation: 'Search engines truncate titles longer than 60 characters (~600px). Truncate long titles to prevent SERP clipping.',
        impactLevel: 'MEDIUM',
        estimatedScoreImprovement: '+3 to +5 pts',
        guidelineReference: 'Google Search Central: Snippets',
      });
    } else if (seo.titleLength < 20) {
      recs.push({
        category: 'SEO',
        priority: 'P2_MODERATE',
        issue: `Page title is too brief (${seo.titleLength} chars).`,
        title: 'Expand Descriptive Page Title',
        codeSnippet: `<title>${seo.pageTitle} - ${brandName} Official Guide</title>`,
        diffSnippet: `- <title>${seo.pageTitle}</title>\n+ <title>${seo.pageTitle} - ${brandName} Official Guide</title>`,
        targetElementSelector: 'head > title',
        explanation: 'Descriptive titles between 30-60 characters capture search intent and improve click-through rates.',
        impactLevel: 'MEDIUM',
        estimatedScoreImprovement: '+3 to +5 pts',
        guidelineReference: 'Google Search Central: Title Best Practices',
      });
    }

    if (!seo.hasMetaDescription || !seo.metaDescription || seo.metaDescription.trim() === '') {
      recs.push({
        category: 'SEO',
        priority: 'P1_MAJOR',
        issue: 'Missing meta description tag.',
        title: 'Insert High-CTR Meta Description',
        codeSnippet: `<meta name="description" content="Discover ${domain} - explore features, performance insights, and analytics.">`,
        diffSnippet: `+ <meta name="description" content="Discover ${domain} - explore features, performance insights, and analytics.">`,
        targetElementSelector: 'head',
        explanation: 'Meta descriptions inform search engine users about page content. A compelling description increases organic CTR.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+8 to +10 pts',
        guidelineReference: 'Google Search Central: Meta Descriptions',
      });
    }

    if (seo.canonicalStatus === 'MULTIPLE_CONFLICTING') {
      recs.push({
        category: 'SEO',
        priority: 'P0_CRITICAL',
        issue: 'Multiple conflicting canonical tags detected in DOM.',
        title: 'Consolidate Conflicting Canonical Tags',
        codeSnippet: `<link rel="canonical" href="https://${domain}/">`,
        diffSnippet: `- <!-- Remove duplicate/conflicting canonical tags -->\n+ <link rel="canonical" href="https://${domain}/">`,
        targetElementSelector: "head > link[rel='canonical']",
        explanation: 'Multiple canonical tags confuse search engine crawlers and can invalidate canonicalization.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+10 to +15 pts',
        guidelineReference: 'Google Search Central: Canonicalization',
      });
    } else if (!seo.canonicalUrl || seo.canonicalUrl.trim() === '') {
      recs.push({
        category: 'SEO',
        priority: 'P1_MAJOR',
        issue: 'Missing canonical link reference.',
        title: 'Declare Self-Referencing Canonical Tag',
        codeSnippet: `<link rel="canonical" href="https://${domain}/">`,
        diffSnippet: `+ <link rel="canonical" href="https://${domain}/">`,
        targetElementSelector: 'head',
        explanation: 'Canonical tags prevent duplicate content issues by indicating the master URL to search indexing engines.',
        impactLevel: 'MEDIUM',
        estimatedScoreImprovement: '+5 to +8 pts',
        guidelineReference: 'Google Search Central: Canonical URLs',
      });
    }

    if (!seo.openGraphComplete) {
      recs.push({
        category: 'SEO',
        priority: 'P2_MODERATE',
        issue: 'Incomplete OpenGraph social sharing meta tags.',
        title: 'Complete OpenGraph Social Metadata',
        codeSnippet: `<meta property="og:title" content="${brandName}">\n<meta property="og:description" content="Discover ${domain} insights.">\n<meta property="og:image" content="https://${domain}/og-image.jpg">\n<meta property="og:url" content="https://${domain}/">\n<meta property="og:type" content="website">`,
        diffSnippet: `+ <meta property="og:title" content="${brandName}">\n+ <meta property="og:description" content="Discover ${domain} insights.">\n+ <meta property="og:image" content="https://${domain}/og-image.jpg">\n+ <meta property="og:url" content="https://${domain}/">\n+ <meta property="og:type" content="website">`,
        targetElementSelector: 'head',
        explanation: 'OpenGraph tags enable rich link preview cards across LinkedIn, Facebook, Slack, and Discord.',
        impactLevel: 'MEDIUM',
        estimatedScoreImprovement: '+5 pts',
        guidelineReference: 'Open Graph Protocol (ogp.me)',
      });
    }

    if (!seo.hasViewportMeta) {
      recs.push({
        category: 'SEO',
        priority: 'P0_CRITICAL',
        issue: 'Missing mobile responsive viewport meta tag.',
        title: 'Add Responsive Viewport Meta Tag',
        codeSnippet: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
        diffSnippet: `+ <meta name="viewport" content="width=device-width, initial-scale=1.0">`,
        targetElementSelector: 'head',
        explanation: 'The viewport meta tag ensures responsive scaling on mobile devices and passes Google Mobile-Friendly audits.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+10 to +15 pts',
        guidelineReference: 'Google Search Central: Mobile-Friendly Design',
      });
    }

    if (!seo.hasStructuredData) {
      recs.push({
        category: 'SEO',
        priority: 'P1_MAJOR',
        issue: 'No Schema.org JSON-LD structured data detected.',
        title: 'Embed Organization & WebSite JSON-LD Schema',
        codeSnippet: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "${brandName}",\n  "url": "https://${domain}/"\n}\n</script>`,
        diffSnippet: `+ <script type="application/ld+json">\n+ {\n+   "@context": "https://schema.org",\n+   "@type": "WebSite",\n+   "name": "${brandName}",\n+   "url": "https://${domain}/"\n+ }\n+ </script>`,
        targetElementSelector: 'head',
        explanation: 'Structured data schema helps search engine crawlers generate rich snippets in search results.',
        impactLevel: 'MEDIUM',
        estimatedScoreImprovement: '+5 to +8 pts',
        guidelineReference: 'Schema.org WebSite Specification',
      });
    }
  }

  // 2. Accessibility Fixes
  if (a11y) {
    if (a11y.imagesMissingAltCount > 0) {
      recs.push({
        category: 'ACCESSIBILITY',
        priority: 'P0_CRITICAL',
        issue: `${a11y.imagesMissingAltCount} image(s) missing alt descriptive attributes.`,
        title: 'Add Descriptive Alt Attributes to Images',
        codeSnippet: `<img src="hero-banner.jpg" alt="${brandName} platform graphic" width="800" height="400">`,
        diffSnippet: `- <img src="hero-banner.jpg">\n+ <img src="hero-banner.jpg" alt="${brandName} platform graphic" width="800" height="400">`,
        targetElementSelector: "img:not([alt]), img[alt='']",
        explanation: 'Screen readers and search crawlers rely on alt text to understand image context for visually impaired users.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+10 to +15 pts',
        guidelineReference: 'WCAG 2.1 SC 1.1.1 (Non-text Content)',
      });
    }

    if (!a11y.hasHtmlLangAttribute || !a11y.validLangCode) {
      recs.push({
        category: 'ACCESSIBILITY',
        priority: 'P1_MAJOR',
        issue: 'Missing or invalid lang attribute on root <html> element.',
        title: 'Declare Root HTML Language Attribute',
        codeSnippet: `<html lang="en">`,
        diffSnippet: `- <html>\n+ <html lang="en">`,
        targetElementSelector: 'html',
        explanation: 'Specifying a valid BCP 47 language code enables screen readers to apply proper pronunciation rules.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+5 to +8 pts',
        guidelineReference: 'WCAG 2.1 SC 3.1.1 (Language of Page)',
      });
    }

    if (a11y.buttonsMissingAccessibleNameCount && a11y.buttonsMissingAccessibleNameCount > 0) {
      recs.push({
        category: 'ACCESSIBILITY',
        priority: 'P1_MAJOR',
        issue: `${a11y.buttonsMissingAccessibleNameCount} button(s) lack accessible text or aria-label attributes.`,
        title: 'Add Accessible Names to Interactive Buttons',
        codeSnippet: `<button type="button" aria-label="Close modal menu"><svg ... /></button>`,
        diffSnippet: `- <button type="button"><svg ... /></button>\n+ <button type="button" aria-label="Close modal menu"><svg ... /></button>`,
        targetElementSelector: 'button:not([aria-label])',
        explanation: 'Assistive technologies require discernible text or aria-label to announce button actions to users.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+5 to +10 pts',
        guidelineReference: 'WCAG 2.1 SC 4.1.2 (Name, Role, Value)',
      });
    }

    if (a11y.formInputsMissingLabelsCount > 0) {
      recs.push({
        category: 'ACCESSIBILITY',
        priority: 'P1_MAJOR',
        issue: `${a11y.formInputsMissingLabelsCount} form input(s) missing associated <label> or aria-label.`,
        title: 'Associate Explicit Labels with Form Inputs',
        codeSnippet: `<label for="email-input">Email Address</label>\n<input id="email-input" type="email" name="email" placeholder="you@example.com" />`,
        diffSnippet: `- <input type="email" placeholder="you@example.com" />\n+ <label for="email-input">Email Address</label>\n+ <input id="email-input" type="email" name="email" placeholder="you@example.com" />`,
        targetElementSelector: 'input:not([aria-label])',
        explanation: 'Every input field requires a descriptive label for screen reader users and assistive technology.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+5 to +8 pts',
        guidelineReference: 'WCAG 2.1 SC 3.3.2 (Labels or Instructions)',
      });
    }

    if (!a11y.hasMainLandmark) {
      recs.push({
        category: 'ACCESSIBILITY',
        priority: 'P2_MODERATE',
        issue: 'Document lacks a primary <main> semantic landmark region.',
        title: 'Wrap Primary Content in <main> Landmark',
        codeSnippet: `<main id="main-content" role="main">\n  <!-- Primary page content -->\n</main>`,
        diffSnippet: `+ <main id="main-content" role="main">\n+   <!-- Primary page content -->\n+ </main>`,
        targetElementSelector: 'body',
        explanation: 'Landmark regions enable keyboard and screen reader users to quickly bypass navigation bars.',
        impactLevel: 'MEDIUM',
        estimatedScoreImprovement: '+3 to +5 pts',
        guidelineReference: 'WCAG 2.1 SC 1.3.1 (Info and Relationships)',
      });
    }
  }

  // 3. Content Fixes
  if (content) {
    const h1Count = content.headingCounts?.h1 || 0;
    if (h1Count === 0) {
      recs.push({
        category: 'CONTENT',
        priority: 'P0_CRITICAL',
        issue: 'Document contains zero <h1> heading tags.',
        title: 'Add Primary <h1> Document Heading',
        codeSnippet: `<h1>Primary Topic or Brand Headline</h1>`,
        diffSnippet: `+ <h1>Primary Topic or Brand Headline</h1>`,
        targetElementSelector: 'main',
        explanation: 'An <h1> heading specifies the main topic of the page for users and search engine indexers.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+10 to +15 pts',
        guidelineReference: 'W3C & Google On-Page SEO Best Practices',
      });
    } else if (h1Count > 1) {
      recs.push({
        category: 'CONTENT',
        priority: 'P2_MODERATE',
        issue: `Page contains ${h1Count} <h1> heading tags. Standard guidelines recommend 1 primary <h1>.`,
        title: 'Consolidate Multiple <h1> Headings',
        codeSnippet: `<!-- Use single primary <h1> and convert subordinate sections to <h2> -->\n<h1>Main Topic Header</h1>\n<h2>Secondary Section Header</h2>`,
        diffSnippet: `- <h1>Main Topic Header</h1>\n- <h1>Secondary Section Header</h1>\n+ <h1>Main Topic Header</h1>\n+ <h2>Secondary Section Header</h2>`,
        targetElementSelector: 'h1:nth-of-type(n+2)',
        explanation: 'Multiple <h1> headings dilute page topic clarity. Use <h2>-<h6> for subordinate section headings.',
        impactLevel: 'LOW',
        estimatedScoreImprovement: '+3 to +5 pts',
        guidelineReference: 'WCAG 2.1 SC 1.3.1',
      });
    }

    if (content.isThinContent) {
      recs.push({
        category: 'CONTENT',
        priority: 'P1_MAJOR',
        issue: `Page has low word count (${content.wordCount} words), risking thin content penalties.`,
        title: 'Expand Comprehensive Body Content',
        codeSnippet: `<p>Provide detailed, helpful, high-value paragraphs addressing user search intent...</p>`,
        diffSnippet: `+ <section class="content-body">\n+   <p>Provide detailed, helpful, high-value paragraphs addressing user search intent...</p>\n+ </section>`,
        targetElementSelector: 'main',
        explanation: 'Search engines prioritize authoritative, in-depth content that thoroughly answers search queries.',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+8 to +12 pts',
        guidelineReference: 'Google Search Quality Rater Guidelines: Helpful Content',
      });
    }
  }

  // 4. Performance Fixes
  if (perf) {
    if (perf.renderBlockingHeadScriptsCount && perf.renderBlockingHeadScriptsCount > 0) {
      recs.push({
        category: 'PERFORMANCE',
        priority: 'P1_MAJOR',
        issue: `${perf.renderBlockingHeadScriptsCount} render-blocking script(s) located in <head>.`,
        title: 'Add defer or async to Head Scripts',
        codeSnippet: `<script src="bundle.js" defer></script>`,
        diffSnippet: `- <script src="bundle.js"></script>\n+ <script src="bundle.js" defer></script>`,
        targetElementSelector: 'head > script:not([defer]):not([async])',
        explanation: 'Deferring scripts prevents HTML parser blocking, significantly lowering First Contentful Paint (FCP).',
        impactLevel: 'HIGH',
        estimatedScoreImprovement: '+5 to +10 pts',
        guidelineReference: 'Google Lighthouse Performance Audit',
      });
    }

    if (perf.legacyImageFormatsCount && perf.legacyImageFormatsCount > 0 && (perf.modernImageRatioPercentage || 0) < 50) {
      recs.push({
        category: 'PERFORMANCE',
        priority: 'P2_MODERATE',
        issue: 'Page uses legacy uncompressed image formats (PNG/JPEG) instead of next-gen formats (WebP/AVIF).',
        title: 'Convert Images to Next-Gen WebP/AVIF Formats',
        codeSnippet: `<picture>\n  <source srcset="image.avif" type="image/avif">\n  <source srcset="image.webp" type="image/webp">\n  <img src="image.jpg" alt="Description" loading="lazy" width="800" height="400">\n</picture>`,
        diffSnippet: `- <img src="image.jpg" alt="Description">\n+ <picture>\n+   <source srcset="image.avif" type="image/avif">\n+   <source srcset="image.webp" type="image/webp">\n+   <img src="image.jpg" alt="Description" loading="lazy" width="800" height="400">\n+ </picture>`,
        targetElementSelector: "img[src$='.jpg'], img[src$='.png']",
        explanation: 'WebP and AVIF formats reduce file size by 30-70% compared to JPEG/PNG without quality loss.',
        impactLevel: 'MEDIUM',
        estimatedScoreImprovement: '+5 to +8 pts',
        guidelineReference: 'Google Core Web Vitals Optimization',
      });
    }
  }

  if (bottlenecks && bottlenecks.unSizedImagesCount > 0) {
    recs.push({
      category: 'PERFORMANCE',
      priority: 'P1_MAJOR',
      issue: `${bottlenecks.unSizedImagesCount} image(s) lack explicit width and height attributes, causing Layout Shifts (CLS).`,
      title: 'Add Width & Height Dimensions to Prevent CLS',
      codeSnippet: `<img src="hero.jpg" alt="Hero Banner" width="1200" height="630" loading="eager">`,
      diffSnippet: `- <img src="hero.jpg" alt="Hero Banner">\n+ <img src="hero.jpg" alt="Hero Banner" width="1200" height="630" loading="eager">`,
      targetElementSelector: 'img:not([width]):not([height])',
      explanation: 'Specifying aspect ratio dimensions allows browsers to reserve layout space, eliminating Cumulative Layout Shifts (CLS).',
      impactLevel: 'HIGH',
      estimatedScoreImprovement: '+5 to +10 pts',
      guidelineReference: 'Google Core Web Vitals: Cumulative Layout Shift (CLS)',
    });
  }

  // 5. Security Fixes
  if (links?.targetBlankWithoutNoopenerCount && links.targetBlankWithoutNoopenerCount > 0) {
    recs.push({
      category: 'SECURITY',
      priority: 'P0_CRITICAL',
      issue: `${links.targetBlankWithoutNoopenerCount} external link(s) use target="_blank" without rel="noopener noreferrer".`,
      title: 'Mitigate Reverse Tabnabbing Vulnerability',
      codeSnippet: `<a href="https://external.com" target="_blank" rel="noopener noreferrer">External Link</a>`,
      diffSnippet: `- <a href="https://external.com" target="_blank">\n+ <a href="https://external.com" target="_blank" rel="noopener noreferrer">`,
      targetElementSelector: "a[target='_blank']:not([rel*='noopener'])",
      explanation: 'Without rel="noopener noreferrer", the target page can manipulate window.opener to redirect the parent tab to a phishing page.',
      impactLevel: 'HIGH',
      estimatedScoreImprovement: '+5 to +10 pts',
      guidelineReference: 'OWASP Web Security: Reverse Tabnabbing',
    });
  }

  if (sec?.hasMixedContent) {
    recs.push({
      category: 'SECURITY',
      priority: 'P0_CRITICAL',
      issue: `${sec.mixedContentCount} mixed content insecure HTTP resource(s) loaded over HTTPS.`,
      title: 'Upgrade Insecure HTTP Resource Requests to HTTPS',
      codeSnippet: `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`,
      diffSnippet: `+ <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`,
      targetElementSelector: 'head',
      explanation: 'Mixed content allows network attackers to intercept or modify insecure HTTP assets on otherwise encrypted HTTPS pages.',
      impactLevel: 'HIGH',
      estimatedScoreImprovement: '+10 to +15 pts',
      guidelineReference: 'W3C Mixed Content Level 2',
    });
  }

  return recs;
}

export const AiFixConsole: React.FC<AiFixConsoleProps> = ({ audit }) => {
  const { user, updateUser } = useAuth();

  // Active Studio Mode Tab
  type StudioTab = 'FIXES' | 'TITLE_AB' | 'SCHEMA_STUDIO' | 'EXECUTIVE_SUMMARY' | 'AI_CHAT';
  const [activeTab, setActiveTab] = useState<StudioTab>('FIXES');

  // Fixes State
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewModeMap, setViewModeMap] = useState<Record<number, 'code' | 'diff'>>({});

  // Local / Auth Gemini Key resolution
  const [localKey, setLocalKey] = useState<string | null>(() => localStorage.getItem('sitelook_gemini_key'));
  const hasGeminiKey = Boolean(user?.hasGeminiApiKey || localKey);
  const localMasked = localKey ? (localKey.length > 8 ? `${localKey.slice(0, 6)}••••${localKey.slice(-4)}` : '••••••••') : null;
  const activeMaskedKey = user?.geminiApiKeyMasked || localMasked;

  // Title A/B Testing State
  const [titleOptions, setTitleOptions] = useState<AiTitleOption[]>([]);
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleModel, setTitleModel] = useState<string | null>(null);
  const [copiedTitleAngle, setCopiedTitleAngle] = useState<string | null>(null);

  // Executive Summary State
  const [execSummary, setExecSummary] = useState<AiExecutiveSummaryResponse | null>(null);
  const [execLoading, setExecLoading] = useState(false);

  // Schema Studio State
  const [schemaType, setSchemaType] = useState<string>('AUTO');
  const [schemaResult, setSchemaResult] = useState<AiSchemaGenerationResponse | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaCopied, setSchemaCopied] = useState(false);

  // Interactive Multi-Turn Chat State
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quick Gemini Key Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalKeyInput, setModalKeyInput] = useState('');
  const [modalShowKey, setModalShowKey] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalValidating, setModalValidating] = useState(false);
  const [modalStatus, setModalStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const userPrefs = getLocalAiPreferences();

  // Dynamic Gemini Models state & Model Switcher
  const [availableModels, setAvailableModels] = useState<GeminiModelDto[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => user?.preferredAiModel || userPrefs.preferredAiModel || 'gemini-2.0-flash');

  const loadStudioModels = async (keyOverride?: string) => {
    try {
      const res = await fetchAvailableGeminiModels(keyOverride || localKey || undefined);
      if (res.success && res.models && res.models.length > 0) {
        setAvailableModels(res.models);
        if (res.activeModel && (!selectedModel || selectedModel === 'gemini-2.0-flash')) {
          setSelectedModel(res.activeModel);
        }
      }
    } catch (e) {
      console.warn('Could not load studio models:', e);
    }
  };

  const handleSwitchModel = async (newModel: string) => {
    setSelectedModel(newModel);
    const updatedPrefs = { ...userPrefs, preferredAiModel: newModel };
    await saveUserAiPreferences(updatedPrefs);
    if (user) {
      updateUser({ preferredAiModel: newModel });
    }
    loadRecommendations();
  };

  useEffect(() => {
    loadStudioModels();
  }, [hasGeminiKey, localKey, user?.hasGeminiApiKey]);

  // Load Primary Recommendations
  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAiRecommendations(audit);
      if (Array.isArray(data) && data.length > 0) {
        setRecommendations(data);
      } else {
        const fallbackData = generateClientSideAiRecommendations(audit);
        setRecommendations(fallbackData);
      }
    } catch (err: unknown) {
      console.warn('Backend AI recommendations failed, activating client engine fallback:', err);
      const fallbackData = generateClientSideAiRecommendations(audit);
      if (fallbackData.length > 0) {
        setRecommendations(fallbackData);
      } else {
        setError('No automated fixes detected for the audited DOM.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load Title Variations
  const handleLoadTitleVariations = async () => {
    setTitleLoading(true);
    try {
      const res = await fetchAiTitleVariations(audit);
      if (res.success && res.variations) {
        setTitleOptions(res.variations);
        setTitleModel(res.model || 'gemini-2.0-flash');
      }
    } catch (err) {
      console.warn('Failed to load title variations:', err);
    } finally {
      setTitleLoading(false);
    }
  };

  // Load Executive Summary
  const handleLoadExecutiveSummary = async () => {
    setExecLoading(true);
    try {
      const res = await fetchAiExecutiveSummary(audit);
      if (res.success) {
        setExecSummary(res);
      }
    } catch (err) {
      console.warn('Failed to load executive summary:', err);
    } finally {
      setExecLoading(false);
    }
  };

  // Generate Schema
  const handleGenerateSchema = async (typeToGenerate?: string) => {
    const targetType = typeToGenerate || schemaType;
    setSchemaLoading(true);
    try {
      const res = await generateAiSchemaJsonLd(audit, targetType);
      if (res.success) {
        setSchemaResult(res);
      }
    } catch (err) {
      console.warn('Failed to generate schema:', err);
    } finally {
      setSchemaLoading(false);
    }
  };

  // Send Chat Message
  const handleSendChatMessage = async (presetPrompt?: string) => {
    const text = (presetPrompt || chatInput).trim();
    if (!text || chatLoading) return;

    const newHistory: AiChatMessage[] = [...chatMessages, { role: 'user', text }];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await chatWithAiAdvisor(audit, chatMessages, text);
      if (res.success && res.reply) {
        setChatMessages([...newHistory, { role: 'model', text: res.reply }]);
      } else {
        setChatMessages([
          ...newHistory,
          { role: 'model', text: `⚠️ ${res.error || 'Could not contact Gemini AI advisor. Please check your API key.'}` },
        ]);
      }
    } catch (err: any) {
      setChatMessages([
        ...newHistory,
        { role: 'model', text: `⚠️ Network error: ${err?.message || 'Failed to reach AI service'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    loadRecommendations();
  }, [audit.id, audit.url, user?.hasGeminiApiKey, localKey]);

  // Export full AI Action Plan as Markdown file
  const handleExportFullActionPlan = () => {
    const domain = audit.domain || 'example.com';
    let md = `# SiteLook AI Action Plan: ${domain}\n`;
    md += `**Target URL:** ${audit.url}\n`;
    md += `**Audited At:** ${new Date().toLocaleString()}\n`;
    md += `**Health Grade:** ${audit.scores?.healthGrade || 'GOOD'} (${audit.scores?.overallScore || 0}/100)\n`;
    md += `**Personalization Profile:** ${userPrefs.targetNiche || 'General'} | ${userPrefs.brandTone || 'Professional'} | ${userPrefs.primaryObjective || 'SEO'}\n\n`;

    if (execSummary?.executiveHeadline) {
      md += `## Executive Strategy Summary\n`;
      md += `> ${execSummary.executiveHeadline}\n\n`;
      if (execSummary.topQuickWins?.length) {
        md += `### Top Quick Wins:\n`;
        execSummary.topQuickWins.forEach((w: string) => (md += `- ${w}\n`));
        md += `\n`;
      }
      if (execSummary.criticalRedFlags?.length) {
        md += `### Critical Red Flags:\n`;
        execSummary.criticalRedFlags.forEach((r: string) => (md += `- ${r}\n`));
        md += `\n`;
      }
    }

    if (titleOptions.length > 0) {
      md += `## Optimized Title & Meta Description A/B Variations\n\n`;
      titleOptions.forEach((t: AiTitleOption) => {
        md += `### [${t.angle}] (Est. Lift: ${t.estimatedCtrLift || 'High'})\n`;
        md += `- **Title (${t.titleLength} chars):** \`${t.title}\`\n`;
        md += `- **Meta Description (${t.descriptionLength} chars):** \`${t.metaDescription}\`\n`;
        md += `- **Rationale:** ${t.rationale}\n\n`;
      });
    }

    if (schemaResult?.jsonLdScript) {
      md += `## Schema.org JSON-LD Structured Data\n\n`;
      md += `\`\`\`html\n${schemaResult.jsonLdScript}\n\`\`\`\n\n`;
    }

    md += `## Prioritized Technical Code Fixes (${recommendations.length} items)\n\n`;
    recommendations.forEach((r, idx) => {
      md += `### ${idx + 1}. ${r.title} [${r.category} - ${r.priority || 'P1'}]\n`;
      md += `- **Issue:** ${r.issue}\n`;
      md += `- **Explanation:** ${r.explanation}\n`;
      if (r.estimatedScoreImprovement) md += `- **Estimated Impact:** ${r.estimatedScoreImprovement}\n`;
      if (r.guidelineReference) md += `- **Guideline:** ${r.guidelineReference}\n`;
      md += `\n\`\`\`html\n${r.codeSnippet}\n\`\`\`\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sitelook-ai-action-plan-${domain.replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleViewMode = (idx: number) => {
    setViewModeMap((prev) => ({
      ...prev,
      [idx]: prev[idx] === 'diff' ? 'code' : 'diff',
    }));
  };

  // Modal Gemini Key Handlers
  const handleModalValidate = async () => {
    const key = modalKeyInput.trim();
    if (!key) {
      setModalStatus({ type: 'error', message: 'Please enter a Gemini API key to test.' });
      return;
    }
    setModalValidating(true);
    setModalStatus(null);
    try {
      const res = await validateGeminiKey(key);
      if (res.valid) {
        if (res.availableModels && res.availableModels.length > 0) {
          setAvailableModels(res.availableModels);
        }
        if (res.model) {
          setSelectedModel(res.model);
        }
        setModalStatus({ type: 'success', message: res.message || 'Key is valid & verified with Google Gemini!' });
      } else {
        setModalStatus({ type: 'error', message: res.message || 'Invalid Gemini key. Please verify in Google AI Studio.' });
      }
    } catch (err) {
      setModalStatus({ type: 'error', message: err instanceof Error ? err.message : 'Validation failed' });
    } finally {
      setModalValidating(false);
    }
  };

  const handleModalSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const key = modalKeyInput.trim();
    if (!key) return;
    setModalSaving(true);
    setModalStatus(null);
    try {
      const updatedProfile = await saveUserGeminiKey(key);
      setLocalKey(key);
      if (user) {
        updateUser({
          hasGeminiApiKey: updatedProfile.hasGeminiApiKey,
          geminiApiKeyMasked: updatedProfile.geminiApiKeyMasked,
        });
      }
      setModalStatus({ type: 'success', message: 'Gemini Key saved & active! Generating live AI recommendations...' });
      setTimeout(() => {
        setShowKeyModal(false);
        setModalKeyInput('');
        setModalStatus(null);
        loadRecommendations();
      }, 1000);
    } catch (err) {
      setModalStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save key' });
    } finally {
      setModalSaving(false);
    }
  };

  const handleModalRemove = async () => {
    setModalSaving(true);
    setModalStatus(null);
    try {
      await removeUserGeminiKey();
      setLocalKey(null);
      if (user) {
        updateUser({
          hasGeminiApiKey: false,
          geminiApiKeyMasked: null,
        });
      }
      setModalStatus({ type: 'success', message: 'Gemini Key removed. Reverted to heuristic rules.' });
      setTimeout(() => {
        setShowKeyModal(false);
        setModalKeyInput('');
        setModalStatus(null);
        loadRecommendations();
      }, 1000);
    } catch (err) {
      setModalStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to remove key' });
    } finally {
      setModalSaving(false);
    }
  };

  const filteredRecs = recommendations.filter((r) => {
    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.codeSnippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.explanation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['ALL', 'SEO', 'ACCESSIBILITY', 'CONTENT', 'PERFORMANCE', 'SECURITY'];

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'P0_CRITICAL':
        return <span className="rounded bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-400">P0 CRITICAL</span>;
      case 'P1_MAJOR':
        return <span className="rounded bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400">P1 MAJOR</span>;
      case 'P2_MODERATE':
        return <span className="rounded bg-sky-500/15 border border-sky-500/40 px-2 py-0.5 text-[10px] font-bold text-sky-400">P2 MODERATE</span>;
      default:
        return <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">P3 LOW</span>;
    }
  };

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return <span className="rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">HIGH IMPACT</span>;
      case 'MEDIUM':
        return <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">MEDIUM IMPACT</span>;
      default:
        return <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">LOW IMPACT</span>;
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-[#12151A] p-5 shadow-2xl font-mono text-xs relative">
      {/* Quick Configure Gemini Modal Dialog */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-input bg-[#12151A] p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-[#4FD8C4]">
                <SparkleIcon className="size-4 animate-pulse" />
                <h4 className="font-bold text-sm text-[#E7EAEE]">Configure Google Gemini API Key</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowKeyModal(false);
                  setModalStatus(null);
                }}
                className="text-[#8B93A1] hover:text-[#E7EAEE] p-1 cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <p className="text-xs text-[#8B93A1] font-sans leading-relaxed">
              Adding your personal Gemini API Key enables real-time, tailored SEO improvements, JSON-LD Schema generation, and custom prompt consultations.
            </p>

            <form onSubmit={handleModalSave} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="modal-gemini-key-input" className="text-[11px] font-semibold text-[#8B93A1] uppercase block">Gemini API Key</label>
                <div className="relative">
                  <input
                    id="modal-gemini-key-input"
                    type={modalShowKey ? 'text' : 'password'}
                    required
                    placeholder="AIzaSy..."
                    value={modalKeyInput}
                    onChange={(e) => setModalKeyInput(e.target.value)}
                    disabled={modalSaving}
                    className="w-full bg-[#0A0C0F] border border-input rounded-lg pl-3 pr-10 py-2 text-xs text-[#E7EAEE] focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setModalShowKey(!modalShowKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B93A1] hover:text-[#E7EAEE] p-1 cursor-pointer"
                  >
                    {modalShowKey ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>

              {modalStatus && (
                <div
                  className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                    modalStatus.type === 'success'
                      ? 'border border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80]'
                      : 'border border-[#F87171]/30 bg-[#F87171]/10 text-[#F87171]'
                  }`}
                >
                  {modalStatus.type === 'success' ? <CheckCircleIcon className="size-4 shrink-0" /> : <WarningCircleIcon className="size-4 shrink-0" />}
                  <span>{modalStatus.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#4FD8C4] hover:underline inline-flex items-center gap-1"
                >
                  <span>Get Free Key</span>
                  <ArrowSquareOutIcon className="size-3.5" />
                </a>

                <div className="flex items-center gap-2">
                  {hasGeminiKey && (
                    <button
                      type="button"
                      onClick={handleModalRemove}
                      disabled={modalSaving}
                      className="px-3 py-1.5 rounded bg-[#F87171]/10 border border-[#F87171]/30 hover:bg-[#F87171]/20 text-xs text-[#F87171] font-semibold cursor-pointer disabled:opacity-40"
                    >
                      Remove Key
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleModalValidate}
                    disabled={modalValidating || !modalKeyInput.trim()}
                    className="px-3 py-1.5 rounded bg-[#191D24] border border-input hover:bg-border text-xs text-[#8B93A1] hover:text-[#E7EAEE] font-semibold cursor-pointer disabled:opacity-40"
                  >
                    {modalValidating ? 'Testing...' : 'Test Key'}
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving || !modalKeyInput.trim()}
                    className="px-4 py-1.5 rounded bg-[#4FD8C4]/15 border border-[#4FD8C4]/40 hover:bg-[#4FD8C4]/25 text-xs text-[#4FD8C4] font-bold cursor-pointer disabled:opacity-40"
                  >
                    {modalSaving ? 'Saving...' : 'Save & Apply'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <SparkleIcon className="size-4 text-[#4FD8C4] animate-pulse" />
            <h3 className="font-bold text-[#E7EAEE] text-sm">AI SEO & Web Quality Studio</h3>
            {hasGeminiKey ? (
              <span className="rounded bg-[#4ADE80]/15 border border-[#4ADE80]/30 px-2 py-0.5 text-[10px] text-[#4ADE80] font-semibold flex items-center gap-1">
                <CheckCircleIcon className="size-3" />
                Gemini AI Active {activeMaskedKey ? `(${activeMaskedKey})` : ''}
              </span>
            ) : (
              <span className="rounded bg-[#FBBF24]/15 border border-[#FBBF24]/30 px-2 py-0.5 text-[10px] text-[#FBBF24] font-semibold flex items-center gap-1">
                <SparkleIcon className="size-3" />
                Heuristic Mode
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#7AA2F7]/10 text-[#7AA2F7] border border-[#7AA2F7]/30">
              {userPrefs.targetNiche || 'SaaS & B2B Tech'} • {userPrefs.brandTone || 'Authoritative'}
            </span>
          </div>
          <p className="text-[11px] text-[#8B93A1] font-sans">
            Personalized code fixes, CTR-boosting title variations, Schema.org JSON-LD generation, and interactive consultation for {audit.domain || audit.url}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Model Switcher */}
          <div className="flex items-center gap-1.5 rounded border border-[#333A45] bg-[#191D24] px-2.5 py-1 text-xs text-[#E7EAEE] shadow hover:border-[#4FD8C4]/50 transition-colors">
            <SparkleIcon className="size-3.5 text-[#4FD8C4]" />
            <span className="text-[10px] text-[#8B93A1] uppercase font-bold hidden sm:inline">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => handleSwitchModel(e.target.value)}
              className="bg-transparent text-xs text-[#4FD8C4] font-bold focus:outline-none cursor-pointer pr-1"
              title="Switch active Google Gemini model tier"
            >
              {availableModels.length > 0 ? (
                availableModels.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#12151A] text-[#E7EAEE]">
                    {m.displayName || m.id} {m.isRecommended ? '★' : ''}
                  </option>
                ))
              ) : (
                <>
                  <option value="gemini-2.0-flash" className="bg-[#12151A] text-[#E7EAEE]">gemini-2.0-flash ★</option>
                  <option value="gemini-2.5-flash" className="bg-[#12151A] text-[#E7EAEE]">gemini-2.5-flash</option>
                  <option value="gemini-1.5-pro" className="bg-[#12151A] text-[#E7EAEE]">gemini-1.5-pro</option>
                  <option value="gemini-1.5-flash" className="bg-[#12151A] text-[#E7EAEE]">gemini-1.5-flash</option>
                </>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportFullActionPlan}
            className="inline-flex items-center gap-1.5 rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 hover:bg-[#4FD8C4]/20 px-2.5 py-1.5 text-xs text-[#4FD8C4] font-bold transition-all cursor-pointer shadow"
            title="Download full customized AI Action Plan as Markdown"
          >
            <DownloadSimpleIcon className="size-3.5" />
            <span>Export Action Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="inline-flex items-center gap-1.5 rounded border border-input bg-[#191D24] px-2.5 py-1.5 text-xs text-[#8B93A1] hover:text-[#4FD8C4] hover:border-[#4FD8C4]/40 transition-all cursor-pointer shadow"
            title="Configure Google Gemini API key"
          >
            <GearIcon className="size-3.5" />
            <span>{hasGeminiKey ? 'Gemini Key' : 'Configure Key'}</span>
          </button>

          <button
            type="button"
            onClick={loadRecommendations}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded border border-input bg-[#191D24] px-3 py-1.5 text-xs text-[#E7EAEE] hover:bg-border transition-all cursor-pointer disabled:opacity-50"
          >
            <ArrowsClockwiseIcon className={`size-3.5 ${loading ? 'animate-spin text-[#4FD8C4]' : 'text-[#8B93A1]'}`} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('FIXES')}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            activeTab === 'FIXES'
              ? 'bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/40 shadow'
              : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#191D24]'
          }`}
        >
          <ListChecksIcon className="size-3.5" />
          <span>Actionable Fixes ({recommendations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('TITLE_AB');
            if (titleOptions.length === 0) handleLoadTitleVariations();
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            activeTab === 'TITLE_AB'
              ? 'bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/40 shadow'
              : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#191D24]'
          }`}
        >
          <RocketLaunchIcon className="size-3.5" />
          <span>A/B Title & Meta Studio</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('SCHEMA_STUDIO');
            if (!schemaResult) handleGenerateSchema('AUTO');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            activeTab === 'SCHEMA_STUDIO'
              ? 'bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/40 shadow'
              : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#191D24]'
          }`}
        >
          <BracketsCurlyIcon className="size-3.5" />
          <span>Schema.org JSON-LD</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('EXECUTIVE_SUMMARY');
            if (!execSummary) handleLoadExecutiveSummary();
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            activeTab === 'EXECUTIVE_SUMMARY'
              ? 'bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/40 shadow'
              : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#191D24]'
          }`}
        >
          <ChartBarIcon className="size-3.5" />
          <span>Executive Strategy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AI_CHAT')}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            activeTab === 'AI_CHAT'
              ? 'bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/40 shadow'
              : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#191D24]'
          }`}
        >
          <ChatCircleDotsIcon className="size-3.5" />
          <span>Interactive AI Chat</span>
        </button>
      </div>

      {/* ────────────────── TAB 1: ACTIONABLE CODE FIXES ────────────────── */}
      {activeTab === 'FIXES' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter and Search Controls Strip */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-text-faint text-[11px] mr-1">Category:</span>
              {categories.map((cat) => {
                const count = cat === 'ALL' ? recommendations.length : recommendations.filter((r) => r.category === cat).length;
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1 ${
                      selectedCategory === cat
                        ? 'bg-[#191D24] text-[#4FD8C4] border border-[#4FD8C4]/40 shadow'
                        : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#191D24]'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[9px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code fixes..."
                className="w-full rounded border border-border bg-[#0A0C0F] pl-8 pr-3 py-1 text-[11px] text-[#E7EAEE] focus:outline-none transition-all"
              />
            </div>
          </div>

          {loading && (
            <div className="p-8 text-center space-y-2 rounded-lg border border-border bg-[#0A0C0F]">
              <CpuIcon className="size-6 text-[#4FD8C4] animate-spin mx-auto" />
              <p className="text-[#E7EAEE] font-semibold text-xs">Analyzing DOM audit findings with Gemini AI engine...</p>
              <p className="text-[11px] text-[#8B93A1]">Synthesizing tailored HTML meta tags, alt attributes, and JSON-LD schemas.</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
              <ShieldWarningIcon className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && filteredRecs.length === 0 && (
            <div className="p-8 text-center space-y-2 rounded-lg border border-border bg-[#0A0C0F] text-[#8B93A1]">
              <CheckCircleIcon className="size-6 text-[#4ADE80] mx-auto" />
              <p className="text-[#E7EAEE] font-semibold text-xs">No AI code fixes needed for this category!</p>
              <p className="text-[11px]">The audited page already adheres to standards for selected metrics.</p>
            </div>
          )}

          {!loading && !error && filteredRecs.length > 0 && (
            <div className="space-y-4 pt-1">
              {filteredRecs.map((rec, idx) => {
                const isCopied = copiedIndex === idx;
                const viewMode = viewModeMap[idx] || 'code';
                const hasDiff = !!rec.diffSnippet;

                return (
                  <div
                    key={`${rec.title}-${idx}`}
                    className="rounded-lg border border-border bg-[#0A0C0F] p-4 space-y-3 hover:border-input transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CodeIcon className="size-4 text-[#4FD8C4] shrink-0" />
                        <span className="font-bold text-[#E7EAEE] text-xs">{rec.title}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {rec.engineSource === 'GEMINI_AI' ? (
                          <span className="rounded bg-[#4FD8C4]/15 border border-[#4FD8C4]/30 px-2 py-0.5 text-[10px] font-bold text-[#4FD8C4] inline-flex items-center gap-1">
                            <SparkleIcon className="size-3 text-[#4FD8C4]" />
                            Gemini AI ({rec.model || 'gemini-2.0-flash'})
                          </span>
                        ) : (
                          <span className="rounded bg-[#8B93A1]/15 border border-[#8B93A1]/30 px-2 py-0.5 text-[10px] font-bold text-[#8B93A1] inline-flex items-center gap-1">
                            <CpuIcon className="size-3 text-[#8B93A1]" />
                            Heuristic
                          </span>
                        )}
                        {getPriorityBadge(rec.priority)}
                        <span className="rounded bg-[#191D24] border border-border px-2 py-0.5 text-[10px] font-bold text-[#8B93A1]">
                          {rec.category}
                        </span>
                        {getImpactBadge(rec.impactLevel)}
                        {rec.estimatedScoreImprovement && (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            {rec.estimatedScoreImprovement}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[#8B93A1] text-[11px] font-sans leading-relaxed flex items-start gap-1.5">
                      <strong className="text-amber-400 font-mono shrink-0">Issue: </strong>
                      <span>{rec.issue}</span>
                    </div>

                    {rec.targetElementSelector && (
                      <div className="flex items-center gap-1.5 text-[10px] text-text-faint">
                        <TagIcon className="size-3 text-[#4FD8C4]" />
                        <span>Target DOM Selector:</span>
                        <code className="bg-[#12151A] px-1.5 py-0.5 rounded text-[#4FD8C4] border border-border">
                          {rec.targetElementSelector}
                        </code>
                      </div>
                    )}

                    <div className="relative rounded-md border border-border bg-[#12151A] p-3 overflow-x-auto group">
                      <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#191D24] text-[10px] text-text-faint">
                        <div className="flex items-center gap-2">
                          <span>{viewMode === 'diff' ? 'Unified Code Diff' : 'Suggested Code Snippet'}</span>
                          {hasDiff && (
                            <button
                              type="button"
                              onClick={() => toggleViewMode(idx)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#191D24] border border-border text-[#8B93A1] hover:text-[#4FD8C4] transition-all cursor-pointer text-[9px]"
                            >
                              <GitDiffIcon className="size-3" />
                              <span>{viewMode === 'diff' ? 'Show Snippet' : 'Show Diff'}</span>
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(viewMode === 'diff' && rec.diffSnippet ? rec.diffSnippet : rec.codeSnippet, idx)}
                          className="inline-flex items-center gap-1 rounded bg-[#191D24] border border-input px-2.5 py-1 text-[11px] font-semibold text-[#4FD8C4] hover:bg-border transition-all cursor-pointer shadow"
                        >
                          {isCopied ? (
                            <>
                              <CheckIcon className="size-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="size-3" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre
                        className={`font-mono text-[11px] whitespace-pre-wrap break-all leading-relaxed ${
                          viewMode === 'diff' ? 'text-info' : 'text-[#4ADE80]'
                        }`}
                      >
                        {viewMode === 'diff' && rec.diffSnippet ? rec.diffSnippet : rec.codeSnippet}
                      </pre>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-sans bg-[#12151A]/60 p-2.5 rounded border border-[#191D24]">
                      <p className="text-[#8B93A1] leading-relaxed">
                        <strong className="text-[#4FD8C4] font-mono">Guidance: </strong> {rec.explanation}
                      </p>
                      {rec.guidelineReference && (
                        <span className="text-[10px] font-mono text-text-faint shrink-0 inline-flex items-center gap-1 bg-[#191D24] px-2 py-1 rounded border border-border">
                          <BookOpenIcon className="size-3 text-[#4FD8C4]" />
                          {rec.guidelineReference}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 2: A/B TITLE & META STUDIO ────────────────── */}
      {activeTab === 'TITLE_AB' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between bg-[#0A0C0F] p-4 rounded-lg border border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RocketLaunchIcon className="size-4 text-[#4FD8C4]" />
                <h4 className="font-bold text-xs text-[#E7EAEE] uppercase tracking-wider">A/B Title & Meta Description Generator</h4>
                {titleModel && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 font-bold">
                    ✦ {titleModel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8B93A1] font-sans">
                Generates 3 search-optimized angles grounded in your brand voice ({userPrefs.brandTone || 'Professional'}) to maximize click-through rate.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadTitleVariations}
              disabled={titleLoading}
              className="px-3.5 py-1.5 rounded-lg bg-[#4FD8C4]/15 border border-[#4FD8C4]/40 hover:bg-[#4FD8C4]/25 text-[#4FD8C4] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <ArrowsClockwiseIcon className={`size-3.5 ${titleLoading ? 'animate-spin' : ''}`} />
              <span>{titleLoading ? 'Synthesizing...' : 'Generate Variations'}</span>
            </button>
          </div>

          {titleLoading && (
            <div className="p-8 text-center space-y-2 rounded-lg border border-border bg-[#0A0C0F]">
              <CpuIcon className="size-6 text-[#4FD8C4] animate-spin mx-auto" />
              <p className="text-[#E7EAEE] font-semibold text-xs">Crafting high-converting Title & Meta variations...</p>
            </div>
          )}

          {!titleLoading && titleOptions.length === 0 && (
            <div className="p-8 text-center space-y-3 rounded-lg border border-border bg-[#0A0C0F] text-[#8B93A1]">
              <RocketLaunchIcon className="size-6 text-[#4FD8C4] mx-auto" />
              <p className="text-xs text-[#E7EAEE]">Click &quot;Generate Variations&quot; to synthesize 3 distinct high-CTR Title and Meta description options.</p>
              <button
                type="button"
                onClick={handleLoadTitleVariations}
                className="px-4 py-2 rounded-lg bg-[#4FD8C4]/15 border border-[#4FD8C4]/40 text-[#4FD8C4] font-bold text-xs cursor-pointer"
              >
                Synthesize A/B Variations Now
              </button>
            </div>
          )}

          {!titleLoading && titleOptions.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {titleOptions.map((opt, idx) => {
                const isCopied = copiedTitleAngle === opt.angle;
                return (
                  <div key={`${opt.angle}-${opt.title}`} className="rounded-lg border border-border bg-[#0A0C0F] p-4 space-y-3 hover:border-[#4FD8C4]/40 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#191D24] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/30">
                          Angle #{idx + 1}: {opt.angle}
                        </span>
                        {opt.estimatedCtrLift && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
                            Est. Lift: {opt.estimatedCtrLift}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`<title>${opt.title}</title>\n<meta name="description" content="${opt.metaDescription}">`);
                          setCopiedTitleAngle(opt.angle);
                          setTimeout(() => setCopiedTitleAngle(null), 2000);
                        }}
                        className="px-2.5 py-1 rounded bg-[#191D24] border border-input text-xs text-[#4FD8C4] hover:bg-border cursor-pointer inline-flex items-center gap-1 shrink-0"
                      >
                        {isCopied ? <CheckIcon className="size-3 text-[#4ADE80]" /> : <CopyIcon className="size-3" />}
                        <span>{isCopied ? 'Copied Tags!' : 'Copy Title & Meta'}</span>
                      </button>
                    </div>

                    {/* Google SERP Simulated Preview */}
                    <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-3 space-y-1 font-sans">
                      <div className="text-[11px] text-[#8B93A1] truncate flex items-center gap-1">
                        <GlobeIcon className="size-3 text-[#4FD8C4]" />
                        <span>https://{audit.domain || 'example.com'}</span>
                      </div>
                      <div className="text-sm font-semibold text-[#7AA2F7] hover:underline cursor-pointer leading-tight">
                        {opt.title}
                      </div>
                      <p className="text-xs text-[#8B93A1] leading-relaxed">
                        {opt.metaDescription}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-[#12151A] border border-[#191D24] space-y-0.5">
                        <div className="flex justify-between text-text-faint">
                          <span>Title Length</span>
                          <span className={opt.titleLength <= 60 ? 'text-[#4ADE80]' : 'text-[#F87171]'}>{opt.titleLength} / 60 chars</span>
                        </div>
                        <code className="text-[#E7EAEE] text-[11px] block truncate">{opt.title}</code>
                      </div>
                      <div className="p-2 rounded bg-[#12151A] border border-[#191D24] space-y-0.5">
                        <div className="flex justify-between text-text-faint">
                          <span>Description Length</span>
                          <span className={opt.descriptionLength <= 160 ? 'text-[#4ADE80]' : 'text-[#F87171]'}>{opt.descriptionLength} / 160 chars</span>
                        </div>
                        <code className="text-[#E7EAEE] text-[11px] block truncate">{opt.metaDescription}</code>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#8B93A1] font-sans">
                      <strong className="text-[#4FD8C4] font-mono">Strategy: </strong>
                      {opt.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 3: SCHEMA.ORG JSON-LD STUDIO ────────────────── */}
      {activeTab === 'SCHEMA_STUDIO' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0C0F] p-4 rounded-lg border border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BracketsCurlyIcon className="size-4 text-[#4FD8C4]" />
                <h4 className="font-bold text-xs text-[#E7EAEE] uppercase tracking-wider">Schema.org Rich Snippet Studio</h4>
                {schemaResult?.detectedType && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 font-bold">
                    Type: {schemaResult.detectedType}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8B93A1] font-sans">
                Generates valid, copy-ready JSON-LD schemas tailored for your industry ({userPrefs.targetNiche || 'SaaS'}) to qualify for Google rich snippet search badges.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={schemaType}
                onChange={(e) => {
                  setSchemaType(e.target.value);
                  handleGenerateSchema(e.target.value);
                }}
                className="bg-[#12151A] border border-input rounded-lg px-2.5 py-1.5 text-xs text-[#E7EAEE] focus:outline-none cursor-pointer"
              >
                <option value="AUTO">Auto-Detect Schema</option>
                <option value="SoftwareApplication">SoftwareApplication (SaaS)</option>
                <option value="Product">Product (E-Commerce)</option>
                <option value="Article">Article / BlogPost</option>
                <option value="Organization">Organization / Corporate</option>
                <option value="LocalBusiness">LocalBusiness</option>
                <option value="FAQPage">FAQPage</option>
              </select>

              <button
                type="button"
                onClick={() => handleGenerateSchema()}
                disabled={schemaLoading}
                className="px-3 py-1.5 rounded-lg bg-[#4FD8C4]/15 border border-[#4FD8C4]/40 hover:bg-[#4FD8C4]/25 text-[#4FD8C4] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40 shrink-0"
              >
                <ArrowsClockwiseIcon className={`size-3.5 ${schemaLoading ? 'animate-spin' : ''}`} />
                <span>{schemaLoading ? 'Generating...' : 'Regenerate'}</span>
              </button>
            </div>
          </div>

          {schemaLoading && (
            <div className="p-8 text-center space-y-2 rounded-lg border border-border bg-[#0A0C0F]">
              <CpuIcon className="size-6 text-[#4FD8C4] animate-spin mx-auto" />
              <p className="text-[#E7EAEE] font-semibold text-xs">Synthesizing Schema.org JSON-LD structured data...</p>
            </div>
          )}

          {!schemaLoading && schemaResult && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-[#0A0C0F] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#191D24] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#E7EAEE]">Generated JSON-LD Structured Data</span>
                    {schemaResult.model && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/30 font-bold">
                        ✦ {schemaResult.model}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (schemaResult.jsonLdScript) {
                        navigator.clipboard.writeText(schemaResult.jsonLdScript);
                        setSchemaCopied(true);
                        setTimeout(() => setSchemaCopied(false), 2000);
                      }
                    }}
                    className="px-3 py-1 rounded bg-[#191D24] border border-input text-xs text-[#4FD8C4] hover:bg-border cursor-pointer inline-flex items-center gap-1"
                  >
                    {schemaCopied ? <CheckIcon className="size-3 text-[#4ADE80]" /> : <CopyIcon className="size-3" />}
                    <span>{schemaCopied ? 'Copied Script!' : 'Copy Script Tag'}</span>
                  </button>
                </div>

                <pre className="font-mono text-xs text-[#4ADE80] bg-[#12151A] p-3 rounded-lg border border-[#262B33] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {schemaResult.jsonLdScript}
                </pre>

                {schemaResult.explanation && (
                  <p className="text-[11px] text-[#8B93A1] font-sans">
                    <strong className="text-[#4FD8C4] font-mono">Why this works: </strong>
                    {schemaResult.explanation}
                  </p>
                )}

                {schemaResult.validationNotes && (
                  <div className="p-2.5 rounded bg-[#12151A] border border-[#191D24] text-[11px] text-[#8B93A1] flex items-center gap-2">
                    <CheckCircleIcon className="size-4 text-[#4ADE80] shrink-0" />
                    <span>{schemaResult.validationNotes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 4: EXECUTIVE STRATEGY SUMMARY ────────────────── */}
      {activeTab === 'EXECUTIVE_SUMMARY' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between bg-[#0A0C0F] p-4 rounded-lg border border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="size-4 text-[#4FD8C4]" />
                <h4 className="font-bold text-xs text-[#E7EAEE] uppercase tracking-wider">Executive AI SEO Strategy</h4>
                {execSummary?.overallHealthStatus && (
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                      execSummary.overallHealthStatus === 'EXCELLENT'
                        ? 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30'
                        : execSummary.overallHealthStatus === 'HEALTHY'
                        ? 'bg-[#7AA2F7]/15 text-[#7AA2F7] border-[#7AA2F7]/30'
                        : 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30'
                    }`}
                  >
                    Status: {execSummary.overallHealthStatus}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8B93A1] font-sans">
                High-level tactical summary highlighting top quick wins, critical red flags, and competitive ranking angles.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadExecutiveSummary}
              disabled={execLoading}
              className="px-3.5 py-1.5 rounded-lg bg-[#4FD8C4]/15 border border-[#4FD8C4]/40 hover:bg-[#4FD8C4]/25 text-[#4FD8C4] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <ArrowsClockwiseIcon className={`size-3.5 ${execLoading ? 'animate-spin' : ''}`} />
              <span>{execLoading ? 'Analyzing...' : 'Refresh Strategy'}</span>
            </button>
          </div>

          {execLoading && (
            <div className="p-8 text-center space-y-2 rounded-lg border border-border bg-[#0A0C0F]">
              <CpuIcon className="size-6 text-[#4FD8C4] animate-spin mx-auto" />
              <p className="text-[#E7EAEE] font-semibold text-xs">Synthesizing executive technical insights...</p>
            </div>
          )}

          {!execLoading && execSummary && (
            <div className="space-y-4">
              {/* Executive Headline */}
              {execSummary.executiveHeadline && (
                <div className="p-4 rounded-lg border border-[#4FD8C4]/30 bg-[#4FD8C4]/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#4FD8C4] tracking-wider block">Executive Summary Headline</span>
                  <div className="text-sm font-semibold text-[#E7EAEE] font-sans leading-relaxed">
                    &quot;{execSummary.executiveHeadline}&quot;
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Quick Wins */}
                <div className="rounded-lg border border-border bg-[#0A0C0F] p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-[#4ADE80] font-bold text-xs">
                    <RocketLaunchIcon className="size-4" />
                    <span>Top 3 Highest-ROI Quick Wins</span>
                  </div>
                  <ul className="space-y-2 text-xs font-sans text-[#E7EAEE]">
                    {execSummary.topQuickWins?.map((win: string) => (
                      <li key={win} className="flex items-start gap-2">
                        <span className="text-[#4ADE80] font-bold font-mono">✓</span>
                        <span>{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Critical Red Flags */}
                <div className="rounded-lg border border-border bg-[#0A0C0F] p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-[#F87171] font-bold text-xs">
                    <WarningCircleIcon className="size-4" />
                    <span>Critical Red Flags Hurting Indexing / CTR</span>
                  </div>
                  <ul className="space-y-2 text-xs font-sans text-[#E7EAEE]">
                    {execSummary.criticalRedFlags?.map((flag: string) => (
                      <li key={flag} className="flex items-start gap-2">
                        <span className="text-[#F87171] font-bold font-mono">!</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Competitor Ranking Angle */}
              {execSummary.competitorRankingAngle && (
                <div className="p-4 rounded-lg border border-border bg-[#0A0C0F] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#7AA2F7] font-bold text-xs">
                    <TargetIcon className="size-4" />
                    <span>Competitive Ranking & Authority Strategy</span>
                  </div>
                  <p className="text-xs text-[#8B93A1] font-sans leading-relaxed">
                    {execSummary.competitorRankingAngle}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 5: INTERACTIVE MULTI-TURN AI CHAT ────────────────── */}
      {activeTab === 'AI_CHAT' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-[#0A0C0F] p-4 rounded-lg border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#4FD8C4] font-bold text-xs">
                <ChatCircleDotsIcon className="size-4 animate-pulse" />
                <span>Interactive SiteLook AI Assistant</span>
              </div>
              <span className="text-[10px] text-[#8B93A1] font-sans">
                Context: {audit.domain} • Niche: {userPrefs.targetNiche || 'SaaS'}
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Audit heading hierarchy (H1, H2, H3)',
                'Write an FAQ section with Schema markup',
                'How can I improve Core Web Vitals for this page?',
                'Give 5 high-converting meta description A/B ideas',
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSendChatMessage(p)}
                  disabled={chatLoading}
                  className="text-[10px] font-sans px-2.5 py-1 rounded-full bg-[#191D24] border border-border hover:border-[#4FD8C4]/40 hover:text-[#4FD8C4] text-[#8B93A1] transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="rounded-lg border border-border bg-[#0A0C0F] p-4 min-h-[260px] max-h-[440px] overflow-y-auto space-y-3 font-sans text-xs">
            {chatMessages.length === 0 ? (
              <div className="text-center py-12 text-[#565D68] space-y-2 font-mono">
                <SparkleIcon className="size-8 mx-auto text-[#4FD8C4]/40" />
                <p className="text-xs text-[#8B93A1]">Ask anything about {audit.domain} SEO, code fixes, or conversion architecture.</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={`${msg.role}-${msg.text.slice(0, 15)}-${idx}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] p-3.5 rounded-xl leading-relaxed ${
                        isUser
                          ? 'bg-[#4FD8C4]/15 border border-[#4FD8C4]/30 text-[#E7EAEE]'
                          : 'bg-[#12151A] border border-[#262B33] text-[#E7EAEE]'
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold mb-1 opacity-70">
                        {isUser ? 'You' : '✦ SiteLook AI (Gemini)'}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                );
              })
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-xl bg-[#12151A] border border-[#262B33] text-[#4FD8C4] flex items-center gap-2 text-xs">
                  <CpuIcon className="size-4 animate-spin" />
                  <span>SiteLook AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask any SEO or web quality question about this page..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              className="flex-1 bg-[#0A0C0F] border border-input rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:outline-none font-sans"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="px-4 py-2 rounded-lg bg-[#4FD8C4]/15 border border-[#4FD8C4]/40 hover:bg-[#4FD8C4]/25 text-[#4FD8C4] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40 shrink-0"
            >
              <PaperPlaneRightIcon className="size-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};


