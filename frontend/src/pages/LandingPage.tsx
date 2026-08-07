import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Server,
  GitBranch,
  Users,
  ArrowRight,
  Activity,
  BarChart3,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const handleAuditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (url.trim()) {
      navigate(`/audit?url=${encodeURIComponent(url.trim())}`);
    }
  };

  const handleKeyDownNavigate = (path: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <div className="space-y-8 font-mono text-xs text-[#E7EAEE]">
      {/* Hero Terminal Prompt Banner */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-6 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3 text-[#565D68]">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#4FD8C4]" />
            <span className="font-bold text-[#E7EAEE] tracking-wider uppercase">PAGE PULSE v1.0 AUDIT ENGINE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="text-[10px] text-[#4ADE80] font-semibold">ENGINE ACTIVE</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#EEEEEE] tracking-tight">
            High-Performance Web Audit & Technical Inspection Engine
          </h1>
          <p className="text-xs text-[#8B93A1] font-sans max-w-2xl leading-relaxed">
            Inspect live target web endpoints for SEO metadata, heading distribution, text-to-HTML ratios, accessibility alt-tag coverage, and SSL certificate security in milliseconds.
          </p>
        </div>

        {/* Quick Launch Input Form */}
        <form onSubmit={handleAuditSubmit} className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#565D68] font-bold text-xs">$</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-[#262B33] bg-[#0A0C0F] py-2.5 pl-7 pr-3 font-mono text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-[#4FD8C4] bg-[#4FD8C4] px-5 py-2.5 font-mono text-xs font-bold text-[#0A0C0F] hover:bg-[#4FD8C4]/90 transition-all cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
          >
            <span>Run Full Audit</span>
            <ArrowRight className="size-3.5" />
          </button>
        </form>
      </div>

      {/* Technical Instrument Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/audit')}
          onKeyDown={(e) => handleKeyDownNavigate('/audit', e)}
          className="group rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 hover:border-[#4FD8C4]/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#4FD8C4]">
            <Zap className="size-4" />
            <span className="text-[10px] text-[#565D68]">01</span>
          </div>
          <div className="font-bold text-[#E7EAEE]">Single DOM Scraper</div>
          <p className="text-[11px] text-[#8B93A1] font-sans leading-normal">
            DOM title, description, H1 count, word count, text-to-html ratio, and alt-tag coverage.
          </p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/sitemap')}
          onKeyDown={(e) => handleKeyDownNavigate('/sitemap', e)}
          className="group rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 hover:border-[#4ADE80]/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#4ADE80]">
            <Server className="size-4" />
            <span className="text-[10px] text-[#565D68]">02</span>
          </div>
          <div className="font-bold text-[#E7EAEE]">Virtual Threads Sitemap</div>
          <p className="text-[11px] text-[#8B93A1] font-sans leading-normal">
            Concurrent domain crawling with Java Virtual Threads and aggregate score reporting.
          </p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/batch')}
          onKeyDown={(e) => handleKeyDownNavigate('/batch', e)}
          className="group rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 hover:border-[#7AA2F7]/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#7AA2F7]">
            <GitBranch className="size-4" />
            <span className="text-[10px] text-[#565D68]">03</span>
          </div>
          <div className="font-bold text-[#E7EAEE]">Parallel Batch Auditor</div>
          <p className="text-[11px] text-[#8B93A1] font-sans leading-normal">
            Multi-URL parallel scanning with expandable item cards and 1-click batch PDF export.
          </p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/compare')}
          onKeyDown={(e) => handleKeyDownNavigate('/compare', e)}
          className="group rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 hover:border-[#FBBF24]/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#FBBF24]">
            <Users className="size-4" />
            <span className="text-[10px] text-[#565D68]">04</span>
          </div>
          <div className="font-bold text-[#E7EAEE]">Competitor Matrix</div>
          <p className="text-[11px] text-[#8B93A1] font-sans leading-normal">
            Side-by-side URL A vs URL B performance benchmarking with metric winner highlights.
          </p>
        </div>
      </div>

      {/* Background Monitors & Analytics Status Bar */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px]">
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/scheduled')}
          onKeyDown={(e) => handleKeyDownNavigate('/scheduled', e)}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer"
        >
          <Clock className="size-4 text-[#4FD8C4]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">Automated Monitors</div>
            <div className="text-[#8B93A1] text-[10px]">Background polling & webhooks</div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/trend')}
          onKeyDown={(e) => handleKeyDownNavigate('/trend', e)}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer"
        >
          <BarChart3 className="size-4 text-[#7AA2F7]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">Domain Trends</div>
            <div className="text-[#8B93A1] text-[10px]">Historical trajectory analytics</div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/reports')}
          onKeyDown={(e) => handleKeyDownNavigate('/reports', e)}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer"
        >
          <FileText className="size-4 text-[#4ADE80]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">MongoDB Archive</div>
            <div className="text-[#8B93A1] text-[10px]">Cloud document persistence</div>
          </div>
        </div>
      </div>
    </div>
  );
};
