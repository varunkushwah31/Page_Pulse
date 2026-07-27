import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Single URL Real-Time Audit | Page Pulse',
    description: 'Perform instant DOM scraping, SEO scoring, and accessibility audits for any target web page.',
  },
  '/audit': {
    title: 'Single URL Real-Time Audit | Page Pulse',
    description: 'Perform instant DOM scraping, SEO scoring, and accessibility audits for any target web page.',
  },
  '/sitemap': {
    title: 'Sitemap XML Virtual Threads Crawler | Page Pulse',
    description: 'Audit entire domain sitemaps concurrently using Java Virtual Threads and generate score averages.',
  },
  '/batch': {
    title: 'Batch Auditing Console | Page Pulse',
    description: 'Concurrently analyze up to 50 URLs in parallel with expandable score breakdowns and PDF export.',
  },
  '/scheduled': {
    title: 'Scheduled Audits & Monitors | Page Pulse',
    description: 'Configure automated recurring background audit monitors and domain performance alerts.',
  },
  '/compare': {
    title: 'Competitor Comparison Matrix | Page Pulse',
    description: 'Compare side-by-side SEO, performance, accessibility, and content metrics between competing domains.',
  },
  '/trend': {
    title: 'Domain Audit Trends & Analytics | Page Pulse',
    description: 'Analyze historical score trajectories, performance stability, and executive metric trends for target domains.',
  },
  '/reports': {
    title: 'Saved Audit Reports & Executive PDF Export | Page Pulse',
    description: 'Browse, filter, and download executable OpenPDF audit reports saved to your MongoDB collection.',
  },
  '/telemetry': {
    title: 'Platform Telemetry & System Status | Page Pulse',
    description: 'View real-time Spring Boot, MongoDB Atlas, Redis cache, and JVM memory system metrics.',
  },
  '/auth': {
    title: 'Authentication & Database Access | Page Pulse',
    description: 'Sign in or register your account to enable permanent report persistence and automated scheduling.',
  },
};

export const SeoHead: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const seoData = ROUTE_SEO[location.pathname] || {
      title: 'Page Pulse | Enterprise Web Performance & SEO Auditing Engine',
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
