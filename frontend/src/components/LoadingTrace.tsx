import React from 'react';

interface LoadingTraceProps {
  targetUrl: string;
}

export const LoadingTrace: React.FC<LoadingTraceProps> = ({ targetUrl }) => {
  return (
    <div className="rounded-lg border border-border bg-card p-4 font-mono text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="text-primary font-semibold">GET</span>
        <span className="text-foreground truncate">{targetUrl}</span>
        <span className="inline-block w-2 h-4 bg-primary animate-pulse cursor-blink"></span>
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-faint)]">
        Executing socket connection handshake and DOM metric extraction...
      </p>
    </div>
  );
};