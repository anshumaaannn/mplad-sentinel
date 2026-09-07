import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './pages/DashboardView';
import { InvestigationView } from './pages/InvestigationView';
import { GeographicMapView } from './pages/GeographicMapView';
import { DuplicateHubView } from './pages/DuplicateHubView';
import { AgencyAnalyticsView } from './pages/AgencyAnalyticsView';
import { ConfigStudioView } from './pages/ConfigStudioView';
import { DataQualityUploadView } from './pages/DataQualityUploadView';
import { AssistantCopilotView } from './pages/AssistantCopilotView';
import { DashboardSummary } from './types';
import { apiClient } from './services/api';
import { ShieldCheck, Info, Sparkles, CheckCircle2 } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('DEMO-001');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      const data = await apiClient.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch dashboard summary:', err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveTab('investigation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const updatedSummary = await apiClient.reAnalyze();
      setSummary(updatedSummary);
      setNotification('Risk intelligence analysis successfully recomputed across entire dataset.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Re-analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetDemo = async () => {
    setIsAnalyzing(true);
    try {
      const updatedSummary = await apiClient.resetDemo();
      setSummary(updatedSummary);
      setSelectedProjectId('DEMO-001');
      setNotification('Dataset restored to default Smart India Hackathon 2026 seeded benchmark anomalies (DEMO-001 to DEMO-006).');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summary={summary}
        onReAnalyze={handleReAnalyze}
        onResetDemo={handleResetDemo}
        isAnalyzing={isAnalyzing}
      />

      {/* Temporary Toast Banner */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/50 text-xs text-teal-200 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 w-full">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            onSelectProject={handleSelectProject}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'investigation' && (
          <InvestigationView
            projectId={selectedProjectId}
            onSelectProject={(id) => setSelectedProjectId(id)}
          />
        )}

        {activeTab === 'map' && (
          <GeographicMapView
            onSelectProject={handleSelectProject}
          />
        )}

        {activeTab === 'duplicates' && (
          <DuplicateHubView
            onSelectProject={handleSelectProject}
          />
        )}

        {activeTab === 'agencies' && (
          <AgencyAnalyticsView />
        )}

        {activeTab === 'config' && (
          <ConfigStudioView
            onConfigSaved={fetchSummary}
          />
        )}

        {activeTab === 'upload' && (
          <DataQualityUploadView
            summary={summary}
            onRefresh={fetchSummary}
          />
        )}

        {activeTab === 'assistant' && (
          <AssistantCopilotView
            onSelectProject={handleSelectProject}
          />
        )}
      </main>

      {/* Footer & Disclaimer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-extrabold text-slate-300">MPLAD SENTINEL</span>
              <span>•</span>
              <span className="text-teal-400 font-semibold">SIH 2026 Problem Statement PS 26102</span>
            </div>
            <p className="text-[11px] text-slate-500">
              AI-Powered Risk Intelligence, Anomaly Detection & Decision-Support System for MPLADS Implementation
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 max-w-lg leading-tight text-center md:text-left">
            <strong className="text-slate-300">Governance & Decision-Support Policy:</strong> Algorithmic scores reflect statistical risk indicators and deviation signals requiring field verification. Anomaly alerts assist supervisory officers and do not constitute definitive findings of non-compliance.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
