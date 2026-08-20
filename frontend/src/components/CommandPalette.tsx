import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  LightningIcon,
  HardDrivesIcon,
  GitBranchIcon,
  UsersIcon,
  ClockIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  PulseIcon,
  UserIcon,
  ShieldIcon,
  ArrowRightIcon,
  SparkleIcon,
  XIcon
} from '@phosphor-icons/react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  command: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: 'audit',
    command: 'audit',
    title: 'Single URL Scraper',
    description: 'Inspect live endpoint for SEO, accessibility, Core Web Vitals, & security',
    icon: LightningIcon,
    path: '/audit',
    badge: 'CORE',
  },
  {
    id: 'sitemap',
    command: 'sitemap',
    title: 'Virtual Threads Sitemap',
    description: 'Concurrent XML domain crawling with Java Virtual Threads',
    icon: HardDrivesIcon,
    path: '/sitemap',
    badge: 'PARALLEL',
  },
  {
    id: 'batch',
    command: 'batch',
    title: 'Parallel Batch Auditor',
    description: 'Bulk multi-URL concurrent inspection with item cards & exports',
    icon: GitBranchIcon,
    path: '/batch',
    badge: 'BATCH',
  },
  {
    id: 'compare',
    command: 'compare',
    title: 'Competitor Matrix Benchmarking',
    description: 'Side-by-side URL A vs URL B performance, SEO, & content gap matrix',
    icon: UsersIcon,
    path: '/compare',
    badge: 'MATRIX',
  },
  {
    id: 'scheduled',
    command: 'scheduled',
    title: 'Automated Background Monitors',
    description: 'Cron scheduler, periodic URL polling, & Discord/Slack webhooks',
    icon: ClockIcon,
    path: '/scheduled',
    badge: 'CRON',
  },
  {
    id: 'trend',
    command: 'trend',
    title: 'Historical Domain Trajectory',
    description: 'Longitudinal score, latency, and content trend charts & regressions',
    icon: ChartBarIcon,
    path: '/trend',
    badge: 'ANALYTICS',
  },
  {
    id: 'reports',
    command: 'reports',
    title: 'MongoDB Atlas Archive',
    description: 'View permanently persisted audit records and JSON-LD snapshots',
    icon: ShieldCheckIcon,
    path: '/reports',
    badge: 'DB',
  },
  {
    id: 'stats',
    command: 'stats',
    title: 'System Telemetry & Stats',
    description: 'Live JVM Virtual Threads memory, transient counts, & domain metrics',
    icon: PulseIcon,
    path: '/stats',
    badge: 'TELEMETRY',
  },
  {
    id: 'profile',
    command: 'profile',
    title: 'User Profile & API Keys',
    description: 'Manage JWT authentication credentials, session, & developer API keys',
    icon: UserIcon,
    path: '/profile',
  },
  {
    id: 'auth',
    command: 'auth',
    title: 'Authentication & Sign In',
    description: 'Sign into your Page Pulse account or register a new identity',
    icon: ShieldIcon,
    path: '/auth',
  },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = COMMAND_ITEMS.filter(
    (item) =>
      item.command.toLowerCase().includes(query.toLowerCase()) ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  const isUrl = (text: string) => {
    try {
      const parsed = new URL(text.startsWith('http') ? text : `https://${text}`);
      return parsed.hostname.includes('.');
    } catch {
      return false;
    }
  };

  const looksLikeUrl = query.trim().length > 3 && (query.includes('.') || query.startsWith('http://') || query.startsWith('https://')) && isUrl(query.trim());

  const handleSelectPath = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleExecuteDirectAudit = (targetUrl: string) => {
    const formattedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
      ? targetUrl
      : `https://${targetUrl}`;
    navigate(`/audit?url=${encodeURIComponent(formattedUrl)}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalCount = filteredItems.length + (looksLikeUrl ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalCount) % Math.max(1, totalCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (looksLikeUrl && selectedIndex === 0) {
        handleExecuteDirectAudit(query);
      } else {
        const itemIndex = looksLikeUrl ? selectedIndex - 1 : selectedIndex;
        if (filteredItems[itemIndex]) {
          handleSelectPath(filteredItems[itemIndex].path);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in-up">
      <button
        type="button"
        className="fixed inset-0 w-full h-full bg-transparent border-0 cursor-default"
        onClick={onClose}
        aria-label="Close command palette"
        tabIndex={-1}
      />
      <dialog
        open
        aria-label="Command Palette"
        className="relative z-10 w-full max-w-xl rounded-xl border border-[#262B33] bg-[#12151A] shadow-2xl overflow-hidden font-mono text-xs text-[#E7EAEE] p-0 m-0 block"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#262B33] bg-[#191D24]">
          <div className="flex items-center gap-1.5 text-[#4FD8C4] shrink-0">
            <span className="font-bold text-sm">$</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or paste a URL (e.g. audit, https://example.com)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none font-mono"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#565D68] hover:text-[#E7EAEE] cursor-pointer p-1 shrink-0"
              aria-label="Clear query"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
          <div className="flex items-center text-[10px] text-[#565D68] bg-[#0A0C0F] border border-[#262B33] px-2 py-0.5 rounded shrink-0">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {looksLikeUrl && (
            <button
              type="button"
              onClick={() => handleExecuteDirectAudit(query)}
              className={`w-full text-left flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                selectedIndex === 0
                  ? 'bg-[#191D24] border border-[#4FD8C4]/50 text-[#E7EAEE]'
                  : 'hover:bg-[#191D24] border border-transparent text-[#8B93A1]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded bg-[#4FD8C4]/15 text-[#4FD8C4] shrink-0 border border-[#4FD8C4]/30">
                  <SparkleIcon className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-[#4FD8C4] flex items-center gap-1.5">
                    <span>Run Instant Audit</span>
                    <span className="text-[#8B93A1] font-mono text-[11px] truncate max-w-xs">
                      {query.trim()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#565D68] font-sans">
                    Execute real-time SEO & performance scan
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#4FD8C4] font-bold shrink-0">
                <span>ENTER</span>
                <ArrowRightIcon className="size-3" />
              </div>
            </button>
          )}

          {filteredItems.map((item, idx) => {
            const isSelected = looksLikeUrl ? selectedIndex === idx + 1 : selectedIndex === idx;
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleSelectPath(item.path)}
                className={`w-full text-left flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#191D24] border border-[#4FD8C4]/40 text-[#E7EAEE]'
                    : 'hover:bg-[#191D24] border border-transparent text-[#8B93A1]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex size-8 items-center justify-center rounded border transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-[#4FD8C4]/15 border-[#4FD8C4]/40 text-[#4FD8C4]'
                        : 'bg-[#0A0C0F] border-[#262B33] text-[#8B93A1]'
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#4FD8C4] text-xs font-mono">
                        ${' '}{item.command}
                      </span>
                      <span className="text-xs text-[#E7EAEE] font-semibold truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#0A0C0F] border border-[#262B33] text-[#565D68]">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8B93A1] font-sans truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <ArrowRightIcon className="size-3.5 text-[#4FD8C4] shrink-0 ml-2" />
                )}
              </button>
            );
          })}

          {filteredItems.length === 0 && !looksLikeUrl && (
            <div className="py-8 text-center text-[#565D68] space-y-1">
              <MagnifyingGlassIcon className="size-5 mx-auto text-[#565D68]" />
              <p className="text-xs">No commands found for "{query}"</p>
              <p className="text-[11px] text-[#565D68]">Tip: Paste any URL to launch an immediate audit</p>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#262B33] bg-[#0A0C0F] text-[10px] text-[#565D68]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-[#12151A] border border-[#262B33] px-1 py-0.2 rounded text-[#8B93A1]">↑</kbd>
              <kbd className="bg-[#12151A] border border-[#262B33] px-1 py-0.2 rounded text-[#8B93A1]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#12151A] border border-[#262B33] px-1.5 py-0.2 rounded text-[#8B93A1]">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <span className="text-[#4FD8C4] font-semibold">PAGE PULSE</span>
        </div>
      </dialog>
    </div>
  );
};
