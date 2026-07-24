import React, { useState } from 'react';
import { Search, Loader2, ArrowRight, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { AuditResponse, AuditProgress } from '../types';
import { runFullAudit } from '../lib/api';

interface AuditLauncherProps {
  onAuditComplete: (audit: AuditResponse) => void;
}

export const AuditLauncher: React.FC<AuditLauncherProps> = ({ onAuditComplete }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [useSse, setUseSse] = useState(false);
  const [progress, setProgress] = useState<AuditProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);

    if (useSse) {
      const sseUrl = `/api/audit/stream?url=${encodeURIComponent(url)}`;
      const eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('progress', (ev: MessageEvent) => {
        try {
          const data: AuditProgress = JSON.parse(ev.data);
          setProgress(data);
        } catch (_) {}
      });

      eventSource.addEventListener('result', (ev: MessageEvent) => {
        try {
          const res: AuditResponse = JSON.parse(ev.data);
          onAuditComplete(res);
          eventSource.close();
          setLoading(false);
          setProgress(null);
        } catch (_) {}
      });

      eventSource.addEventListener('error', () => {
        setError('Real-time audit streaming encountered an error.');
        eventSource.close();
        setLoading(false);
        setProgress(null);
      });
    } else {
      try {
        const auditResult = await runFullAudit(url);
        onAuditComplete(auditResult);
      } catch (err: any) {
        setError(err.message || 'Audit request failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const setPresetUrl = (preset: string) => {
    setUrl(preset);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400">
          <ZapIcon className="size-3.5" /> Fast Automated DOM & Quality Inspector
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Audit Any Website URL in Seconds
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Delivers instantaneous Performance, SEO, Accessibility, and Content metrics with weighted scoring breakdown.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
            <Input
              type="text"
              placeholder="Enter target URL (e.g. https://example.com)..."
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
              className="h-12 border-slate-800 bg-slate-950 pl-11 text-white placeholder:text-slate-600 focus-visible:ring-blue-600 text-sm sm:text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !url.trim()}
            className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                Run Audit
                <ArrowRight className="ml-2 size-5" />
              </>
            )}
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Presets:</span>
            {['https://example.com', 'https://wikipedia.org'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPresetUrl(preset)}
                className="rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-slate-400 hover:border-slate-700 hover:text-white transition-all cursor-pointer"
              >
                {preset.replace('https://', '')}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white transition-all">
            <input
              type="checkbox"
              checked={useSse}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseSse(e.target.checked)}
              className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-600"
            />
            <Radio className="size-3.5 text-blue-400" />
            Enable Real-time SSE Streaming
          </label>
        </div>

        {loading && progress && (
          <div className="mt-6 space-y-2 text-left rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="font-semibold text-blue-400">{progress.step}: {progress.message}</span>
              <span>{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2 bg-slate-800" />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400 text-left">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
};

function ZapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
