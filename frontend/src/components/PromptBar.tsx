import React, { useState } from 'react';

interface PromptBarProps {
  onAuditSubmit: (url: string, enableJsRendering?: boolean) => void;
  isLoading: boolean;
  initialValue?: string;
  progressPercent?: number;
  progressStepMessage?: string;
}

export const PromptBar: React.FC<PromptBarProps> = ({ 
  onAuditSubmit, 
  isLoading, 
  initialValue = '',
  progressPercent = 0,
  progressStepMessage = ''
}) => {
  const [url, setUrl] = useState(initialValue);
  const [enableJsRendering, setEnableJsRendering] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    onAuditSubmit(url.trim(), enableJsRendering);
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 transition-colors focus-within:border-[#4FD8C4] gap-2">
          <div className="flex items-center gap-1.5 pl-2 pr-1 text-[#8B93A1] select-none font-mono shrink-0">
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

          <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-[#262B33] pt-2 sm:pt-0 sm:pl-3">
            <label className="flex items-center gap-1.5 text-[11px] text-[#8B93A1] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableJsRendering}
                onChange={(e) => setEnableJsRendering(e.target.checked)}
                disabled={isLoading}
                className="rounded border-[#333A45] bg-[#191D24] text-[#4FD8C4] focus:ring-[#4FD8C4] focus:ring-offset-0 cursor-pointer"
              />
              <span className={enableJsRendering ? 'text-[#4FD8C4] font-semibold' : ''}>
                JS Render (SPA)
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-mono text-xs font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
      </form>

      {/* Live SSE Progress Bar */}
      {isLoading && (
        <div className="rounded-md border border-[#333A45] bg-[#12151A] p-2.5 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#4FD8C4] font-semibold flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-[#4FD8C4] animate-pulse"></span>
              {progressStepMessage || 'Audit Engine Executing...'}
            </span>
            <span className="text-[#E7EAEE] font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#191D24] h-1.5 rounded-full overflow-hidden border border-[#262B33]">
            <div 
              className="bg-gradient-to-r from-[#4FD8C4] to-[#60A5FA] h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, Math.min(100, progressPercent))}%` }}
            ></div>
          </div>
        </div>
      )}

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
              onAuditSubmit(sampleUrl, enableJsRendering);
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