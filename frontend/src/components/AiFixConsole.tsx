import React, { useState, useEffect } from 'react';
import type { AuditResponse, AiRecommendation } from '../types';
import { fetchAiRecommendations } from '../lib/api';
import { Sparkles, Copy, Check, Code, ShieldAlert, Cpu, CheckCircle2, RefreshCw } from 'lucide-react';

interface AiFixConsoleProps {
  audit: AuditResponse;
}

export const AiFixConsole: React.FC<AiFixConsoleProps> = ({ audit }) => {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAiRecommendations(audit);
      setRecommendations(data);
    } catch (err: any) {
      console.error('Failed to load AI recommendations:', err);
      setError('Could not generate AI code fixes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [audit.id, audit.url]);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredRecs = selectedCategory === 'ALL'
    ? recommendations
    : recommendations.filter((r) => r.category === selectedCategory);

  const categories = ['ALL', 'SEO', 'ACCESSIBILITY', 'CONTENT', 'PERFORMANCE'];

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return <span className="rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">HIGH IMPACT</span>;
      case 'MEDIUM':
        return <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">MEDIUM IMPACT</span>;
      default:
        return <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">LOW IMPACT</span>;
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#262B33] bg-[#12151A] p-5 shadow-2xl font-mono text-xs">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#262B33] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#4FD8C4] animate-pulse" />
            <h3 className="font-bold text-[#E7EAEE] text-sm">AI Actionable Fix Suggestions</h3>
            <span className="rounded bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 px-2 py-0.5 text-[10px] text-[#4FD8C4] font-semibold">
              Gemini Engine Enabled
            </span>
          </div>
          <p className="text-[11px] text-[#8B93A1] font-sans">
            Ready-to-copy code fixes and DOM markup optimizations tailored for {audit.domain || audit.url}.
          </p>
        </div>

        <button
          onClick={loadRecommendations}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded border border-[#333A45] bg-[#191D24] px-3 py-1.5 text-xs text-[#E7EAEE] hover:bg-[#262B33] transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-[#4FD8C4]' : 'text-[#8B93A1]'}`} />
          <span>Regenerate Fixes</span>
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[#565D68] text-[11px] mr-1">Category:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#191D24] text-[#4FD8C4] border border-[#4FD8C4]/40'
                : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#191D24]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center space-y-2 rounded-lg border border-[#262B33] bg-[#0A0C0F]">
          <Cpu className="size-6 text-[#4FD8C4] animate-spin mx-auto" />
          <p className="text-[#E7EAEE] font-semibold text-xs">Analyzing DOM audit findings with AI engine...</p>
          <p className="text-[11px] text-[#8B93A1]">Building tailored HTML meta tags, alt attributes, and JSON-LD schemas.</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRecs.length === 0 && (
        <div className="p-8 text-center space-y-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] text-[#8B93A1]">
          <CheckCircle2 className="size-6 text-[#4ADE80] mx-auto" />
          <p className="text-[#E7EAEE] font-semibold text-xs">No AI code fixes needed for this category!</p>
          <p className="text-[11px]">The audited page already adheres to standards for selected metrics.</p>
        </div>
      )}

      {/* Recommendations List */}
      {!loading && !error && filteredRecs.length > 0 && (
        <div className="space-y-4 pt-2">
          {filteredRecs.map((rec, idx) => {
            const isCopied = copiedIndex === idx;
            return (
              <div
                key={`${rec.title}-${idx}`}
                className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-4 space-y-3 hover:border-[#333A45] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code className="size-4 text-[#4FD8C4] shrink-0" />
                    <span className="font-bold text-[#E7EAEE] text-xs">{rec.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded bg-[#191D24] border border-[#262B33] px-2 py-0.5 text-[10px] font-bold text-[#8B93A1]">
                      {rec.category}
                    </span>
                    {getImpactBadge(rec.impactLevel)}
                  </div>
                </div>

                <p className="text-[#8B93A1] text-[11px] font-sans leading-relaxed">
                  <strong className="text-amber-400 font-mono">Issue: </strong> {rec.issue}
                </p>

                {/* Code Snippet Box */}
                <div className="relative rounded-md border border-[#262B33] bg-[#12151A] p-3 overflow-x-auto group">
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#191D24] text-[10px] text-[#565D68]">
                    <span>Suggested Code Snippet</span>
                    <button
                      onClick={() => handleCopy(rec.codeSnippet, idx)}
                      className="inline-flex items-center gap-1 rounded bg-[#191D24] border border-[#333A45] px-2.5 py-1 text-[11px] font-semibold text-[#4FD8C4] hover:bg-[#262B33] transition-all cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-[#4ADE80] whitespace-pre-wrap break-all leading-relaxed">
                    {rec.codeSnippet}
                  </pre>
                </div>

                {/* Explanation */}
                <p className="text-[#8B93A1] text-[11px] font-sans leading-relaxed bg-[#12151A]/60 p-2.5 rounded border border-[#191D24]">
                  <strong className="text-[#4FD8C4] font-mono">Guidance: </strong> {rec.explanation}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
