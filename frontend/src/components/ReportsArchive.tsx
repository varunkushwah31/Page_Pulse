import React, { useEffect, useState } from 'react';
import {
  ShieldCheckIcon,
  DownloadSimpleIcon,
  TrashIcon,
  CircleNotchIcon,
  ArrowsClockwiseIcon,
  PaletteIcon,
  XIcon,
  TerminalIcon
} from '@phosphor-icons/react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditReportDocument, PdfBrandingConfig } from '../types';
import { fetchSavedReports, deleteSavedReport, downloadPdfReport, downloadCustomPdfReport } from '../lib/api';

export const ReportsArchive: React.FC = () => {
  const [reports, setReports] = useState<AuditReportDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // White-Label PDF Modal State
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [primaryColorHex, setPrimaryColorHex] = useState('#0F172A');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [downloadingCustom, setDownloadingCustom] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSavedReports(0, 20);
      setReports(data.content || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load MongoDB saved reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedReport(id);
      setReports(reports.filter((r) => r.id !== id));
    } catch {
      // Ignore delete failure silently
    }
  };

  const handleCustomPdfSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReportId || downloadingCustom) return;

    setDownloadingCustom(true);
    try {
      const branding: PdfBrandingConfig = {
        companyName: companyName.trim() || undefined,
        primaryColorHex: primaryColorHex.trim() || undefined,
        headerText: headerText.trim() || undefined,
        footerText: footerText.trim() || undefined,
      };
      await downloadCustomPdfReport(selectedReportId, branding);
      setSelectedReportId(null);
    } catch (err) {
      console.error('Failed to download custom PDF:', err);
    } finally {
      setDownloadingCustom(false);
    }
  };

  return (
    <>
      <div className="border border-[#262B33] bg-[#12151A] rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#191D24] px-4 py-3 border-b border-[#262B33] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#E7EAEE] font-mono text-xs">
            <TerminalIcon className="size-4" />
            <span>$ reports --archive</span>
          </div>
          <Button
            onClick={loadReports}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-8 border-[#262B33] bg-[#0A0C0F] text-[#E7EAEE] hover:text-[#E7EAEE] hover:bg-[#191D24] cursor-pointer transition-all font-mono"
          >
            <ArrowsClockwiseIcon className={`mr-2 size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#4FD8C4]/10 text-[#4FD8C4] border border-[#4FD8C4]/30">
              <ShieldCheckIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#E7EAEE] font-mono">MongoDB Permanent Saved Reports</h2>
              <p className="text-xs text-[#8B93A1] font-sans">Archived executive audit reports with OpenPDF document export.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <CircleNotchIcon className="size-8 animate-spin text-[#4FD8C4]" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 p-4 text-xs font-medium text-[#F87171] font-mono">
              ⚠️ {error}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-[#565D68] text-sm font-sans">
              No permanent reports saved to MongoDB Atlas yet. Run an audit and click "Save Report to Cloud".
            </div>
          ) : (
            <Table>
              <TableHeader className="border-[#262B33]">
                <TableRow className="border-[#262B33] hover:bg-transparent">
                  <TableHead className="text-[#8B93A1] font-mono text-xs">Document ID</TableHead>
                  <TableHead className="text-[#8B93A1] font-mono text-xs">Target URL</TableHead>
                  <TableHead className="text-[#8B93A1] text-center font-mono text-xs">Score</TableHead>
                  <TableHead className="text-[#8B93A1] text-center font-mono text-xs">Grade</TableHead>
                  <TableHead className="text-[#8B93A1] text-center font-mono text-xs">Saved At</TableHead>
                  <TableHead className="text-[#8B93A1] text-right font-mono text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="border-[#262B33] hover:bg-[#191D24]">
                    <TableCell className="font-mono text-[11px] text-[#4FD8C4] font-semibold">{report.id}</TableCell>
                    <TableCell className="font-mono text-[11px] text-[#E7EAEE] max-w-xs truncate">{report.url}</TableCell>
                    <TableCell className="text-center text-[11px] font-bold text-[#E7EAEE] font-mono">{report.overallScore} / 100</TableCell>
                    <TableCell className="text-center text-[11px]">
                      <Badge variant="outline" className="border-[#262B33] bg-[#191D24] text-[#E7EAEE] font-mono">
                        {report.healthGrade || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-[11px] text-[#8B93A1] font-mono">
                      {report.savedAt ? new Date(report.savedAt).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => downloadPdfReport(report.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-2.5 py-1 text-[11px] font-medium text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer font-mono"
                        >
                          <DownloadSimpleIcon className="size-3.5" /> PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReportId(report.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-2.5 py-1 text-[11px] font-medium text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer font-mono"
                        >
                          <PaletteIcon className="size-3.5" /> Custom
                        </button>
                        <Button
                          onClick={() => handleDelete(report.id)}
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[#565D68] hover:text-[#F87171] hover:bg-[#F87171]/10 cursor-pointer transition-all"
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* White-Label PDF Customization Modal */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C0F]/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#262B33] bg-[#12151A] p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
              <div className="flex items-center gap-2 text-[#4FD8C4]">
                <PaletteIcon className="size-4" />
                <h3 className="font-bold text-[#E7EAEE] text-sm">White-Label PDF Branding</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportId(null)}
                className="text-[#8B93A1] hover:text-[#E7EAEE] transition-all cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCustomPdfSubmit} className="space-y-4 pt-2">
              <div>
                <label htmlFor="companyName" className="block text-[#8B93A1] text-[10px] mb-1.5 uppercase tracking-wider">Company / Agency Name</label>
                <input
                  id="companyName"
                  type="text"
                  placeholder="e.g. Acme Digital Security"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded border border-[#333A45] bg-[#0A0C0F] px-3 py-2.5 text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-all"
                />
              </div>

              <div>
                <label htmlFor="primaryColorHex" className="block text-[#8B93A1] text-[10px] mb-1.5 uppercase tracking-wider">Brand Primary Color (Hex)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColorHex}
                    onChange={(e) => setPrimaryColorHex(e.target.value)}
                    className="size-10 rounded border border-[#333A45] bg-[#0A0C0F] cursor-pointer"
                  />
                  <input
                    id="primaryColorHex"
                    type="text"
                    value={primaryColorHex}
                    onChange={(e) => setPrimaryColorHex(e.target.value)}
                    className="flex-1 rounded border border-[#333A45] bg-[#0A0C0F] px-3 py-2.5 text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="headerText" className="block text-[#8B93A1] text-[10px] mb-1.5 uppercase tracking-wider">Header Title Banner Text</label>
                <input
                  id="headerText"
                  type="text"
                  placeholder="e.g. CONFIDENTIAL AUDIT REPORT"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="w-full rounded border border-[#333A45] bg-[#0A0C0F] px-3 py-2.5 text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-all"
                />
              </div>

              <div>
                <label htmlFor="footerText" className="block text-[#8B93A1] text-[10px] mb-1.5 uppercase tracking-wider">Footer Disclaimer Text</label>
                <input
                  id="footerText"
                  type="text"
                  placeholder="e.g. Prepared exclusively for client review"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full rounded border border-[#333A45] bg-[#0A0C0F] px-3 py-2.5 text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-all"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#262B33]">
                <button
                  type="button"
                  onClick={() => setSelectedReportId(null)}
                  className="rounded border border-[#262B33] bg-[#191D24] px-4 py-2 text-[#8B93A1] hover:text-[#E7EAEE] transition-all cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={downloadingCustom}
                  className="rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-4 py-2 font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <DownloadSimpleIcon className="size-3.5" />
                  <span>{downloadingCustom ? 'Generating...' : 'Export Branded PDF'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
