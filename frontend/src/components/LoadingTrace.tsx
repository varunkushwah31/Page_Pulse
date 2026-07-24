import React from 'react';

interface LoadingTraceProps {
  targetUrl: string;
}

export const LoadingTrace: React.FC<LoadingTraceProps> = ({ targetUrl }) => {
  return (
    <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 font-mono text-xs text-[#8B93A1]">
      <div className="flex items-center gap-2">
        <span className="text-[#4FD8C4] font-semibold">GET</span>
        <span className="text-[#E7EAEE] truncate">{targetUrl}</span>
        <span className="inline-block w-2 h-4 bg-[#4FD8C4] animate-pulse"></span>
      </div>
      <p className="mt-2 text-[11px] text-[#565D68]">
        Executing socket connection handshake and DOM metric extraction...
      </p>
    </div>
  );
};
