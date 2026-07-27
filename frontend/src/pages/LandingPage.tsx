import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Server,
  GitBranch,
  Users,
  Shield,
  ArrowRight,
  Activity,
  BarChart3,
  FileText,
  Clock,
  Terminal,
  CheckCircle2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      navigate(`/audit?url=${encodeURIComponent(url.trim())}`);
    }
  };

  return (
    <div className="space-y-8 font-mono text-xs text-[#E7EAEE]">
      {/* Instrument Overview Header Strip */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3 text-[#565D68]">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#4FD8C4]" />
            <span className="text-[#E7EAEE] font-bold">Page Pulse Diagnostic Engine</span>
            <span className="text-[10px] text-[#4FD8C4] bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 px-1.5 py-0.5 rounded">
              v2.0 ACTIVE
            </span>
          </div>
          <span className="text-[11px] text-[#8B93A1]">Jsoup Scraper + Virtual Threads</span>
        </div>

        <p className="text-xs text-[#8B93A1] font-sans leading-relaxed">
          Real-time technical DOM metric parser, sitemap XML virtual thread crawler, multi-URL batch auditor, and OpenPDF report generator.
        </p>

        {/* Command Line Audit Entry Terminal (§8 DESIGN.md) */}
        <form onSubmit={handleAuditSubmit} className="space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-[#333A45] bg-[#0A0C0F] p-1.5 focus-within:ring-2 focus-within:ring-[#4FD8C4]">
            <div className="flex items-center gap-1.5 pl-2 text-[#565D68] select-none shrink-0 font-mono">
              <span className="text-[#4FD8C4] font-bold">$</span>
              <span className="text-[#8B93A1]">audit --url</span>
            </div>

            <input
              type="url"
              required
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none font-mono"
            />

            <button
              type="submit"
              className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-mono text-xs font-semibold text-[#4FD8C4] hover:bg-[#262B33] active:bg-[#333A45] transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Run Audit</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#565D68] pt-1">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-[#4ADE80]" />
            <span>Strict 5000ms HTTP Timeout</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-[#4ADE80]" />
            <span>WAF Chrome 126 Headers</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-[#4ADE80]" />
            <span>OpenPDF Executive Exports</span>
          </div>
        </div>
      </div>

      {/* Technical Instrument Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/audit')}
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
          onClick={() => navigate('/sitemap')}
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
          onClick={() => navigate('/batch')}
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
          onClick={() => navigate('/compare')}
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
          onClick={() => navigate('/scheduled')}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer"
        >
          <Clock className="size-4 text-[#4FD8C4]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">Automated Monitors</div>
            <div className="text-[#8B93A1] text-[10px]">Background polling & webhooks</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/trend')}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer"
        >
          <BarChart3 className="size-4 text-[#7AA2F7]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">Domain Trends</div>
            <div className="text-[#8B93A1] text-[10px]">Historical trajectory analytics</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer"
        >
          <FileText className="size-4 text-[#4ADE80]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">MongoDB Archive</div>
            <div className="text-[#8B93A1] text-[10px]">Saved documents & PDF export</div>
          </div>
        </div>
      </div>
    </div>
  );
};
