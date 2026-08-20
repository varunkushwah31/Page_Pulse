import React, { useState, useEffect } from 'react';
import { ArrowUpIcon } from '@phosphor-icons/react';

export const BackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      className="fixed bottom-6 right-6 z-40 flex size-10 items-center justify-center rounded-xl border border-[#333A45] bg-[#12151A]/90 text-[#4FD8C4] shadow-2xl backdrop-blur-md hover:bg-[#191D24] hover:border-[#4FD8C4] hover:scale-110 active:scale-95 transition-all cursor-pointer font-mono text-xs animate-in fade-in zoom-in-75 duration-200"
    >
      <ArrowUpIcon className="size-4" />
    </button>
  );
};
