import React from 'react';
import { ScheduledAuditConsole } from '../components/ScheduledAuditConsole';

export const ScheduledAuditsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono text-muted-foreground">
        Automated Recurring Scan & Score Regression Alert Monitor
      </h2>
      <ScheduledAuditConsole />
    </div>
  );
};