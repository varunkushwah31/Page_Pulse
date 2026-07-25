import React from 'react';
import { SitemapConsole } from '../components/SitemapConsole';

export const SitemapCrawlerPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono text-muted-foreground">
        XML Sitemap Virtual Threads Concurrency Inspector
      </h2>
      <SitemapConsole />
    </div>
  );
};