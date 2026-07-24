import React from 'react';

interface ReportRowProps {
  label: string;
  value?: string | number | null;
  emptyText?: string;
  badge?: React.ReactNode;
}

export const ReportRow: React.FC<ReportRowProps> = ({
  label,
  value,
  emptyText = 'Not specified',
  badge,
}) => {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 border-b border-[#262B33] last:border-b-0 font-sans text-xs">
      <div className="w-full sm:w-[180px] shrink-0 font-mono text-xs text-[#565D68] uppercase tracking-wider">
        {label}
      </div>

      <div className="flex-1 text-[#E7EAEE] flex items-center justify-between gap-3">
        {hasValue ? (
          <span className="break-all">{value}</span>
        ) : (
          <span className="font-mono text-xs italic text-[#565D68]">{emptyText}</span>
        )}

        {badge && <div className="shrink-0">{badge}</div>}
      </div>
    </div>
  );
};
