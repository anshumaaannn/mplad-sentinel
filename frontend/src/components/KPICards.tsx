import React from 'react';
import { 
  FolderKanban, 
  AlertOctagon, 
  Copy, 
  ClockAlert, 
  Coins, 
  TrendingDown 
} from 'lucide-react';
import { DashboardSummary } from '../types';

interface KPICardsProps {
  summary: DashboardSummary | null;
  onFilterClick?: (filterType: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({ summary, onFilterClick }) => {
  if (!summary) return null;

  const sanctionedCrores = (summary.total_sanctioned_amount / 10000000).toFixed(2);
  const expCrores = (summary.total_actual_expenditure / 10000000).toFixed(2);
  const utilizationPct = Math.round((summary.total_actual_expenditure / summary.total_sanctioned_amount) * 100);

  const kpis = [
    {
      id: 'all',
      title: 'Monitored Works',
      value: summary.total_projects,
      subtitle: `₹${sanctionedCrores} Cr Sanctioned • ₹${expCrores} Cr Spent (${utilizationPct}%)`,
      icon: FolderKanban,
      color: 'from-blue-600/20 to-cyan-600/10',
      border: 'border-blue-500/30',
      textColor: 'text-blue-400',
      badge: '100% Ingested'
    },
    {
      id: 'high_risk',
      title: 'High / Critical Risk',
      value: summary.high_critical_count,
      subtitle: `${summary.risk_distribution.critical} Critical • ${summary.risk_distribution.high} High priority works`,
      icon: AlertOctagon,
      color: 'from-rose-600/20 to-red-600/10',
      border: 'border-rose-500/40',
      textColor: 'text-rose-400',
      badge: 'Requires Verification'
    },
    {
      id: 'duplicates',
      title: 'Duplicate Scope Pairs',
      value: summary.duplicate_candidates_count,
      subtitle: 'Semantically similar & geo-proximate candidate works',
      icon: Copy,
      color: 'from-amber-600/20 to-yellow-600/10',
      border: 'border-amber-500/40',
      textColor: 'text-amber-400',
      badge: 'NLP & GIS Matrix'
    },
    {
      id: 'delay_risk',
      title: 'Severe Timeline Delays',
      value: summary.delay_risk_count,
      subtitle: 'Works extending significantly beyond peer group median',
      icon: ClockAlert,
      color: 'from-orange-600/20 to-amber-600/10',
      border: 'border-orange-500/40',
      textColor: 'text-orange-400',
      badge: '> 60d Overdue'
    },
    {
      id: 'progress_mismatch',
      title: 'Fund vs Progress Gap',
      value: summary.progress_mismatch_count,
      subtitle: 'Disbursement > 30% ahead of verified ground completion',
      icon: TrendingDown,
      color: 'from-purple-600/20 to-indigo-600/10',
      border: 'border-purple-500/40',
      textColor: 'text-purple-400',
      badge: 'Audit Alert'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.id}
            onClick={() => onFilterClick && onFilterClick(kpi.id)}
            className={`bg-gradient-to-br ${kpi.color} bg-slate-900/90 rounded-xl p-4 border ${kpi.border} shadow-lg transition-all hover:scale-[1.02] cursor-pointer relative overflow-hidden`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{kpi.title}</p>
                <p className={`text-2xl font-black mt-1 ${kpi.textColor}`}>{kpi.value}</p>
              </div>
              <div className={`p-2 rounded-lg bg-slate-800/80 border ${kpi.border}`}>
                <Icon className={`w-5 h-5 ${kpi.textColor}`} />
              </div>
            </div>
            
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]" title={kpi.subtitle}>
                {kpi.subtitle}
              </p>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {kpi.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
