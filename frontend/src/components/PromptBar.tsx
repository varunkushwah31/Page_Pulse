import React, { useState } from 'react';

interface PromptBarProps {
  onAuditSubmit: (url: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export const PromptBar: React.FC<PromptBarProps> = ({ onAuditSubmit, isLoading, initialValue = '' }) => {
  const [url, setUrl] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    onAuditSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center rounded-lg border border-input bg-card p-1.5 transition-all focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
        <div className="flex items-center gap-1.5 pl-2 pr-1 font-mono text-xs text-muted-foreground select-none">
          <span className="text-primary font-bold">$</span>
          <span className="hidden sm:inline">audit</span>
        </div>

        <input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent px-2.5 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="rounded border border-input bg-popover px-4 py-2 font-mono text-xs font-semibold text-primary hover:bg-accent active:bg-border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Running...' : 'Run'}
        </button>
      </div>
    </form>
  );
};