import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="pt-8 border-t border-[#262B33] text-center font-mono text-xs text-[#8B93A1]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#E7EAEE]">Page Pulse</span>
          <span className="text-[#565D68]">•</span>
          <span>Enterprise Site Audit & Core Intelligence Platform</span>
        </div>
        <div className="text-[11px] text-[#565D68]">
          &copy; {new Date().getFullYear()} Page Pulse. All rights reserved.
        </div>
      </div>
    </footer>
  );
};