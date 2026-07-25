import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Zap, Server, ShieldCheck, BarChart3, GitBranch, Clock, Users, Settings } from 'lucide-react';

export const PageHeaderNav: React.FC = () => {
  const navItems = [
    { path: '/', command: 'audit', icon: Zap, label: 'Single Audit' },
    { path: '/sitemap', command: 'sitemap', icon: Server, label: 'Sitemap Crawler' },
    { path: '/batch', command: 'batch', icon: GitBranch, label: 'Batch Auditor' },
    { path: '/scheduled', command: 'schedule', icon: Clock, label: 'Scheduled Audits' },
    { path: '/compare', command: 'compare', icon: Users, label: 'Competitor Compare' },
    { path: '/trend', command: 'trend', icon: BarChart3, label: 'Domain Trends' },
    { path: '/reports', command: 'reports', icon: ShieldCheck, label: 'Saved Reports' },
    { path: '/telemetry', command: 'stats', icon: Settings, label: 'Platform Stats' },
    { path: '/auth', command: 'auth', icon: Activity, label: 'Auth Console' },
  ];

  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3 mb-6">
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--popover)] text-[var(--primary)] border border-[var(--border)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`
              }
            >
              <Icon className="size-4" />
              <span className="text-[var(--text-faint)] mr-1">$</span>
              {item.command}
            </NavLink>
          );
        })}
      </div>

      <span className="font-mono text-[11px] text-[var(--text-faint)]">
        ROUTE: <strong className="text-[var(--primary)] uppercase">Multi-Page Navigation</strong>
      </span>
    </nav>
  );
};