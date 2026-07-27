import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PageHeaderNav } from './components/PageHeaderNav';
import { SingleAuditPage } from './pages/SingleAuditPage';
import { SitemapCrawlerPage } from './pages/SitemapCrawlerPage';
import { BatchAuditorPage } from './pages/BatchAuditorPage';
import { ScheduledAuditsPage } from './pages/ScheduledAuditsPage';
import { CompetitorComparePage } from './pages/CompetitorComparePage';
import { DomainTrendsPage } from './pages/DomainTrendsPage';
import { ReportsArchivePage } from './pages/ReportsArchivePage';
import { PlatformStatsPage } from './pages/PlatformStatsPage';
import { AuthPage } from './pages/AuthPage';
import { Footer } from './components/Footer';
import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden bg-grid-pattern pb-12">
          {/* 2px Scan-rail Signature Element */}
          <div className="fixed top-0 left-0 right-0 h-[2px] bg-card z-50 overflow-hidden">
            <div className="absolute top-0 bottom-0 bg-primary shadow-[0_0_8px_var(--primary)] animate-scan-rail"></div>
          </div>

          <div className="mx-auto max-w-[720px] px-4 py-12 space-y-8">
            {/* Header Title */}
            <header className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-mono font-semibold tracking-tight text-foreground">
                  Page Pulse <span className="text-muted-foreground text-xs font-normal">v2.0 MPA</span>
                </h1>
                <span className="text-[11px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                  Multi-Page Diagnostic Instrument
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                Automated DOM, SEO, and performance metric inspector.
              </p>
            </header>

            {/* Top Navigation Bar */}
            <PageHeaderNav />

            {/* Multi-Page Application Routes */}
            <main aria-live="polite" className="space-y-6">
              <Routes>
                <Route path="/" element={<SingleAuditPage />} />
                <Route path="/audit" element={<SingleAuditPage />} />
                <Route path="/sitemap" element={<SitemapCrawlerPage />} />
                <Route path="/batch" element={<BatchAuditorPage />} />
                <Route path="/scheduled" element={<ScheduledAuditsPage />} />
                <Route path="/compare" element={<CompetitorComparePage />} />
                <Route path="/trend" element={<DomainTrendsPage />} />
                <Route path="/reports" element={<ReportsArchivePage />} />
                <Route path="/telemetry" element={<PlatformStatsPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Mandatory Footer Line */}
            <Footer />
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;