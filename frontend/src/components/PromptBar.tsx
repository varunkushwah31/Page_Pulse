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

  const quickUrls = [
    'https://leetcode.com',
    'https://github.com',
    'https://codeforces.com',
    'https://wikipedia.org',
  ];

  return (
    <div className="space-y-2 w-full font-mono text-xs">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex items-center rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 transition-all focus-within:ring-2 focus-within:ring-[#4FD8C4] focus-within:ring-offset-2 focus-within:ring-offset-[#0A0C0F]">
          <div className="flex items-center gap-1.5 pl-2 pr-1 text-[#8B93A1] select-none font-mono">
            <span className="text-[#4FD8C4] font-bold">$</span>
            <span className="text-[#8B93A1]">audit</span>
          </div>

          <input
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-transparent px-2.5 py-2 font-mono text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-mono text-xs font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? 'Running...' : 'Run'}
          </button>
        </div>
      </form>

      {/* Quick Target URL Shortcuts */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#565D68] pl-1">
        <span>Quick Test:</span>
        {quickUrls.map((sampleUrl) => (
          <button
            key={sampleUrl}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setUrl(sampleUrl);
              onAuditSubmit(sampleUrl);
            }}
            className="rounded border border-[#262B33] bg-[#12151A] px-2 py-0.5 text-[#8B93A1] hover:text-[#4FD8C4] hover:border-[#4FD8C4]/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {sampleUrl.replace('https://', '')}
          </button>
        ))}
      </div>
    </div>
  );
};