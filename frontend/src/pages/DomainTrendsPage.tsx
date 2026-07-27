import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendConsole } from '../components/TrendConsole';

export const DomainTrendsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const domainParam = searchParams.get('domain') || '';

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono text-muted-foreground">
        Historical Domain Performance & SEO Score Trends {domainParam && `(${domainParam})`}
      </h2>
      <TrendConsole initialDomain={domainParam} />
    </div>
  );
};