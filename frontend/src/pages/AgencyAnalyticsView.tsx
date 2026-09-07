import React, { useState, useEffect } from 'react';
import { Building2, AlertTriangle, Clock, TrendingUp, CheckCircle2, Search, ArrowUpDown } from 'lucide-react';
import { AgencyMetrics } from '../types';
import { apiClient } from '../services/api';

export const AgencyAnalyticsView: React.FC = () => {
  const [agencies, setAgencies] = useState<AgencyMetrics[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgencies = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getAgencies();
        setAgencies(data);
      } catch (err) {
        console.error('Failed to load agencies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgencies();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Analyzing Implementing Agency Portfolios...</p>
      </div>
    );
  }

  const filteredAgencies = agencies.filter(a =>
    a.agency_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Implementing Agency Performance & Risk Profiles
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical portfolio profiling of executing agencies across timeline adherence and cost variation
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search implementing agency..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Agency Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAgencies.map((agency) => {
          const isHighRisk = agency.risk_profile === 'HIGH' || agency.risk_profile === 'ELEVATED';

          return (
            <div
              key={agency.agency_name}
              className={`bg-slate-900/90 border rounded-xl p-5 shadow-xl space-y-4 transition ${
                agency.risk_profile === 'HIGH'
                  ? 'border-rose-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950/20'
                  : agency.risk_profile === 'ELEVATED'
                  ? 'border-orange-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-orange-950/20'
                  : 'border-slate-800'
              }`}
            >
              {/* Agency Name & Risk Profile */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 leading-snug">
                    {agency.agency_name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {agency.total_projects} Projects • ₹{(agency.total_sanctioned_amount / 10000000).toFixed(2)} Cr Sanctioned
                  </p>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  agency.risk_profile === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : agency.risk_profile === 'ELEVATED'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {agency.risk_profile} PROFILE
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Delay Rate</span>
                  <span className={`text-sm font-mono font-bold mt-0.5 block ${
                    agency.delay_rate_pct > 40 ? 'text-rose-400' : 'text-slate-200'
                  }`}>
                    {agency.delay_rate_pct}% ({agency.delayed_projects} works)
                  </span>
                  <span className="text-[10px] text-slate-500">Avg {agency.avg_delay_days}d delay</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Cost Overrun Index</span>
                  <span className={`text-sm font-mono font-bold mt-0.5 block ${
                    agency.avg_cost_overrun_pct > 10 ? 'text-orange-400' : 'text-slate-200'
                  }`}>
                    {agency.avg_cost_overrun_pct > 0 ? `+${agency.avg_cost_overrun_pct}%` : `${agency.avg_cost_overrun_pct}%`}
                  </span>
                  <span className="text-[10px] text-slate-500">vs Sanctioned</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Completion Rate</span>
                  <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">
                    {agency.completion_rate_pct}%
                  </span>
                  <span className="text-[10px] text-slate-500">{agency.completed_projects} / {agency.total_projects} Done</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">High Risk Share</span>
                  <span className={`text-sm font-mono font-bold mt-0.5 block ${
                    agency.high_risk_projects > 0 ? 'text-rose-400' : 'text-slate-200'
                  }`}>
                    {agency.high_risk_projects} works ({agency.high_risk_rate_pct}%)
                  </span>
                  <span className="text-[10px] text-slate-500">Prioritized</span>
                </div>
              </div>

              {/* Key Observations */}
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 text-[11px] space-y-1">
                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                  Portfolio Audit Observations:
                </span>
                {agency.key_observations.map((obs, i) => (
                  <p key={i} className="text-slate-300 flex items-start gap-1.5">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>{obs}</span>
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
