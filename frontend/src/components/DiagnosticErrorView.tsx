import React from 'react';
import { WarningOctagonIcon, ArrowsClockwiseIcon, ArrowLeftIcon, TerminalIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DiagnosticErrorViewProps {
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
}

export const DiagnosticErrorView: React.FC<DiagnosticErrorViewProps> = ({
  errorTitle = 'Audit Connection Failed',
  errorMessage = 'Target host server timed out or returned non-HTML payload (504 Gateway Timeout).',
  onRetry,
  onGoBack,
}) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30 mx-auto shadow-xl shadow-[#F87171]/10">
        <WarningOctagonIcon className="size-8" />
      </div>

      <div className="space-y-2">
        <span className="inline-block rounded-full border border-[#F87171]/30 bg-[#F87171]/10 px-3 py-1 text-[10px] font-bold text-[#F87171] uppercase tracking-widest font-mono">
          Diagnostic System Alert
        </span>
        <h2 className="text-3xl font-extrabold text-[#E7EAEE] tracking-tight font-mono">{errorTitle}</h2>
        <p className="text-[#8B93A1] text-sm font-sans">{errorMessage}</p>
      </div>

      <Card className="border-[#262B33] bg-[#0A0C0F] p-4 text-left font-mono text-xs text-[#F87171]">
        <div className="flex items-center gap-2 border-b border-[#262B33] pb-2 text-[#565D68] mb-2">
          <TerminalIcon className="size-3.5" />
          <span>$ diagnostic --error --log-stream</span>
        </div>
        <p className="text-[#8B93A1]">[SocketTimeoutException]: 5000ms read limit exceeded during Jsoup handshake.</p>
        <p className="text-[#8B93A1]">[CircuitBreaker]: Fallback handler invoked for URL scraper service.</p>
      </Card>

      <div className="flex items-center justify-center gap-3 pt-4">
        {onGoBack && (
          <Button onClick={onGoBack} variant="outline" className="border-[#262B33] bg-[#12151A] text-[#E7EAEE] hover:text-[#E7EAEE] hover:bg-[#191D24] cursor-pointer transition-all font-mono">
            <ArrowLeftIcon className="mr-2 size-4" /> Go Back
          </Button>
        )}
        {onRetry && (
          <Button onClick={onRetry} className="bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-semibold shadow-lg shadow-[#4FD8C4]/30 cursor-pointer transition-all font-mono">
            <ArrowsClockwiseIcon className="mr-2 size-4" /> Retry Audit
          </Button>
        )}
      </div>
    </div>
  );
};
