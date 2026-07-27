import React, { useEffect, useState } from 'react';
import type { AuditReportDocument } from '../types';
import { fetchSavedReports, deleteSavedReport, downloadPdfReport } from '../lib/api';

export const ReportsConsole: React.FC = () => {
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
      setError(err.message || 'Failed to load MongoDB saved reports.');
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
    <div className="space-y-6">
      {/* Header bar */}
      <div className="rounded-lg border border-[#333A45] bg-[#12151A] p-3 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-1.5 text-[#565D68]">
          <span className="text-[#4FD8C4] font-bold">$</span>
          <span className="text-[#E7EAEE] font-semibold">reports --all</span>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          className="rounded border border-[#333A45] bg-[#191D24] px-3 py-1 text-[#4FD8C4] hover:bg-[#262B33] transition-all cursor-pointer text-[11px]"
        >
          {loading ? 'Fetching...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-4 font-mono text-xs text-[#8B93A1]">
          <span>Fetching persisted audit documents from MongoDB Atlas...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-4 font-mono text-xs text-[#F87171]">
          <span>{error}</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-[#262B33] bg-[#12151A] p-8 text-center font-mono text-xs text-[#565D68] italic">
          No permanent reports saved to MongoDB Atlas yet. Run an audit and click "Save Report to Database".
        </div>
      ) : (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden">
          <div className="bg-[#191D24] p-4 border-b border-[#262B33] font-mono text-xs text-[#565D68] uppercase tracking-wider font-semibold">
            Archived Audit Documents ({reports.length})
          </div>

          <div className="divide-y divide-[#262B33]">
            {reports.map((report) => (
              <div key={report.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#4FD8C4] font-semibold">{report.id}</span>
                    <span className="text-[#8B93A1]">({report.savedAt ? new Date(report.savedAt).toLocaleDateString() : 'N/A'})</span>
                  </div>
                  <div className="text-[#E7EAEE] truncate max-w-sm">{report.url}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-[#E7EAEE]">{report.overallScore} / 100</span>
                  <button
                    onClick={() => downloadPdfReport(report.id)}
                    className="rounded border border-[#4FD8C4]/30 bg-[#4FD8C4]/10 px-2.5 py-1 text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all text-[11px] cursor-pointer"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="text-[#565D68] hover:text-[#F87171] transition-colors cursor-pointer text-[11px]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
