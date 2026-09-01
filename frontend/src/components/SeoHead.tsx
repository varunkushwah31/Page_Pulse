import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'SiteLook | Enterprise Web Performance, SEO & Accessibility Auditing Engine',
    description: 'Perform instant DOM scraping, SEO scoring, accessibility audits, sitemap crawling, and executable OpenPDF exports.',
  },
  '/landing': {
    title: 'SiteLook | Enterprise Web Performance, SEO & Accessibility Auditing Engine',
    description: 'Perform instant DOM scraping, SEO scoring, accessibility audits, sitemap crawling, and executable OpenPDF exports.',
  },
  '/audit': {
    title: 'Single URL Real-Time Audit | SiteLook',
    description: 'Perform instant DOM scraping, SEO scoring, and accessibility audits for any target web page.',
  },
  '/sitemap': {
    title: 'Sitemap XML Virtual Threads Crawler | SiteLook',
    description: 'Audit entire domain sitemaps concurrently using Java Virtual Threads and generate score averages.',
  },
  '/batch': {
    title: 'Batch Auditing Console | SiteLook',
    description: 'Concurrently analyze up to 50 URLs in parallel with expandable score breakdowns and PDF export.',
  },
  '/scheduled': {
    title: 'Scheduled Audits & Monitors | SiteLook',
    description: 'Configure automated recurring background audit monitors and domain performance alerts.',
  },
  '/compare': {
    title: 'Competitor Comparison Matrix | SiteLook',
    description: 'Compare side-by-side SEO, performance, accessibility, and content metrics between competing domains.',
  },
  '/trend': {
    title: 'Domain Audit Trends & Analytics | SiteLook',
    description: 'Analyze historical score trajectories, performance stability, and executive metric trends for target domains.',
  },
  '/reports': {
    title: 'Saved Audit Reports & Executive PDF Export | SiteLook',
    description: 'Browse, filter, and download executable OpenPDF audit reports saved to your MongoDB collection.',
  },
  '/telemetry': {
    title: 'Platform Telemetry & System Status | SiteLook',
    description: 'View real-time Spring Boot, MongoDB Atlas, Redis cache, and JVM memory system metrics.',
  },
  '/profile': {
    title: 'User Account & API Key Settings | SiteLook',
    description: 'Manage your user profile, REST API access keys, saved MongoDB reports, and active background monitors.',
  },
  '/auth': {
    title: 'Authentication & Database Access | SiteLook',
    description: 'Sign in or register your account to enable permanent report persistence and automated scheduling.',
  },
};

export const SeoHead: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const seoData = ROUTE_SEO[location.pathname] || {
      title: 'SiteLook | Enterprise Web Performance & SEO Auditing Engine',
      description: 'Enterprise web performance, SEO compliance, DOM metric extraction, and accessibility auditing engine.',
    };

    document.title = seoData.title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', seoData.description);
  }, [location.pathname]);

  return null;
};
