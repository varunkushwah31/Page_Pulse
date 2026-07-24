import React from 'react';
import { ReportsConsole } from '../components/ReportsConsole';

export const ReportsArchivePage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono text-[#8B93A1]">
        MongoDB Atlas Permanent Audit Document Archive
      </h2>
      <ReportsConsole />
    </div>
  );
};
