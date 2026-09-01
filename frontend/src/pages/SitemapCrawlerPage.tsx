import React from 'react';
import { SitemapConsole } from '../components/SitemapConsole';
import { HardDrivesIcon } from '@phosphor-icons/react';

export const SitemapCrawlerPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262B33] pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <HardDrivesIcon className="size-4 text-[#4ADE80]" />
          <span className="text-[#565D68]">SITELOOK</span>
          <span className="text-[#565D68]">/</span>
          <h1 className="font-bold text-[#E7EAEE]">SITEMAP XML CONCURRENT CRAWLER</h1>
          <span className="rounded bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-1.5 py-0.2 text-[9px] font-bold text-[#4ADE80] uppercase">
            VIRTUAL THREADS
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#565D68]">
          Deep XML Sitemap Parsing & Delta Snapshot Diff Analyzer
        </span>
      </div>

      <SitemapConsole />
    </div>
  );
};