import React from 'react';
import type { AuditResponse } from '../types';
import { Gauge, ShieldCheck, Link, AlertTriangle, CheckCircle2, XCircle, Lock, ExternalLink, Activity } from 'lucide-react';

interface AdvancedEngineConsoleProps {
  audit: AuditResponse;
}

export const AdvancedEngineConsole: React.FC<AdvancedEngineConsoleProps> = ({ audit }) => {
  const vitals = audit.coreWebVitals;
  const security = audit.securityMetrics;
  const links = audit.linkMetrics;

  const getMetricColor = (val: number, goodMax: number, warnMax: number) => {
    if (val <= goodMax) return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10';
    if (val <= warnMax) return 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10';
    return 'text-[#F87171] border-[#F87171]/30 bg-[#F87171]/10';
  };

  const getClsColor = (val: number) => {
    if (val <= 0.1) return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10';
    if (val <= 0.25) return 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10';
    return 'text-[#F87171] border-[#F87171]/30 bg-[#F87171]/10';
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 1. Core Web Vitals Section */}
      {vitals && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#262B33] pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Gauge className="size-4 text-[#4FD8C4]" />
              <h3 className="font-bold text-[#E7EAEE] text-sm">Core Web Vitals</h3>
              {vitals.cruxDataAvailable || vitals.dataSource === 'CRUX_FIELD' ? (
                <span className="text-[10px] text-[#4ADE80] bg-[#4ADE80]/10 border border-[#4ADE80]/30 px-2 py-0.5 rounded font-bold">
                  CrUX Real User Field Data (75th %)
                </span>
              ) : (
                <span className="text-[10px] text-[#8B93A1] bg-[#191D24] border border-[#262B33] px-2 py-0.5 rounded">
                  Lab Estimated Heuristic
                </span>
              )}
            </div>
            <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold ${vitals.overallGrade === 'GOOD' ? 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10' : vitals.overallGrade === 'NEEDS_IMPROVEMENT' ? 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10' : 'text-[#F87171] border-[#F87171]/30 bg-[#F87171]/10'}`}>
              GRADE: {vitals.overallGrade}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* LCP */}
            <div className={`rounded-lg border p-3 space-y-1 ${getMetricColor(vitals.lcpMs, 2500, 4000)}`}>
              <span className="text-[10px] uppercase font-semibold text-[#8B93A1]">LCP (Largest Content)</span>
              <div className="text-xl font-extrabold">{vitals.lcpMs} ms</div>
              <p className="text-[10px] font-sans opacity-80">Good ≤ 2.5s</p>
            </div>

            {/* INP */}
            <div className={`rounded-lg border p-3 space-y-1 ${getMetricColor(vitals.inpMs, 200, 500)}`}>
              <span className="text-[10px] uppercase font-semibold text-[#8B93A1]">INP (Interaction)</span>
              <div className="text-xl font-extrabold">{vitals.inpMs} ms</div>
              <p className="text-[10px] font-sans opacity-80">Good ≤ 200ms</p>
            </div>

            {/* CLS */}
            <div className={`rounded-lg border p-3 space-y-1 ${getClsColor(vitals.clsRatio)}`}>
              <span className="text-[10px] uppercase font-semibold text-[#8B93A1]">CLS (Layout Shift)</span>
              <div className="text-xl font-extrabold">{vitals.clsRatio}</div>
              <p className="text-[10px] font-sans opacity-80">Good ≤ 0.10</p>
            </div>

            {/* FCP */}
            <div className={`rounded-lg border p-3 space-y-1 ${getMetricColor(vitals.fcpMs, 1800, 3000)}`}>
              <span className="text-[10px] uppercase font-semibold text-[#8B93A1]">FCP (First Paint)</span>
              <div className="text-xl font-extrabold">{vitals.fcpMs} ms</div>
              <p className="text-[10px] font-sans opacity-80">Good ≤ 1.8s</p>
            </div>

            {/* TTFB */}
            <div className={`rounded-lg border p-3 space-y-1 ${getMetricColor(vitals.ttfbMs, 800, 1800)}`}>
              <span className="text-[10px] uppercase font-semibold text-[#8B93A1]">TTFB (Time To First Byte)</span>
              <div className="text-xl font-extrabold">{vitals.ttfbMs} ms</div>
              <p className="text-[10px] font-sans opacity-80">Good ≤ 800ms</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Deep Security & SSL Inspector Section */}
      {security && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#4ADE80]" />
              <h3 className="font-bold text-[#E7EAEE] text-sm">Deep Security & SSL Certificate Inspector</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded border px-2.5 py-0.5 text-[11px] font-bold ${security.sslValid ? 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30' : 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/30'}`}>
                <Lock className="size-3" />
                {security.sslValid ? 'Valid SSL Certificate' : 'Insecure / Invalid SSL'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1">
              <span className="text-[#8B93A1] text-[10px] uppercase">Certificate Expiry</span>
              <div className="text-base font-bold text-[#E7EAEE]">
                {security.daysUntilSslExpiry > 0 ? `${security.daysUntilSslExpiry} days remaining` : 'Expired'}
              </div>
              <span className="text-[11px] text-[#565D68] block truncate">Issuer: {security.sslIssuer}</span>
            </div>

            <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1">
              <span className="text-[#8B93A1] text-[10px] uppercase">TLS Protocol & Cipher</span>
              <div className="text-base font-bold text-[#E7EAEE]">{security.tlsVersion}</div>
              <span className="text-[11px] text-[#565D68] block truncate">{security.cipherSuite}</span>
            </div>

            <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1">
              <span className="text-[#8B93A1] text-[10px] uppercase">Mixed Content Warnings</span>
              <div className={`text-base font-bold ${security.hasMixedContent ? 'text-[#F87171]' : 'text-[#4ADE80]'}`}>
                {security.mixedContentCount} HTTP asset(s)
              </div>
              <span className="text-[11px] text-[#565D68] block">
                {security.hasMixedContent ? 'Insecure HTTP elements found' : 'Fully HTTPS compliant'}
              </span>
            </div>
          </div>

          {/* Security Headers Compliance Checklist */}
          <div>
            <span className="text-[#8B93A1] uppercase tracking-wider font-semibold text-[10px] block mb-2">
              HTTP Security Headers Compliance Checklist ({5 - security.missingSecurityHeadersCount} / 5 Passed)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {security.securityHeadersPresent && Object.entries(security.securityHeadersPresent).map(([header, present]) => (
                <div key={header} className={`flex items-center justify-between p-2.5 rounded border text-[11px] ${present ? 'bg-[#4ADE80]/5 border-[#4ADE80]/20 text-[#4ADE80]' : 'bg-[#F87171]/5 border-[#F87171]/20 text-[#F87171]'}`}>
                  <span className="font-semibold font-mono truncate">{header}</span>
                  {present ? <CheckCircle2 className="size-3.5 shrink-0" /> : <XCircle className="size-3.5 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Broken Links & Redirect Chain Detector Section */}
      {links && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#262B33] pb-3">
            <div className="flex items-center gap-2">
              <Link className="size-4 text-[#7AA2F7]" />
              <h3 className="font-bold text-[#E7EAEE] text-sm">Broken Link & Redirect Chain Detector</h3>
            </div>
            <div className="flex items-center gap-3 text-[#8B93A1] text-[11px]">
              <span>Found: <strong className="text-[#E7EAEE]">{links.totalLinksFound}</strong></span>
              <span>Working: <strong className="text-[#4ADE80]">{links.workingLinksCount}</strong></span>
              <span>Redirects: <strong className="text-[#FBBF24]">{links.redirectLinksCount}</strong></span>
              <span>Broken: <strong className="text-[#F87171]">{links.brokenLinksCount}</strong></span>
            </div>
          </div>

          {links.brokenLinksCount === 0 ? (
            <div className="p-4 rounded-lg border border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80] flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-[#4ADE80]" />
              <span>No 404 broken links or dead anchor tags detected on this page!</span>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[#F87171] font-bold text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />
                <span>Detected Broken Anchor Links ({links.brokenLinksCount})</span>
              </span>

              <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#262B33] bg-[#191D24] text-[#8B93A1] text-[10px] uppercase">
                      <th className="p-2.5">Target Anchor Link URL</th>
                      <th className="p-2.5">Anchor Text</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B33]">
                    {links.brokenLinks.map((b, idx) => (
                      <tr key={`${b.url}-${idx}`} className="hover:bg-[#191D24]/50">
                        <td className="p-2.5 text-[#E7EAEE] font-mono break-all max-w-xs">{b.url}</td>
                        <td className="p-2.5 text-[#8B93A1] font-sans truncate max-w-[150px]">{b.anchorText || 'N/A'}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded border border-[#F87171]/30 bg-[#F87171]/10 text-[#F87171] font-bold">
                            {b.statusCode} ({b.statusMessage})
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] text-[#8B93A1] inline-flex items-center gap-1">
                            {b.external ? <ExternalLink className="size-3" /> : <Activity className="size-3" />}
                            {b.external ? 'External' : 'Internal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
