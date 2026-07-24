import React from 'react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 font-mono text-xs text-[#F87171]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-semibold uppercase tracking-wider text-[11px]">Diagnostic Error</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[11px] underline hover:text-white transition-colors cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
      <p className="font-sans text-sm text-[#E7EAEE] leading-normal">{message}</p>
    </div>
  );
};
