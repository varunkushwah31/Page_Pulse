import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendConsole } from '../components/TrendConsole';
import { ChartBarIcon } from '@phosphor-icons/react';

export const DomainTrendsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const domainParam = searchParams.get('domain') || '';

  return (
    <div className="space-y-6">
      {/* Page Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262B33] pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <ChartBarIcon className="size-4 text-[#4FD8C4]" />
          <span className="text-[#565D68]">PAGE PULSE</span>
          <span className="text-[#565D68]">/</span>
          <h1 className="font-bold text-[#E7EAEE]">DOMAIN HISTORICAL TRAJECTORY</h1>
          <span className="rounded bg-[#4FD8C4]/10 border border-[#4FD8C4]/30 px-1.5 py-0.2 text-[9px] font-bold text-[#4FD8C4] uppercase">
            REGRESSION STATS
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#565D68]">
          Statistical Anomaly Detection & Metric History {domainParam && `(${domainParam})`}
        </span>
      </div>

      <TrendConsole initialDomain={domainParam} />
    </div>
  );
};