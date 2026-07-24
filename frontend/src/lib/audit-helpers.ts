export type Severity = 'success' | 'warning' | 'info' | 'destructive';

export function getStatusSeverity(status: number): Severity {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  return 'destructive';
}

export function getTimingSeverity(responseTimeMs: number): Severity {
  if (responseTimeMs <= 800) return 'success';
  if (responseTimeMs <= 2000) return 'warning';
  return 'destructive';
}

export function getTimingPercentage(responseTimeMs: number): number {
  return Math.min(100, Math.max(5, (responseTimeMs / 3000) * 100));
}

export function getH1Severity(h1Count: number): Severity {
  if (h1Count === 1) return 'success';
  if (h1Count === 0) return 'destructive';
  return 'warning';
}

export function getAltTextSeverity(missingAltCount: number): Severity {
  if (missingAltCount === 0) return 'success';
  if (missingAltCount <= 3) return 'warning';
  return 'destructive';
}
