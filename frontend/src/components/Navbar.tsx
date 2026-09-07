import React from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  MapPin, 
  Search, 
  Copy, 
  Building2, 
  Sliders, 
  UploadCloud, 
  Bot, 
  RefreshCw, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { DashboardSummary } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  summary: DashboardSummary | null;
  onReAnalyze: () => void;
  onResetDemo: () => void;
  isAnalyzing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  summary,
  onReAnalyze,
  onResetDemo,
  isAnalyzing
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'investigation', label: 'Investigation Studio', icon: Search },
    { id: 'map', label: 'Geographic Risk Map', icon: MapPin },
    { id: 'duplicates', label: 'Duplicate Detection', icon: Copy, badge: summary?.duplicate_candidates_count },
    { id: 'agencies', label: 'Agency Analytics', icon: Building2 },
    { id: 'config', label: 'Risk Rules & Config', icon: Sliders },
    { id: 'upload', label: 'Data Ingestion & Quality', icon: UploadCloud },
    { id: 'assistant', label: 'Sentinel Copilot', icon: Bot, highlight: true }
  ];

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-white">MPLAD SENTINEL</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  SIH 2026 • PS 26102
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hidden sm:inline-block">
                  Synthetic Demo Dataset
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">AI-Powered Risk Intelligence & Governance Decision Support</p>
            </div>
          </div>

          {/* Right Action Center */}
          <div className="flex items-center gap-3">
            {summary && (
              <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span><strong>{summary.total_projects}</strong> Works</span>
                </div>
                <div className="w-px h-3 bg-slate-700" />
                <div className="flex items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span><strong>{summary.high_critical_count}</strong> High Risk</span>
                </div>
                <div className="w-px h-3 bg-slate-700" />
                <span className="text-slate-400 text-[11px]">Integrity: <strong>{summary.data_quality.data_integrity_score_pct}%</strong></span>
              </div>
            )}

            <button
              onClick={onReAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold transition disabled:opacity-50"
              title="Re-run analytical feature engineering and peer benchmarking"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isAnalyzing ? 'Analyzing...' : 'Re-analyze'}</span>
            </button>

            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
              title="Restore standard seeded demo dataset"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-1 py-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-teal-300 border border-slate-700 shadow-sm font-semibold'
                    : tab.highlight
                    ? 'text-cyan-300 hover:bg-slate-900/80 hover:text-cyan-200'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : tab.highlight ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {tab.badge}
                  </span>
                )}
                {tab.highlight && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
