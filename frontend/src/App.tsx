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
import { LandingPage } from './pages/LandingPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { Footer } from './components/Footer';
import { AuthProvider } from './context/AuthContext';
import { SeoHead } from './components/SeoHead';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SeoHead />
        <div className="min-h-screen bg-[#0A0C0F] text-[#E7EAEE] font-sans relative overflow-x-hidden bg-grid-pattern pb-12">
          {/* 2px Scan-rail Signature Element (§8 DESIGN.md) */}
          <div className="fixed top-0 left-0 right-0 h-[2px] bg-[#12151A] z-50 overflow-hidden">
            <div className="absolute top-0 bottom-0 bg-[#4FD8C4] shadow-[0_0_8px_#4FD8C4] animate-scan-rail"></div>
          </div>

          {/* Sticky Navigation Bar */}
          <PageHeaderNav />

          {/* Main Application Container */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
            <main aria-live="polite">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/audit" element={<SingleAuditPage />} />
                <Route path="/sitemap" element={<SitemapCrawlerPage />} />
                <Route path="/batch" element={<BatchAuditorPage />} />
                <Route path="/scheduled" element={<ScheduledAuditsPage />} />
                <Route path="/compare" element={<CompetitorComparePage />} />
                <Route path="/trend" element={<DomainTrendsPage />} />
                <Route path="/reports" element={<ReportsArchivePage />} />
                <Route path="/telemetry" element={<PlatformStatsPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;