import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LightningIcon,
  HardDrivesIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  GitBranchIcon,
  ClockIcon,
  UsersIcon,
  GearIcon,
  UserIcon,
  SignOutIcon,
  CaretDownIcon,
  PulseIcon,
  ListIcon,
  XIcon,
  MagnifyingGlassIcon
} from '@phosphor-icons/react';

interface PageHeaderNavProps {
  onOpenCommandPalette?: () => void;
}

export const PageHeaderNav: React.FC<PageHeaderNavProps> = ({ onOpenCommandPalette }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const primaryNav = [
    { path: '/audit', command: 'audit', icon: LightningIcon, label: 'Audit' },
    { path: '/sitemap', command: 'sitemap', icon: HardDrivesIcon, label: 'Sitemap' },
    { path: '/batch', command: 'batch', icon: GitBranchIcon, label: 'Batch' },
    { path: '/scheduled', command: 'schedule', icon: ClockIcon, label: 'Monitors' },
  ];

  const auxNav = [
    { path: '/compare', command: 'compare', icon: UsersIcon, label: 'Competitor Compare' },
    { path: '/trend', command: 'trend', icon: ChartBarIcon, label: 'Domain Trends' },
    { path: '/reports', command: 'reports', icon: ShieldCheckIcon, label: 'Saved Reports' },
    { path: '/telemetry', command: 'stats', icon: GearIcon, label: 'Platform Stats' },
  ];

  const isAuxActive = auxNav.some((item) => location.pathname === item.path);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#262B33] bg-[#0A0C0F]/90 backdrop-blur-xl mb-6 font-mono text-xs">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          
          {/* TOP LEFT: Prominent User Profile Section & Brand */}
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
              <PulseIcon className="size-4 text-[#4FD8C4]" />
              <span className="font-bold text-[#E7EAEE] tracking-tight hidden sm:inline">
                Page Pulse
              </span>
            </NavLink>
          </div>

          {/* TOP CENTER: Streamlined Primary Navigation Bar & MagnifyingGlass */}
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

            {/* Auxiliary Tools Dropdown List */}
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
                <CaretDownIcon className={`size-3.5 transition-transform ${dropdownOpen ? 'rotate-180 text-[#4FD8C4]' : ''}`} />
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

            {/* Command Palette Trigger Button */}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="flex items-center gap-2 rounded-md border border-[#262B33] bg-[#12151A] px-2.5 py-1 text-[#8B93A1] hover:text-[#E7EAEE] hover:border-[#333A45] transition-all cursor-pointer ml-1"
                title="Open Command Palette (Ctrl+K)"
              >
                <MagnifyingGlassIcon className="size-3 text-[#565D68]" />
                <span className="text-[11px] text-[#565D68]">search</span>
                <span className="rounded bg-[#0A0C0F] border border-[#262B33] px-1 py-0.2 text-[9px] text-[#565D68] font-bold">
                  ⌘K
                </span>
              </button>
            )}
          </nav>

          {/* TOP RIGHT: Sign In / Logout Button & Mobile List Toggle */}
          <div className="flex items-center gap-2">
            {/* Quick search on mobile */}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="md:hidden flex items-center justify-center p-1.5 rounded-md text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#12151A] transition-all cursor-pointer border border-[#262B33]"
                aria-label="Open search"
              >
                <MagnifyingGlassIcon className="size-4" />
              </button>
            )}

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
                <SignOutIcon className="size-3.5" />
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

            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-1.5 rounded-md text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#12151A] transition-all cursor-pointer border border-[#262B33]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <XIcon className="size-4" /> : <ListIcon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          role="presentation"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-[#0A0C0F] border-l border-[#262B33] z-50 transform transition-transform duration-300 md:hidden flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#262B33]">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded bg-[#191D24] border border-[#333A45] text-[#4FD8C4] font-mono font-bold text-sm">
              {user ? user.username.charAt(0).toUpperCase() : <UserIcon className="size-4" />}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[#E7EAEE] text-sm leading-tight">
                {user ? user.username : 'Guest User'}
              </span>
              <span className="text-[10px] uppercase font-semibold text-[#4FD8C4]">
                {user ? user.role?.replace('ROLE_', '') || 'PRO' : 'GUEST'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-md text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#12151A] transition-all cursor-pointer"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
          {[...primaryNav, ...auxNav].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 w-full rounded-md px-3 py-3 font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#191D24] text-[#4FD8C4] border border-[#262B33]'
                      : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#12151A] border border-transparent'
                  }`
                }
              >
                <Icon className="size-4 text-[#565D68]" />
                <span className="text-[#565D68] font-mono">$</span>
                <span>{item.command}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </>
  );
};