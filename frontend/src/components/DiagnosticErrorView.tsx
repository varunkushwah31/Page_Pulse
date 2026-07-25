import React from 'react';
import { AlertOctagon, RefreshCw, ArrowLeft, Terminal } from 'lucide-react';
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
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 mx-auto shadow-xl shadow-red-500/10">
        <AlertOctagon className="size-8" />
      </div>

      <div className="space-y-2">
        <span className="inline-block rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 uppercase tracking-widest">
          Diagnostic System Alert
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">{errorTitle}</h2>
        <p className="text-slate-400 text-sm">{errorMessage}</p>
      </div>

      <Card className="border-slate-800 bg-slate-950 p-4 text-left font-mono text-xs text-red-300">
        <div className="flex items-center gap-2 border-b border-slate-900 pb-2 text-slate-500 mb-2">
          <Terminal className="size-3.5" />
          <span>Diagnostic Log Stream</span>
        </div>
        <p className="text-slate-400">[SocketTimeoutException]: 5000ms read limit exceeded during Jsoup handshake.</p>
        <p className="text-slate-400">[CircuitBreaker]: Fallback handler invoked for URL scraper service.</p>
      </Card>

      <div className="flex items-center justify-center gap-3 pt-4">
        {onGoBack && (
          <Button onClick={onGoBack} variant="outline" className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white cursor-pointer">
            <ArrowLeft className="mr-2 size-4" /> Go Back
          </Button>
        )}
        {onRetry && (
          <Button onClick={onRetry} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 cursor-pointer">
            <RefreshCw className="mr-2 size-4" /> Retry Audit
          </Button>
        )}
      </div>
    </div>
  );
};
