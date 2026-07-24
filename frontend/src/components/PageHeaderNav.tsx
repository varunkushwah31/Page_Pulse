import React from 'react';
import { NavLink } from 'react-router-dom';

export const PageHeaderNav: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Audit', command: 'audit' },
    { path: '/sitemap', label: 'Sitemap', command: 'sitemap' },
    { path: '/compare', label: 'Compare', command: 'compare' },
    { path: '/trend', label: 'Trend', command: 'trend' },
    { path: '/reports', label: 'Archive', command: 'reports' },
    { path: '/telemetry', label: 'Telemetry', command: 'stats' },
  ];

  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262B33] pb-3">
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `rounded px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#191D24] text-[#4FD8C4] border border-[#333A45] shadow-sm'
                  : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#12151A]'
              }`
            }
          >
            <span className="text-[#565D68] mr-1">$</span>
            {item.command}
          </NavLink>
        ))}
      </div>

      <span className="font-mono text-[11px] text-[#565D68]">
        ROUTE: <strong className="text-[#4FD8C4] uppercase">Multi-Page Navigation</strong>
      </span>
    </nav>
  );
};
