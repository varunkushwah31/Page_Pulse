import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LightningIcon, HardDrivesIcon, GitBranchIcon, UsersIcon, ArrowRightIcon, PulseIcon, ChartBarIcon, FileTextIcon, ClockIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { fetchPlatformStats } from '../lib/api';
import type { PlatformStatsResponse } from '../types';

const PLACEHOLDERS = ['https://github.com', 'https://wikipedia.org', 'https://stackoverflow.com'];

interface AnimatedCounterProps {
  readonly value: number;
}

function AnimatedCounter({ value }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    let animationFrameId: number;
    const duration = 1500;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * value));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value]);

  return <span>{count}</span>;
}

export const LandingPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const [stats, setStats] = useState<PlatformStatsResponse | null>(null);

  useEffect(() => {
    fetchPlatformStats().then(setStats).catch(console.error);
  }, []);

  const [placeholderText, setPlaceholderText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: number;
    const currentFullText = PLACEHOLDERS[placeholderIndex];

    if (isDeleting) {
      timer = window.setTimeout(() => {
        setPlaceholderText(currentFullText.substring(0, placeholderText.length - 1));
        if (placeholderText.length <= 1) {
          setIsDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        }
      }, 50);
    } else {
      timer = window.setTimeout(() => {
        setPlaceholderText(currentFullText.substring(0, placeholderText.length + 1));
        if (placeholderText === currentFullText) {
          timer = window.setTimeout(() => setIsDeleting(true), 1500);
        }
      }, 100);
    }
    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, placeholderIndex]);

  const handleAuditSubmit = (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (url.trim()) {
      navigate(`/audit?url=${encodeURIComponent(url.trim())}`);
    }
  };

  return (
    <div className="space-y-8 font-mono text-xs text-[#E7EAEE]">
      {/* Hero Terminal Prompt Banner */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-6 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3 text-[#565D68]">
          <div className="flex items-center gap-2">
            <PulseIcon className="size-4 text-[#4FD8C4]" />
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
              placeholder={placeholderText || ' '}
              className="w-full rounded-lg border border-[#262B33] bg-[#0A0C0F] py-2.5 pl-7 pr-3 font-mono text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-[#4FD8C4] bg-[#4FD8C4] px-5 py-2.5 font-mono text-xs font-bold text-[#0A0C0F] hover:bg-[#4FD8C4]/90 transition-all cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
          >
            <span>Run Full Audit</span>
            <ArrowRightIcon className="size-3.5" />
          </button>
        </form>
      </div>

      {/* Live Platform Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 flex flex-col items-center justify-center">
             <div className="text-2xl sm:text-3xl font-bold text-[#4FD8C4]"><AnimatedCounter value={stats.totalTransientAuditsRun} /></div>
             <div className="text-[10px] text-[#8B93A1] uppercase tracking-wider mt-1 flex items-center gap-1"><LightningIcon className="size-3" /> Total Audits Run</div>
          </div>
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 flex flex-col items-center justify-center">
             <div className="text-2xl sm:text-3xl font-bold text-[#4ADE80]"><AnimatedCounter value={Math.round(stats.averageOverallScore)} /></div>
             <div className="text-[10px] text-[#8B93A1] uppercase tracking-wider mt-1 flex items-center gap-1"><CheckCircleIcon className="size-3" /> Average Score</div>
          </div>
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 flex flex-col items-center justify-center">
             <div className="text-2xl sm:text-3xl font-bold text-[#7AA2F7]"><AnimatedCounter value={Object.keys(stats.topDomains || {}).length} /></div>
             <div className="text-[10px] text-[#8B93A1] uppercase tracking-wider mt-1 flex items-center gap-1"><HardDrivesIcon className="size-3" /> Domains Analyzed</div>
          </div>
        </div>
      )}

      {/* Technology Stack Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-1">
        {['Spring Boot 4.1', 'React 19', 'MongoDB Atlas', 'Redis', 'Java Virtual Threads', 'Playwright'].map((tech) => (
          <span key={tech} className="rounded border border-[#262B33] bg-[#12151A] px-2.5 py-1 text-[10px] text-[#8B93A1] transition-all hover:border-[#4FD8C4]/50 hover:text-[#E7EAEE]">
            {tech}
          </span>
        ))}
      </div>

      {/* Technical Instrument Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => navigate('/audit')}
          className="group rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 text-left hover:border-[#4FD8C4]/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#4FD8C4]/5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#4FD8C4]">
            <LightningIcon className="size-4" />
            <div className="flex items-center gap-2">
               <ArrowRightIcon className="size-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
               <span className="text-[10px] text-[#565D68]">01</span>
            </div>
          </div>
          <div className="font-bold text-[#E7EAEE]">Single DOM Scraper</div>
          <p className="text-[11px] text-[#8B93A1] font-sans leading-normal">
            DOM title, description, H1 count, word count, text-to-html ratio, and alt-tag coverage.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/sitemap')}
          className="group rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 text-left hover:border-[#4ADE80]/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#4FD8C4]/5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#4ADE80]">
            <HardDrivesIcon className="size-4" />
            <div className="flex items-center gap-2">
               <ArrowRightIcon className="size-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
               <span className="text-[10px] text-[#565D68]">02</span>
            </div>
          </div>
          <div className="font-bold text-[#E7EAEE]">Virtual Threads Sitemap</div>
          <p className="text-[11px] text-[#8B93A1] font-sans leading-normal">
            Concurrent domain crawling with Java Virtual Threads and aggregate score reporting.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/batch')}
          className="group rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 text-left hover:border-[#7AA2F7]/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#4FD8C4]/5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#7AA2F7]">
            <GitBranchIcon className="size-4" />
            <div className="flex items-center gap-2">
               <ArrowRightIcon className="size-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
               <span className="text-[10px] text-[#565D68]">03</span>
            </div>
          </div>
          <div className="font-bold text-[#E7EAEE]">Parallel Batch Auditor</div>
          <p className="text-[11px] text-[#8B93A1] font-sans leading-normal">
            Multi-URL parallel scanning with expandable item cards and 1-click batch PDF export.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/compare')}
          className="group rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-2 text-left hover:border-[#FBBF24]/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#4FD8C4]/5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#FBBF24]">
            <UsersIcon className="size-4" />
            <div className="flex items-center gap-2">
               <ArrowRightIcon className="size-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
               <span className="text-[10px] text-[#565D68]">04</span>
            </div>
          </div>
          <div className="font-bold text-[#E7EAEE]">Competitor Matrix</div>
          <p className="text-[11px] text-[#8B93A1] font-sans leading-normal">
            Side-by-side URL A vs URL B performance benchmarking with metric winner highlights.
          </p>
        </button>
      </div>

      {/* Background Monitors & Analytics Status Bar */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px]">
        <button
          type="button"
          onClick={() => navigate('/scheduled')}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer text-left"
        >
          <ClockIcon className="size-4 text-[#4FD8C4]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">Automated Monitors</div>
            <div className="text-[#8B93A1] text-[10px]">Background polling & webhooks</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/trend')}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer text-left"
        >
          <ChartBarIcon className="size-4 text-[#7AA2F7]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">Domain Trends</div>
            <div className="text-[#8B93A1] text-[10px]">Historical trajectory analytics</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2.5 p-2 rounded hover:bg-[#191D24] transition-all cursor-pointer text-left"
        >
          <FileTextIcon className="size-4 text-[#4ADE80]" />
          <div>
            <div className="font-bold text-[#E7EAEE]">MongoDB Archive</div>
            <div className="text-[#8B93A1] text-[10px]">Cloud document persistence</div>
          </div>
        </button>
      </div>
    </div>
  );
};
