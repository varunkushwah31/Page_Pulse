import React from 'react';

export type InstrumentMode = 'audit' | 'sitemap' | 'compare' | 'trend' | 'reports' | 'telemetry';

interface ViewSwitcherProps {
  currentMode: InstrumentMode;
  onModeChange: (mode: InstrumentMode) => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentMode, onModeChange }) => {
  const modes: { id: InstrumentMode; label: string; command: string }[] = [
    { id: 'audit', label: 'Audit', command: 'audit' },
    { id: 'sitemap', label: 'Sitemap', command: 'sitemap' },
    { id: 'compare', label: 'Compare', command: 'compare' },
    { id: 'trend', label: 'Trend', command: 'trend' },
    { id: 'reports', label: 'Archive', command: 'reports' },
    { id: 'telemetry', label: 'Telemetry', command: 'stats' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262B33] pb-3">
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`rounded px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#191D24] text-[#4FD8C4] border border-[#333A45] shadow-sm'
                  : 'text-[#8B93A1] hover:text-[#E7EAEE] hover:bg-[#12151A]'
              }`}
            >
              <span className="text-[#565D68] mr-1">$</span>
              {mode.command}
            </button>
          );
        })}
      </div>

      <span className="font-mono text-[11px] text-[#565D68]">
        MODE: <strong className="text-[#4FD8C4] uppercase">{currentMode}</strong>
      </span>
    </div>
  );
};
