import React from 'react';

export const ScanRail: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] bg-[#12151A] z-50 overflow-hidden">
      <div className="absolute top-0 bottom-0 bg-[#4FD8C4] shadow-[0_0_8px_#4FD8C4] animate-scan-rail"></div>
    </div>
  );
};
