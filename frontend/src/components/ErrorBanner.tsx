import React from 'react';
import { CircleX, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 font-mono text-xs text-destructive">
      <div className="flex items-center gap-2 mb-1 font-semibold uppercase tracking-wider text-[11px]">
        <CircleX className="size-3" />
        <span>Diagnostic Failure</span>
      </div>
      <p className="text-sm font-sans text-foreground leading-normal mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded border border-input bg-popover px-3 py-1.5 font-mono text-xs font-semibold text-primary hover:bg-accent transition-all cursor-pointer"
        >
          <RefreshCw className="size-3" />
          New Audit
        </button>
      )}
    </div>
  );
};