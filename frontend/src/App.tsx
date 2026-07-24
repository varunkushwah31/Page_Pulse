import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PageHeaderNav } from './components/PageHeaderNav';
import { SingleAuditPage } from './pages/SingleAuditPage';
import { SitemapCrawlerPage } from './pages/SitemapCrawlerPage';
import { CompetitorComparePage } from './pages/CompetitorComparePage';
import { DomainTrendsPage } from './pages/DomainTrendsPage';
import { ReportsArchivePage } from './pages/ReportsArchivePage';
import { PlatformStatsPage } from './pages/PlatformStatsPage';
import { Footer } from './components/Footer';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0A0C0F] text-[#E7EAEE] font-sans relative overflow-x-hidden bg-grid-pattern">
        {/* 2px Scan-rail Signature Element */}
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-[#12151A] z-50 overflow-hidden">
          <div className="absolute top-0 bottom-0 bg-[#4FD8C4] shadow-[0_0_8px_#4FD8C4] animate-scan-rail"></div>
        </div>

        <div className="mx-auto max-w-[720px] px-4 py-12 space-y-8">
          {/* Header Title */}
          <header className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-mono font-semibold tracking-tight text-[#E7EAEE]">
                Page Pulse <span className="text-[#8B93A1] text-xs font-normal">v2.0 MPA</span>
              </h1>
              <span className="text-[11px] font-mono text-[#565D68] uppercase tracking-wider">
                Multi-Page Diagnostic Instrument
              </span>
            </div>
            <p className="text-xs font-mono text-[#8B93A1]">
              Automated DOM, SEO, and performance metric inspector.
            </p>
          </header>

          {/* Multi-Page Navigation Header */}
          <PageHeaderNav />

          {/* Multi-Page Application Routes */}
          <main aria-live="polite" className="space-y-6">
            <Routes>
              <Route path="/" element={<SingleAuditPage />} />
              <Route path="/audit" element={<SingleAuditPage />} />
              <Route path="/sitemap" element={<SitemapCrawlerPage />} />
              <Route path="/compare" element={<CompetitorComparePage />} />
              <Route path="/trend" element={<DomainTrendsPage />} />
              <Route path="/reports" element={<ReportsArchivePage />} />
              <Route path="/telemetry" element={<PlatformStatsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Mandatory Footer Line */}
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
