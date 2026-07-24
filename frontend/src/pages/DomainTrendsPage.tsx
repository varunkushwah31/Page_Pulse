import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendConsole } from '../components/TrendConsole';

export const DomainTrendsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const domainParam = searchParams.get('domain') || '';

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono text-[#8B93A1]">
        Historical Domain Performance & SEO Score Trends {domainParam && `(${domainParam})`}
      </h2>
      <TrendConsole />
    </div>
  );
};
