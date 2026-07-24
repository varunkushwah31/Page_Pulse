import React from 'react';
import { Activity, ShieldCheck, Zap, Server, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-600/25 ring-1 ring-white/20">
            <Activity className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white font-display">PagePulse</span>
              <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-widest px-2 py-0.5">
                v2.0 Impeccable
              </Badge>
            </div>
            <p className="text-[11px] font-medium text-slate-400">Web Performance & SEO Quality Inspector</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/80 p-1.5 rounded-xl shadow-inner">
          {[
            { id: 'audit', label: 'Single Audit', icon: Zap },
            { id: 'sitemap', label: 'Sitemap Crawler', icon: Server },
            { id: 'reports', label: 'Saved Reports', icon: ShieldCheck },
            { id: 'analytics', label: 'Platform Stats', icon: BarChart3 },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 px-3 py-1 text-xs font-semibold shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            Engine Active
          </Badge>
        </div>
      </div>
    </header>
  );
};
