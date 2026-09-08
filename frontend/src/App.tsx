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

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('investigation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReanalyze = async () => {
    setIsAnalyzing(true);
    try {
      await apiClient.reAnalyze();
      await fetchSummary();
      setNotification('Risk intelligence scoring recalculation completed across portfolio.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Re-analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetDemo = async () => {
    setIsAnalyzing(true);
    try {
      await apiClient.resetDemo();
      await fetchSummary();
      setNotification('Dataset restored to standardized SIH benchmark demonstration data.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summary={summary}
        onReAnalyze={handleReanalyze}
        onResetDemo={handleResetDemo}
        isAnalyzing={isAnalyzing}
      />

      {/* Global Notification Banner */}
      {notification && (
        <div className="bg-teal-500/10 border-b border-teal-500/30 px-4 py-2 text-xs text-teal-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto flex items-center gap-2 w-full">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{notification}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold ml-auto"
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
            onSelectProject={(id: string) => setSelectedProjectId(id)}
            onOpenDuplicatePair={(pA: string) => {
              setSelectedProjectId(pA);
              setActiveTab('duplicates');
            }}
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

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MPLAD Sentinel &bull; PS 26102 AI-Powered Risk Intelligence Platform &bull; SIH 2026</span>
          <span className="text-[11px] text-slate-400">
            Operating Philosophy: <strong className="text-teal-400 font-normal">Detect &rarr; Assess &rarr; Explain &rarr; Prioritize &rarr; Investigate</strong> (Risk &ne; Guilt)
          </span>
        </div>
      </footer>
    </div>
  );
}
export default App;
