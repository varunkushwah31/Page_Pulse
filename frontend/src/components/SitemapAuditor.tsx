import React, { useState } from 'react';
import { Server, Loader2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { SitemapAuditResponse } from '../types';
import { auditSitemap } from '../lib/api';

export const SitemapAuditor: React.FC = () => {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [maxUrls, setMaxUrls] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SitemapAuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSitemapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sitemapUrl.trim()) return;

    setError(null);
    setLoading(true);
    try {
      const res = await auditSitemap(sitemapUrl, maxUrls);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Sitemap audit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Server className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">Sitemap XML Virtual Threads Crawler</CardTitle>
              <p className="text-xs text-slate-400">Audit entire domain structures concurrently using Java Virtual Threads.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSitemapSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              placeholder="Enter sitemap URL (e.g. https://example.com/sitemap.xml)..."
              value={sitemapUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSitemapUrl(e.target.value)}
              className="h-11 border-slate-800 bg-slate-950 text-white placeholder:text-slate-600 focus-visible:ring-purple-500 text-sm"
            />
            <Input
              type="number"
              min="1"
              max="50"
              value={maxUrls}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxUrls(parseInt(e.target.value) || 10)}
              className="h-11 w-full sm:w-28 border-slate-800 bg-slate-950 text-white text-sm"
            />
            <Button
              type="submit"
              disabled={loading || !sitemapUrl.trim()}
              className="h-11 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 shadow-md shadow-purple-600/30 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  Audit Sitemap
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400">
              ⚠️ {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-800 bg-slate-900/60 p-4">
              <span className="text-xs font-medium text-slate-400">Sitemap URL</span>
              <p className="mt-1 text-sm font-semibold text-white truncate">{result.sitemapUrl}</p>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60 p-4">
              <span className="text-xs font-medium text-slate-400">Total URLs Audited</span>
              <p className="mt-1 text-2xl font-bold text-purple-400">{result.totalUrlsAudited}</p>
            </Card>
            <Card className="border-slate-800 bg-slate-900/60 p-4">
              <span className="text-xs font-medium text-slate-400">Average Domain Score</span>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{result.averageOverallScore} / 100</p>
            </Card>
          </div>

          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">Concurrent Virtual Thread Audit Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="border-slate-800">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">URL</TableHead>
                    <TableHead className="text-slate-400 text-center">Status</TableHead>
                    <TableHead className="text-slate-400 text-center">Latency</TableHead>
                    <TableHead className="text-slate-400 text-center">Overall Score</TableHead>
                    <TableHead className="text-slate-400 text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.childAudits?.map((child, idx) => (
                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-900">
                      <TableCell className="font-mono text-xs text-slate-300 max-w-xs truncate">{child.url}</TableCell>
                      <TableCell className="text-center text-xs">
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          {child.httpStatus} OK
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-400">{child.responseTimeMs} ms</TableCell>
                      <TableCell className="text-center text-xs font-bold text-white">
                        {child.scores?.overallScore} / 100
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                          {child.scores?.healthGrade}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
