import React from 'react';
import { BatchAuditorConsole } from '../components/BatchAuditorConsole';
import { GitBranchIcon } from '@phosphor-icons/react';

export const BatchAuditorPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262B33] pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <GitBranchIcon className="size-4 text-[#4FD8C4]" />
          <span className="text-[#565D68]">PAGE PULSE</span>
          <span className="text-[#565D68]">/</span>
          <h1 className="font-bold text-[#E7EAEE]">PARALLEL BATCH AUDITOR</h1>
          <span className="rounded bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 px-1.5 py-0.2 text-[9px] font-bold text-[#4FD8C4] uppercase">
            VIRTUAL THREADS
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#565D68]">
          Concurrent Multi-URL DOM Scraping & Analysis
        </span>
      </div>

      <BatchAuditorConsole />
    </div>
  );
};