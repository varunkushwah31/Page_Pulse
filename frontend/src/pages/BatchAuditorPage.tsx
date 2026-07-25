import React from 'react';
import { BatchAuditorConsole } from '../components/BatchAuditorConsole';

export const BatchAuditorPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono text-muted-foreground">
        Bulk Target URL Parallel Scrape Inspector
      </h2>
      <BatchAuditorConsole />
    </div>
  );
};