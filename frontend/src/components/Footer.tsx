import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="pt-8 border-t border-border text-center font-mono text-xs text-muted-foreground">
      <a
        href="https://digitalheroesco.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-4"
      >
        Built for Digital Heroes Training Task
      </a>
    </footer>
  );
};