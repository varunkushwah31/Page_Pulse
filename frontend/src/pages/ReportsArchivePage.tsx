import React from 'react';
import { ReportsArchive } from '../components/ReportsArchive';
import { ShieldCheckIcon } from '@phosphor-icons/react';

export const ReportsArchivePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262B33] pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <ShieldCheckIcon className="size-4 text-[#4FD8C4]" />
          <span className="text-[#565D68]">SITELOOK</span>
          <span className="text-[#565D68]">/</span>
          <h1 className="font-bold text-[#E7EAEE]">MONGODB ATLAS ARCHIVE</h1>
          <span className="rounded bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 px-1.5 py-0.2 text-[9px] font-bold text-[#4FD8C4] uppercase">
            PERSISTED DOCS
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#565D68]">
          Permanent Cloud Report Persistence & White-Label OpenPDF Exports
        </span>
      </div>

      <ReportsArchive />
    </div>
  );
};