import React from 'react';
import { TelemetryConsole } from '../components/TelemetryConsole';

export const PlatformStatsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-mono text-[#8B93A1]">
        Platform Telemetry & Domain Inspection Volume
      </h2>
      <TelemetryConsole />
    </div>
  );
};
