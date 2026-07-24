import React from 'react';

interface ErrorBannerProps {
  message: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message }) => {
  return (
    <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 font-mono text-xs text-[#F87171]">
      <div className="flex items-center gap-2 mb-1 font-semibold uppercase tracking-wider text-[11px]">
        <span>Diagnostic Failure</span>
      </div>
      <p className="text-sm font-sans text-[#E7EAEE] leading-normal">{message}</p>
    </div>
  );
};
