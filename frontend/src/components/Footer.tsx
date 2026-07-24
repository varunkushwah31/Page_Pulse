import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="pt-8 border-t border-[#262B33] text-center font-mono text-xs text-[#565D68]">
      <a
        href="https://digitalheroesco.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#8B93A1] hover:text-[#4FD8C4] transition-colors underline decoration-dotted underline-offset-4"
      >
        Built for Digital Heroes Training Task
      </a>
    </footer>
  );
};
