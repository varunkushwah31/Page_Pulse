import React, { useState } from 'react';
import type { DomIssueSnippet } from '../types';
import { Code, Copy, Check, Info } from 'lucide-react';

interface DomInspectorConsoleProps {
  issues: DomIssueSnippet[];
  title?: string;
}

export const DomInspectorConsole: React.FC<DomInspectorConsoleProps> = ({ issues, title = 'Visual DOM Element Inspector' }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!issues || issues.length === 0) {
    return null;
  }

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getBadgeStyle = (issueType: string) => {
    switch (issueType) {
      case 'MISSING_ALT':
      case 'MISSING_LABEL':
        return 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/30';
      case 'BROKEN_CANONICAL':
      case 'MISSING_DESCRIPTION':
      case 'MISSING_TITLE':
        return 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30';
      default:
        return 'bg-[#7AA2F7]/10 text-[#7AA2F7] border-[#7AA2F7]/30';
    }
  };

  return (
    <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 sm:p-5 space-y-3 shadow-xl font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#262B33] pb-2 text-[#8B93A1]">
        <div className="flex items-center gap-2">
          <Code className="size-4 text-[#4FD8C4]" />
          <span className="font-bold text-[#E7EAEE]">{title}</span>
          <span className="text-[10px] bg-[#4FD8C4]/10 text-[#4FD8C4] border border-[#4FD8C4]/30 px-1.5 py-0.5 rounded font-bold">
            {issues.length} {issues.length === 1 ? 'SNIPPET' : 'SNIPPETS'}
          </span>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
        {issues.map((issue, idx) => (
          <div key={`${issue.selector}-${idx}`} className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getBadgeStyle(issue.issueType)}`}>
                  {issue.issueType}
                </span>
                <span className="text-[#8B93A1] text-[11px] truncate max-w-[250px] sm:max-w-xs">
                  {issue.selector}
                </span>
                {issue.lineHint > 0 && (
                  <span className="text-[#565D68] text-[10px]">
                    L:{issue.lineHint}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleCopy(issue.outerHtml, idx)}
                className="inline-flex items-center gap-1 text-[10px] text-[#8B93A1] hover:text-[#4FD8C4] transition-all cursor-pointer"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="size-3 text-[#4ADE80]" />
                    <span className="text-[#4ADE80]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy HTML</span>
                  </>
                )}
              </button>
            </div>

            {/* Syntax Highlighted HTML Code Frame */}
            <div className="bg-[#12151A] rounded p-2.5 border border-[#191D24] overflow-x-auto text-[11px] text-[#E7EAEE] leading-relaxed font-mono">
              <code className="whitespace-pre-wrap break-all">
                {issue.outerHtml}
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
