import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  Server,
  ShieldCheck,
  BarChart3,
  GitBranch,
  Clock,
  Users,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Activity,
} from 'lucide-react';

export const PageHeaderNav: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or route change
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  const primaryNav = [
    { path: '/audit', command: 'audit', icon: Zap, label: 'Audit' },
    { path: '/sitemap', command: 'sitemap', icon: Server, label: 'Sitemap' },
    { path: '/batch', command: 'batch', icon: GitBranch, label: 'Batch' },
    { path: '/scheduled', command: 'schedule', icon: Clock, label: 'Monitors' },
  ];

  const auxNav = [
    { path: '/compare', command: 'compare', icon: Users, label: 'Competitor Compare' },
    { path: '/trend', command: 'trend', icon: BarChart3, label: 'Domain Trends' },
    { path: '/reports', command: 'reports', icon: ShieldCheck, label: 'Saved Reports' },
    { path: '/telemetry', command: 'stats', icon: Settings, label: 'Platform Stats' },
  ];

  const isAuxActive = auxNav.some((item) => location.pathname === item.path);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262B33] bg-[#0A0C0F]/90 backdrop-blur-xl mb-6 font-mono text-xs">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* TOP LEFT: Prominent User Profile Section & Brand (§ DESIGN.md) */}
        <div className="flex items-center gap-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `group flex items-center gap-2 rounded-lg border px-2.5 py-1 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#4FD8C4]/60 bg-[#4FD8C4]/10 text-[#E7EAEE]'
                  : 'border-[#262B33] bg-[#12151A] text-[#8B93A1] hover:border-[#333A45] hover:text-[#E7EAEE]'
              }`
            }
          >
            <div className="flex size-6 items-center justify-center rounded bg-[#191D24] border border-[#333A45] text-[#4FD8C4] font-mono font-bold text-xs">
              {user ? user.username.charAt(0).toUpperCase() : <UserIcon className="size-3.5" />}
            </div>
            <div className="flex items-center gap-1.5 font-bold text-[#E7EAEE] text-xs">
              <span>{user ? user.username : 'Guest User'}</span>
              <span className="rounded bg-[#4FD8C4]/15 px-1 py-0.2 text-[9px] uppercase font-semibold text-[#4FD8C4] border border-[#4FD8C4]/30">
                {user ? user.role?.replace('ROLE_', '') || 'PRO' : 'GUEST'}
              </span>
            </div>
          </NavLink>

          {/* Page Pulse Branding */}
          <NavLink to="/" className="flex items-center gap-2 pl-3 border-l border-[#262B33]">
            <Activity className="size-4 text-[#4FD8C4]" />
            <span className="font-bold text-[#E7EAEE] tracking-tight hidden sm:inline">
              Page Pulse
            </span>
          </NavLink>
        </div>

        {/* TOP CENTER: Streamlined Primary Navigation Bar */}
        <nav className="hidden md:flex items-center gap-1.5">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#191D24] text-[#4FD8C4] border border-[#262B33]'
                      : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#12151A]'
                  }`
                }
              >
                <Icon className="size-3.5 text-[#565D68]" />
                <span className="text-[#565D68]">$</span>
                <span>{item.command}</span>
              </NavLink>
            );
          })}

          {/* Auxiliary Tools Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1 rounded-md px-3 py-1 font-semibold transition-all cursor-pointer border ${
                isAuxActive || dropdownOpen
                  ? 'bg-[#191D24] text-[#4FD8C4] border-[#262B33]'
                  : 'border-transparent text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#12151A]'
              }`}
            >
              <span>tools</span>
              <ChevronDown className={`size-3.5 transition-transform ${dropdownOpen ? 'rotate-180 text-[#4FD8C4]' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[#262B33] bg-[#12151A] p-1.5 shadow-2xl z-50 divide-y divide-[#262B33]/50">
                <div className="space-y-0.5 pb-1">
                  {auxNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#191D24] text-[#4FD8C4] font-semibold'
                              : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#191D24]'
                          }`
                        }
                      >
                        <Icon className="size-3.5 text-[#565D68]" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* TOP RIGHT: Sign In / Logout Button */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              title="Sign Out"
              className="flex items-center gap-1.5 rounded-md border border-[#262B33] bg-[#12151A] px-2.5 py-1 text-[#8B93A1] hover:text-[#F87171] hover:border-[#F87171]/40 transition-all cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          ) : (
            <NavLink
              to="/auth"
              className="flex items-center gap-1.5 rounded-md border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-3 py-1 font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer"
            >
              <UserIcon className="size-3.5" />
              <span>Sign In</span>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
};