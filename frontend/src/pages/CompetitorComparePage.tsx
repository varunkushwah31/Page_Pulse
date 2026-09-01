import React from 'react';
import { CompetitorConsole } from '../components/CompetitorConsole';
import { UsersIcon } from '@phosphor-icons/react';

export const CompetitorComparePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262B33] pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <UsersIcon className="size-4 text-[#7AA2F7]" />
          <span className="text-[#565D68]">SITELOOK</span>
          <span className="text-[#565D68]">/</span>
          <h1 className="font-bold text-[#E7EAEE]">COMPETITOR BENCHMARK MATRIX</h1>
          <span className="rounded bg-[#7AA2F7]/10 border border-[#7AA2F7]/30 px-1.5 py-0.2 text-[9px] font-bold text-[#7AA2F7] uppercase">
            SIDE-BY-SIDE
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#565D68]">
          Comparative SEO, Performance & Content Gap Intelligence
        </span>
      </div>

      <CompetitorConsole />
    </div>
  );
};