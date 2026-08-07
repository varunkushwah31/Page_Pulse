import React, { useEffect, useState } from 'react';
import { ShieldCheck, Download, Trash2, Loader2, RefreshCw, Palette, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    } catch (err: any) {
      setError(err.message || 'Failed to load MongoDB saved reports');
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
    } catch (_) {
    }
  };

  const handleCustomPdfSubmit = async (e: React.FormEvent) => {
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
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">MongoDB Permanent Saved Reports</CardTitle>
                <p className="text-xs text-slate-400">Archived executive audit reports with OpenPDF document export.</p>
              </div>
            </div>
            <Button
              onClick={loadReports}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-950 text-slate-300 hover:text-white cursor-pointer"
            >
              <RefreshCw className={`mr-2 size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400">
              ⚠️ {error}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No permanent reports saved to MongoDB Atlas yet. Run an audit and click "Save Report to Cloud".
            </div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Document ID</TableHead>
                  <TableHead className="text-slate-400">Target URL</TableHead>
                  <TableHead className="text-slate-400 text-center">Score</TableHead>
                  <TableHead className="text-slate-400 text-center">Grade</TableHead>
                  <TableHead className="text-slate-400 text-center">Saved At</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="border-slate-800 hover:bg-slate-900">
                    <TableCell className="font-mono text-xs text-blue-400 font-semibold">{report.id}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300 max-w-xs truncate">{report.url}</TableCell>
                    <TableCell className="text-center text-xs font-bold text-white">{report.overallScore} / 100</TableCell>
                    <TableCell className="text-center text-xs">
                      <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300">
                        {report.healthGrade || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-400">
                      {report.savedAt ? new Date(report.savedAt).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => downloadPdfReport(report.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer"
                        >
                          <Download className="size-3.5" /> PDF
                        </button>
                        <button
                          onClick={() => setSelectedReportId(report.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-400 hover:bg-teal-500/20 transition-all cursor-pointer"
                        >
                          <Palette className="size-3.5" /> Custom
                        </button>
                        <Button
                          onClick={() => handleDelete(report.id)}
                          variant="ghost"
                          size="icon"
                          className="size-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* White-Label PDF Customization Modal */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400">
                <Palette className="size-4" />
                <h3 className="font-bold text-white text-sm">White-Label PDF Branding</h3>
              </div>
              <button
                onClick={() => setSelectedReportId(null)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCustomPdfSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Company / Agency Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Digital Security"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Brand Primary Color (Hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColorHex}
                    onChange={(e) => setPrimaryColorHex(e.target.value)}
                    className="size-8 rounded border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColorHex}
                    onChange={(e) => setPrimaryColorHex(e.target.value)}
                    className="flex-1 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Header Title Banner Text</label>
                <input
                  type="text"
                  placeholder="e.g. CONFIDENTIAL AUDIT REPORT"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Footer Disclaimer Text</label>
                <input
                  type="text"
                  placeholder="e.g. Prepared exclusively for client review"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReportId(null)}
                  className="rounded border border-slate-800 px-4 py-2 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={downloadingCustom}
                  className="rounded border border-teal-500/40 bg-teal-500/10 px-4 py-2 font-bold text-teal-400 hover:bg-teal-500/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Download className="size-3.5" />
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
