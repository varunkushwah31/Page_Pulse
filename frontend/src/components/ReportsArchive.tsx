import React, { useEffect, useState } from 'react';
import { ShieldCheck, Download, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditReportDocument } from '../types';
import { fetchSavedReports, deleteSavedReport, downloadPdfReport } from '../lib/api';

export const ReportsArchive: React.FC = () => {
  const [reports, setReports] = useState<AuditReportDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
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
  );
};
