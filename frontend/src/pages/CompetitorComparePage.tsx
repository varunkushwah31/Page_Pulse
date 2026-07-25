import React from 'react';
import { CompetitorConsole } from '../components/CompetitorConsole';

export const CompetitorComparePage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono text-muted-foreground">
        Side-by-Side Competitor Comparison Matrix
      </h2>
      <CompetitorConsole />
    </div>
  );
};