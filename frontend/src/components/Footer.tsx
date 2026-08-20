import React from 'react';
import { NavLink } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="pt-8 pb-6 border-t border-[#262B33] text-center font-mono text-xs text-[#8B93A1]">
      <div className="flex flex-col items-center gap-6 max-w-7xl mx-auto px-4">
        
        {/* Navigation Links */}
        <div className="flex flex-wrap justify-center gap-4 text-[11px]">
          <NavLink to="/audit" className="hover:text-[#4FD8C4] transition-all cursor-pointer">/audit</NavLink>
          <NavLink to="/sitemap" className="hover:text-[#4FD8C4] transition-all cursor-pointer">/sitemap</NavLink>
          <NavLink to="/reports" className="hover:text-[#4FD8C4] transition-all cursor-pointer">/reports</NavLink>
          <NavLink to="/trend" className="hover:text-[#4FD8C4] transition-all cursor-pointer">/trend</NavLink>
        </div>

        {/* Tech Stack Micro-badges */}
        <div className="flex flex-wrap justify-center gap-2">
          {['Spring Boot 4.1', 'React 19', 'MongoDB Atlas', 'Redis', 'Virtual Threads'].map(tech => (
            <span key={tech} className="px-2 py-1 rounded border border-[#262B33] bg-[#12151A] text-[10px] text-[#8B93A1]">
              {tech}
            </span>
          ))}
        </div>

        {/* Brand & Version */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 text-[11px] text-[#565D68]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#E7EAEE]">Page Pulse</span>
            <span>•</span>
            <span>Enterprise Site Audit & Core Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span>&copy; {new Date().getFullYear()} Page Pulse. All rights reserved.</span>
            <span className="px-2 py-0.5 rounded border border-[#262B33] bg-[#12151A] text-[10px] text-[#4FD8C4]">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};