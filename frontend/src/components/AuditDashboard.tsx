import React, { useState } from 'react';
import {
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  Zap,
  BookmarkPlus,
  Check,
  Copy,
  Download,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { AuditResponse, HealthGrade } from '../types';
import { saveReportToMongo, getPdfDownloadUrl } from '../lib/api';

interface AuditDashboardProps {
  audit: AuditResponse;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({ audit }) => {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSaveToMongo = async () => {
    setSaving(true);
    try {
      const doc = await saveReportToMongo(audit.id);
      setSavedId(doc.id);
    } catch (err) {
      console.error('Failed to save report to MongoDB:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(audit, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scores = audit.scores || {
    seoScore: 0,
    contentScore: 0,
    accessibilityScore: 0,
    performanceScore: 0,
    overallScore: 0,
    healthGrade: 'NEEDS_IMPROVEMENT' as HealthGrade,
  };

  const getGradeStyle = (grade: HealthGrade) => {
    switch (grade) {
      case 'EXCELLENT':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10' };
      case 'GOOD':
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/10' };
      case 'NEEDS_IMPROVEMENT':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/10' };
      case 'POOR':
        return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-red-500/10' };
    }
  };

  const gradeStyle = getGradeStyle(scores.healthGrade);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Globe className="size-5 text-blue-400 shrink-0" />
            <h2 className="text-xl font-bold text-white tracking-tight break-all">{audit.url}</h2>
            {audit.cached && (
              <Badge variant="secondary" className="bg-slate-800 text-xs font-semibold text-slate-300">
                ⚡ Cached Result
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Clock className="size-3.5 text-blue-400" /> {audit.responseTimeMs} ms
            </span>
            <span>HTTP Status: <strong className="text-emerald-400 font-semibold">{audit.httpStatus} OK</strong></span>
            <span>Domain: <strong className="text-slate-200">{audit.domain || 'N/A'}</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger>
              <Button
                onClick={handleCopyJson}
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{copied ? 'Copied JSON!' : 'Copy raw JSON report'}</p>
            </TooltipContent>
          </Tooltip>

          {savedId && (
            <a
              href={getPdfDownloadUrl(savedId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 active:scale-95 transition-all"
            >
              <Download className="size-4" /> Export PDF
            </a>
          )}

          <Button
            onClick={handleSaveToMongo}
            disabled={saving || !!savedId}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            {savedId ? (
              <>
                <Check className="mr-1.5 size-4" />
                Saved to Cloud
              </>
            ) : (
              <>
                <BookmarkPlus className="mr-1.5 size-4" />
                Save Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Score Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Overall Health Score Gauge */}
        <Card className={`md:col-span-2 border ${gradeStyle.border} ${gradeStyle.bg} bg-slate-900/90 shadow-2xl ${gradeStyle.glow}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Overall Audit Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className={`text-6xl sm:text-7xl font-black tracking-tight ${gradeStyle.text}`}>
                {scores.overallScore}
              </span>
              <Badge className={`${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.border} text-sm font-extrabold px-3.5 py-1.5 shadow-md`}>
                {scores.healthGrade}
              </Badge>
            </div>
            <Progress value={scores.overallScore} className="h-3 bg-slate-950 rounded-full" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Weighted calculation combining SEO structure, content density, accessibility standards, and response time metrics.
            </p>
          </CardContent>
        </Card>

        {/* 4 Sub-score Cards */}
        <div className="md:col-span-3 grid grid-cols-2 gap-4">
          <SubScoreCard title="SEO Score" score={scores.seoScore} icon={Globe} color="text-blue-400" />
          <SubScoreCard title="Content Score" score={scores.contentScore} icon={FileText} color="text-purple-400" />
          <SubScoreCard title="Accessibility" score={scores.accessibilityScore} icon={Eye} color="text-emerald-400" />
          <SubScoreCard title="Performance" score={scores.performanceScore} icon={Zap} color="text-amber-400" />
        </div>
      </div>

      {/* Deep-Dive Metric Tabs */}
      <Tabs defaultValue="seo" className="w-full">
        <TabsList className="grid grid-cols-4 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <TabsTrigger value="seo" className="text-xs sm:text-sm font-semibold transition-all">SEO Metrics</TabsTrigger>
          <TabsTrigger value="content" className="text-xs sm:text-sm font-semibold transition-all">Content Metrics</TabsTrigger>
          <TabsTrigger value="accessibility" className="text-xs sm:text-sm font-semibold transition-all">Accessibility</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs sm:text-sm font-semibold transition-all">Performance</TabsTrigger>
        </TabsList>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard label="Page Title" value={audit.seoMetrics?.pageTitle || 'Missing'} status={audit.seoMetrics?.hasTitle} />
            <MetricCard label="Meta Description" value={audit.seoMetrics?.metaDescription || 'Missing'} status={audit.seoMetrics?.hasMetaDescription} />
            <MetricCard label="Robots Directive" value={audit.seoMetrics?.robotsDirective || 'Default (index, follow)'} status={audit.seoMetrics?.indexable} />
            <MetricCard label="Canonical Link" value={audit.seoMetrics?.canonicalUrl || 'Not specified'} status={!!audit.seoMetrics?.canonicalUrl} />
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatBox label="Total Word Count" value={audit.contentMetrics?.wordCount || 0} unit="words" />
            <StatBox label="Estimated Reading Time" value={audit.contentMetrics?.estimatedReadingTimeMinutes || 0} unit="min" />
            <StatBox label="Text to HTML Ratio" value={`${audit.contentMetrics?.textToHtmlRatioPercentage || 0}%`} unit="ratio" />
          </div>
          <Card className="border-slate-800 bg-slate-900/60 rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-white">Heading Structure Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-3 text-center">
                {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => (
                  <div key={tag} className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
                    <span className="block text-xs uppercase text-slate-500 font-extrabold">{tag}</span>
                    <span className="text-lg font-black text-white">
                      {audit.contentMetrics?.headingCounts?.[tag] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatBox label="Total Images" value={audit.accessibilityMetrics?.totalImageCount || 0} unit="elements" />
            <StatBox label="Images Missing Alt" value={audit.accessibilityMetrics?.imagesMissingAltCount || 0} unit="warnings" isWarning={audit.accessibilityMetrics?.imagesMissingAltCount > 0} />
            <StatBox label="HTML Lang Attribute" value={audit.accessibilityMetrics?.htmlLangValue || 'Missing'} unit="lang" isWarning={!audit.accessibilityMetrics?.hasHtmlLangAttribute} />
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatBox label="Response Latency" value={audit.performanceMetrics?.responseTimeMs || 0} unit="ms" />
            <StatBox label="SSL Encryption" value={audit.performanceMetrics?.secureSsl ? 'Secured (HTTPS)' : 'Insecure'} unit="security" isWarning={!audit.performanceMetrics?.secureSsl} />
            <StatBox label="Content-Type" value={audit.performanceMetrics?.contentType || 'text/html'} unit="mime" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function SubScoreCard({ title, score, icon: Icon, color }: Readonly<{ title: string; score: number; icon: any; color: string }>) {
  return (
    <Card className="border-slate-800 bg-slate-900/70 p-4 hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <Icon className={`size-4 ${color}`} />
      </div>
      <div className="mt-2.5 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-white">{score}</span>
        <span className="text-xs text-slate-500 font-medium">/ 100</span>
      </div>
      <Progress value={score} className="mt-2.5 h-1.5 bg-slate-950 rounded-full" />
    </Card>
  );
}

function MetricCard({ label, value, status }: Readonly<{ label: string; value: string; status?: boolean }>) {
  return (
    <Card className="border-slate-800 bg-slate-900/70 p-4 hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400">{label}</span>
          <p className="text-sm font-semibold text-white break-all leading-snug">{value}</p>
        </div>
        {status !== undefined && (
          status ? <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
        )}
      </div>
    </Card>
  );
}

function StatBox({ label, value, unit, isWarning }: Readonly<{ label: string; value: any; unit: string; isWarning?: boolean }>) {
  return (
    <Card className={`border-slate-800 bg-slate-900/70 p-4 ${isWarning ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <div className="mt-2 flex items-baseline justify-between">
        <span className={`text-3xl font-black ${isWarning ? 'text-amber-400' : 'text-white'}`}>{value}</span>
        <span className="text-xs font-medium text-slate-500">{unit}</span>
      </div>
    </Card>
  );
}
