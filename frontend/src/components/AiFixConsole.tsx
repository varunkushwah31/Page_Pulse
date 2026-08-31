import React, { useState, useEffect } from 'react';
import type { AuditResponse, AiRecommendation } from '../types';
import { fetchAiRecommendations, saveUserGeminiKey, removeUserGeminiKey, validateGeminiKey, askGeminiCustomSeo } from '../lib/api';
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
  const brandName = domain.split('.')[0] ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : 'Page Pulse';

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
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewModeMap, setViewModeMap] = useState<Record<number, 'code' | 'diff'>>({});

  // Local / Auth Gemini Key resolution
  const [localKey, setLocalKey] = useState<string | null>(() => localStorage.getItem('pagepulse_gemini_key'));
  const hasGeminiKey = Boolean(user?.hasGeminiApiKey || localKey);
  const localMasked = localKey ? (localKey.length > 8 ? `${localKey.slice(0, 6)}••••${localKey.slice(-4)}` : '••••••••') : null;
  const activeMaskedKey = user?.geminiApiKeyMasked || localMasked;

  // Quick Gemini Key Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalKeyInput, setModalKeyInput] = useState('');
  const [modalShowKey, setModalShowKey] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalValidating, setModalValidating] = useState(false);
  const [modalStatus, setModalStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom Interactive Gemini Prompt Console State
  const [showCustomConsole, setShowCustomConsole] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customResponse, setCustomResponse] = useState<{ response?: string; model?: string; error?: string } | null>(null);
  const [customCopied, setCustomCopied] = useState(false);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAiRecommendations(audit);
      if (Array.isArray(data) && data.length > 0) {
        setRecommendations(data);
      } else {
        // Fallback to client generator if empty or missing
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

  useEffect(() => {
    loadRecommendations();
  }, [audit.id, audit.url, user?.hasGeminiApiKey, localKey]);

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

  const handleModalSave = async (e: React.FormEvent) => {
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

  // Interactive Custom SEO Prompt Handler
  const handleAskGemini = async (promptToSend?: string) => {
    const query = (promptToSend || customPrompt).trim();
    if (!query || customLoading) return;

    setCustomLoading(true);
    setCustomResponse(null);
    setCustomPrompt(query);
    try {
      const res = await askGeminiCustomSeo(audit, query);
      if (res.success && res.response) {
        setCustomResponse({
          response: res.response,
          model: res.model || 'gemini-3.1-flash',
        });
      } else {
        setCustomResponse({
          error: res.error || 'Gemini could not generate a response. Please check your API key or prompt.',
        });
      }
    } catch (err) {
      setCustomResponse({
        error: err instanceof Error ? err.message : 'Network error communicating with Gemini API.',
      });
    } finally {
      setCustomLoading(false);
    }
  };

  const handleCopyCustomResponse = () => {
    if (customResponse?.response) {
      navigator.clipboard.writeText(customResponse.response);
      setCustomCopied(true);
      setTimeout(() => setCustomCopied(false), 2000);
    }
  };

  const quickPrompts = [
    'Suggest 5 high-converting meta descriptions under 160 chars',
    'Generate complete Schema.org JSON-LD structured data for this page',
    'How should I structure the H1, H2, and H3 headings for maximum SEO?',
    'Give 5 semantic LSI keywords and search intent improvements',
  ];

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
        return (
          <span className="rounded bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-400">
            P0 CRITICAL
          </span>
        );
      case 'P1_MAJOR':
        return (
          <span className="rounded bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            P1 MAJOR
          </span>
        );
      case 'P2_MODERATE':
        return (
          <span className="rounded bg-sky-500/15 border border-sky-500/40 px-2 py-0.5 text-[10px] font-bold text-sky-400">
            P2 MODERATE
          </span>
        );
      default:
        return (
          <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
            P3 LOW
          </span>
        );
    }
  };

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
            HIGH IMPACT
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            MEDIUM IMPACT
          </span>
        );
      default:
        return (
          <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
            LOW IMPACT
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#262B33] bg-[#12151A] p-5 shadow-2xl font-mono text-xs relative">
      {/* Quick Configure Gemini Modal Dialog */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-[#333A45] bg-[#12151A] p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
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
                <label className="text-[11px] font-semibold text-[#8B93A1] uppercase block">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={modalShowKey ? 'text' : 'password'}
                    required
                    placeholder="AIzaSy..."
                    value={modalKeyInput}
                    onChange={(e) => setModalKeyInput(e.target.value)}
                    disabled={modalSaving}
                    className="w-full bg-[#0A0C0F] border border-[#333A45] rounded-lg pl-3 pr-10 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none font-mono"
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
                  {modalStatus.type === 'success' ? (
                    <CheckCircleIcon className="size-4 shrink-0" />
                  ) : (
                    <WarningCircleIcon className="size-4 shrink-0" />
                  )}
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
                    className="px-3 py-1.5 rounded bg-[#191D24] border border-[#333A45] hover:bg-[#262B33] text-xs text-[#8B93A1] hover:text-[#E7EAEE] font-semibold cursor-pointer disabled:opacity-40"
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#262B33] pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <SparkleIcon className="size-4 text-[#4FD8C4] animate-pulse" />
            <h3 className="font-bold text-[#E7EAEE] text-sm">AI Actionable Fix Suggestions</h3>
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
          </div>
          <p className="text-[11px] text-[#8B93A1] font-sans">
            Ready-to-copy code fixes and DOM markup optimizations tailored for {audit.domain || audit.url}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="inline-flex items-center gap-1.5 rounded border border-[#333A45] bg-[#191D24] px-2.5 py-1.5 text-xs text-[#8B93A1] hover:text-[#4FD8C4] hover:border-[#4FD8C4]/40 transition-all cursor-pointer shadow"
            title="Configure Google Gemini API key"
          >
            <GearIcon className="size-3.5" />
            <span>{hasGeminiKey ? 'Update Gemini Key' : 'Configure Gemini Key'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustomConsole(!showCustomConsole)}
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow ${
              showCustomConsole
                ? 'border-[#4FD8C4] bg-[#4FD8C4]/15 text-[#4FD8C4]'
                : 'border-[#333A45] bg-[#191D24] text-[#E7EAEE] hover:bg-[#262B33]'
            }`}
          >
            <ChatCircleDotsIcon className="size-3.5 text-[#4FD8C4]" />
            <span>{showCustomConsole ? 'Close AI Prompt' : 'Ask Gemini AI'}</span>
          </button>

          {filteredRecs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const allCode = filteredRecs
                  .map((r) => `// ${r.title} (${r.category} - ${r.impactLevel} IMPACT)\n// Issue: ${r.issue}\n${r.codeSnippet}\n`)
                  .join('\n\n');
                navigator.clipboard.writeText(allCode);
                setCopiedIndex(-1);
                setTimeout(() => setCopiedIndex(null), 2000);
              }}
              className="inline-flex items-center gap-1.5 rounded border border-[#333A45] bg-[#191D24] px-3 py-1.5 text-xs text-[#4FD8C4] hover:bg-[#262B33] transition-all cursor-pointer shadow"
            >
              {copiedIndex === -1 ? <CheckIcon className="size-3.5 text-emerald-400" /> : <CopyIcon className="size-3.5" />}
              <span>{copiedIndex === -1 ? 'All Copied!' : 'Copy All Fixes'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadRecommendations}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded border border-[#333A45] bg-[#191D24] px-3 py-1.5 text-xs text-[#E7EAEE] hover:bg-[#262B33] transition-all cursor-pointer disabled:opacity-50"
          >
            <ArrowsClockwiseIcon className={`size-3.5 ${loading ? 'animate-spin text-[#4FD8C4]' : 'text-[#8B93A1]'}`} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Interactive Ask Gemini AI Consultation Section */}
      {showCustomConsole && (
        <div className="rounded-xl border border-[#4FD8C4]/40 bg-[#0A0C0F] p-4 space-y-3 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#4FD8C4] font-bold text-xs">
              <SparkleIcon className="size-4 animate-pulse" />
              <span>Ask Gemini AI: Real-Time SEO Consultation</span>
            </div>
            <span className="text-[10px] text-[#8B93A1] font-sans">
              Context: Audited DOM of {audit.url}
            </span>
          </div>

          {/* Quick Prompt Recommendation Chips */}
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskGemini(p)}
                disabled={customLoading}
                className="text-[10px] font-sans px-2.5 py-1 rounded-full bg-[#191D24] border border-[#262B33] hover:border-[#4FD8C4]/40 hover:text-[#4FD8C4] text-[#8B93A1] transition-colors cursor-pointer text-left disabled:opacity-50"
              >
                + {p}
              </button>
            ))}
          </div>

          {/* Prompt Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskGemini();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask Gemini any question about this webpage (e.g., 'Rewrite the hero text for higher conversion', 'Create schema for this shop')..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={customLoading}
              className="flex-1 bg-[#12151A] border border-[#333A45] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none font-sans"
            />
            <button
              type="submit"
              disabled={customLoading || !customPrompt.trim()}
              className="px-4 py-2 rounded-lg bg-[#4FD8C4]/15 border border-[#4FD8C4]/40 hover:bg-[#4FD8C4]/25 text-[#4FD8C4] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40 shrink-0"
            >
              {customLoading ? (
                <ArrowsClockwiseIcon className="size-3.5 animate-spin" />
              ) : (
                <PaperPlaneRightIcon className="size-3.5" />
              )}
              <span>{customLoading ? 'Thinking...' : 'Ask Gemini'}</span>
            </button>
          </form>

          {/* Custom Response Output */}
          {customResponse && (
            <div className="mt-3 rounded-lg border border-[#262B33] bg-[#12151A] p-3.5 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-[11px] border-b border-[#191D24] pb-2">
                <div className="flex items-center gap-1.5 text-[#4ADE80] font-bold">
                  <CheckCircleIcon className="size-3.5" />
                  <span>Gemini SEO Response ({customResponse.model || 'gemini-1.5-flash'})</span>
                </div>
                {customResponse.response && (
                  <button
                    type="button"
                    onClick={handleCopyCustomResponse}
                    className="text-[10px] text-[#4FD8C4] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {customCopied ? <CheckIcon className="size-3 text-[#4ADE80]" /> : <CopyIcon className="size-3" />}
                    <span>{customCopied ? 'Copied!' : 'Copy Answer'}</span>
                  </button>
                )}
              </div>

              {customResponse.error ? (
                <div className="text-rose-400 text-xs flex items-center gap-2">
                  <WarningCircleIcon className="size-4 shrink-0" />
                  <span>{customResponse.error}</span>
                </div>
              ) : (
                <div className="text-xs text-[#E7EAEE] font-sans whitespace-pre-wrap leading-relaxed">
                  {customResponse.response}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Controls Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-1">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[#565D68] text-[11px] mr-1">Category:</span>
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

        {/* Search Filter */}
        <div className="relative w-full md:w-64">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#565D68]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code fixes..."
            className="w-full rounded border border-[#262B33] bg-[#0A0C0F] pl-8 pr-3 py-1 text-[11px] text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center space-y-2 rounded-lg border border-[#262B33] bg-[#0A0C0F]">
          <CpuIcon className="size-6 text-[#4FD8C4] animate-spin mx-auto" />
          <p className="text-[#E7EAEE] font-semibold text-xs">Analyzing DOM audit findings with Gemini AI engine...</p>
          <p className="text-[11px] text-[#8B93A1]">Synthesizing tailored HTML meta tags, alt attributes, and JSON-LD schemas.</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
          <ShieldWarningIcon className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRecs.length === 0 && (
        <div className="p-8 text-center space-y-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] text-[#8B93A1]">
          <CheckCircleIcon className="size-6 text-[#4ADE80] mx-auto" />
          <p className="text-[#E7EAEE] font-semibold text-xs">No AI code fixes needed for this category!</p>
          <p className="text-[11px]">The audited page already adheres to standards for selected metrics.</p>
        </div>
      )}

      {/* Recommendations List */}
      {!loading && !error && filteredRecs.length > 0 && (
        <div className="space-y-4 pt-2">
          {filteredRecs.map((rec, idx) => {
            const isCopied = copiedIndex === idx;
            const viewMode = viewModeMap[idx] || 'code';
            const hasDiff = !!rec.diffSnippet;

            return (
              <div
                key={`${rec.title}-${idx}`}
                className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-4 space-y-3 hover:border-[#333A45] transition-all"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CodeIcon className="size-4 text-[#4FD8C4] shrink-0" />
                    <span className="font-bold text-[#E7EAEE] text-xs">{rec.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {rec.engineSource === 'GEMINI_AI' ? (
                      <span className="rounded bg-[#4FD8C4]/15 border border-[#4FD8C4]/30 px-2 py-0.5 text-[10px] font-bold text-[#4FD8C4] inline-flex items-center gap-1">
                        <SparkleIcon className="size-3 text-[#4FD8C4]" />
                        Gemini AI ({rec.model || 'gemini-3.1-flash'})
                      </span>
                    ) : (
                      <span className="rounded bg-[#8B93A1]/15 border border-[#8B93A1]/30 px-2 py-0.5 text-[10px] font-bold text-[#8B93A1] inline-flex items-center gap-1">
                        <CpuIcon className="size-3 text-[#8B93A1]" />
                        Heuristic
                      </span>
                    )}
                    {getPriorityBadge(rec.priority)}
                    <span className="rounded bg-[#191D24] border border-[#262B33] px-2 py-0.5 text-[10px] font-bold text-[#8B93A1]">
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

                {/* Problem Issue Description */}
                <div className="text-[#8B93A1] text-[11px] font-sans leading-relaxed flex items-start gap-1.5">
                  <strong className="text-amber-400 font-mono shrink-0">Issue: </strong>
                  <span>{rec.issue}</span>
                </div>

                {/* Target Element Selector badge if available */}
                {rec.targetElementSelector && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#565D68]">
                    <TagIcon className="size-3 text-[#4FD8C4]" />
                    <span>Target DOM Selector:</span>
                    <code className="bg-[#12151A] px-1.5 py-0.5 rounded text-[#4FD8C4] border border-[#262B33]">
                      {rec.targetElementSelector}
                    </code>
                  </div>
                )}

                {/* Code Snippet Box */}
                <div className="relative rounded-md border border-[#262B33] bg-[#12151A] p-3 overflow-x-auto group">
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#191D24] text-[10px] text-[#565D68]">
                    <div className="flex items-center gap-2">
                      <span>{viewMode === 'diff' ? 'Unified Code Diff' : 'Suggested Code Snippet'}</span>
                      {hasDiff && (
                        <button
                          type="button"
                          onClick={() => toggleViewMode(idx)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#191D24] border border-[#262B33] text-[#8B93A1] hover:text-[#4FD8C4] transition-all cursor-pointer text-[9px]"
                        >
                          <GitDiffIcon className="size-3" />
                          <span>{viewMode === 'diff' ? 'Show Snippet' : 'Show Diff'}</span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(viewMode === 'diff' && rec.diffSnippet ? rec.diffSnippet : rec.codeSnippet, idx)}
                      className="inline-flex items-center gap-1 rounded bg-[#191D24] border border-[#333A45] px-2.5 py-1 text-[11px] font-semibold text-[#4FD8C4] hover:bg-[#262B33] transition-all cursor-pointer shadow"
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
                      viewMode === 'diff' ? 'text-[#7AA2F7]' : 'text-[#4ADE80]'
                    }`}
                  >
                    {viewMode === 'diff' && rec.diffSnippet ? rec.diffSnippet : rec.codeSnippet}
                  </pre>
                </div>

                {/* Explanation & Guideline Reference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-sans bg-[#12151A]/60 p-2.5 rounded border border-[#191D24]">
                  <p className="text-[#8B93A1] leading-relaxed">
                    <strong className="text-[#4FD8C4] font-mono">Guidance: </strong> {rec.explanation}
                  </p>
                  {rec.guidelineReference && (
                    <span className="text-[10px] font-mono text-[#565D68] shrink-0 inline-flex items-center gap-1 bg-[#191D24] px-2 py-1 rounded border border-[#262B33]">
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
  );
};

