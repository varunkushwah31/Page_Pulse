import React, { useState } from 'react';

interface PromptBarProps {
  onAuditSubmit: (url: string) => void;
  isLoading: boolean;
}

export const PromptBar: React.FC<PromptBarProps> = ({ onAuditSubmit, isLoading }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    onAuditSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center rounded-lg border border-[#333A45] bg-[#12151A] p-1.5 transition-all focus-within:ring-2 focus-within:ring-[#4FD8C4] focus-within:ring-offset-2 focus-within:ring-offset-[#0A0C0F]">
        <div className="flex items-center gap-1.5 pl-2 pr-1 font-mono text-xs text-[#565D68] select-none">
          <span className="text-[#4FD8C4] font-bold">$</span>
          <span className="hidden sm:inline text-[#8B93A1]">audit</span>
        </div>

        <input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent px-2.5 py-2 font-mono text-sm text-[#E7EAEE] placeholder-[#565D68] focus:outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-mono text-xs font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isLoading ? 'Running...' : 'Run'}
        </button>
      </div>
    </form>
  );
};
