import React, { useState, useEffect } from 'react';

interface LoadingTraceProps {
  targetUrl: string;
}

const LOG_LINES = [
  "[TLS] Establishing secure handshake...",
  "[DNS] Resolving target host...",
  "[HTTP/2] Initiating GET request...",
  "[DOM] Parsing HTML document tree...",
  "[ENGINE] Running 4-pillar audit analysis..."
];

export const LoadingTrace: React.FC<LoadingTraceProps> = ({ targetUrl }) => {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    // Show first line immediately
    setVisibleLines(1);
    
    // Timer interval for elapsed time
    const timer = setInterval(() => {
      setElapsed(prev => prev + 100); // 100ms ticks
    }, 100);

    // Sequence timeouts for lines 2 to 5
    const timeouts = LOG_LINES.map((_, index) => {
      if (index === 0) return null;
      return setTimeout(() => {
        setVisibleLines(index + 1);
      }, index * 400);
    });

    return () => {
      clearInterval(timer);
      timeouts.forEach(t => t && clearTimeout(t));
    };
  }, []);

  return (
    <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 font-mono text-xs text-[#8B93A1]">
      {/* Header Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-[#262B33] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[#4FD8C4] font-semibold">$ trace --target</span>
          <span className="text-[#E7EAEE] truncate">{targetUrl}</span>
        </div>
        <div className="text-[#565D68]">
          {(elapsed / 1000).toFixed(1)}s
        </div>
      </div>

      {/* Log Lines */}
      <div className="flex flex-col gap-1.5">
        {LOG_LINES.map((line, index) => (
          <div 
            key={index} 
            className={`transition-opacity duration-300 ${index < visibleLines ? 'opacity-100' : 'opacity-0 hidden'}`}
          >
            <span className="text-[#565D68] mr-2">{(index * 0.4).toFixed(1)}s</span>
            <span className="text-[#8B93A1]">{line}</span>
            {index === visibleLines - 1 && visibleLines < LOG_LINES.length && (
              <span className="inline-block ml-2 w-2 h-3.5 align-middle bg-[#4FD8C4] cursor-blink"></span>
            )}
            {index === LOG_LINES.length - 1 && visibleLines === LOG_LINES.length && (
              <span className="inline-block ml-2 w-2 h-3.5 align-middle bg-[#4FD8C4] cursor-blink"></span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};