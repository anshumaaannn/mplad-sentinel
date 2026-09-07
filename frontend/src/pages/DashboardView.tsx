import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { Project, DashboardSummary, RiskLevel } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { KPICards } from '../components/KPICards';
import { apiClient } from '../services/api';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  onSelectProject: (projectId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  onSelectProject,
  onNavigateTab
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('risk_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, trendsRes] = await Promise.all([
        apiClient.getProjects({ limit: 300 }),
        apiClient.getTrends()
      ]);
      setProjects(projRes.data);
      setTrends(trendsRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [summary]);

  // Derived filter options
  const uniqueStates = ['ALL', ...Array.from(new Set(projects.map(p => p.state))).sort()];
  const uniqueSectors = ['ALL', ...Array.from(new Set(projects.map(p => p.sector))).sort()];

  // Filtering
  const filteredProjects = projects.filter(p => {
    if (selectedState !== 'ALL' && p.state !== selectedState) return false;
    if (selectedSector !== 'ALL' && p.sector !== selectedSector) return false;
    if (selectedRiskLevel !== 'ALL' && p.risk_level !== selectedRiskLevel) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = p.project_id.toLowerCase().includes(q) ||
        p.work_name.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.implementing_agency.toLowerCase().includes(q) ||
        p.mp_name.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sorting
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let valA: any = (a as any)[sortBy];
    let valB: any = (b as any)[sortBy];

    if (typeof valA === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    valA = Number(valA) || 0;
    valB = Number(valB) || 0;
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  const totalPages = Math.ceil(sortedProjects.length / limit);
  const paginatedProjects = sortedProjects.slice((page - 1) * limit, page * limit);

  // Pie chart data
  const pieData = summary ? [
    { name: 'Low Risk', value: summary.risk_distribution.low, color: '#10B981' },
    { name: 'Moderate Risk', value: summary.risk_distribution.moderate, color: '#F59E0B' },
    { name: 'High Risk', value: summary.risk_distribution.high, color: '#F97316' },
    { name: 'Critical Risk', value: summary.risk_distribution.critical, color: '#EF4444' }
  ] : [];

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top KPI row */}
      <KPICards
        summary={summary}
        onFilterClick={(type) => {
          if (type === 'high_risk') setSelectedRiskLevel('CRITICAL');
          else if (type === 'all') { setSelectedRiskLevel('ALL'); setSelectedState('ALL'); }
          else if (type === 'duplicates') onNavigateTab('duplicates');
          else if (type === 'delay_risk') setSearch('delay');
        }}
      />

      {/* Quick Judge Demo Shortcuts Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>SIH Judge Demo Cases:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSelectProject('DEMO-001')}
            className="text-xs px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <strong>DEMO-001</strong> (Cost Outlier +275%)
          </button>
          <button
            onClick={() => onSelectProject('DEMO-002')}
            className="text-xs px-2.5 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 transition flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <strong>DEMO-002</strong> (Severe 900d Delay)
          </button>
          <button
            onClick={() => onSelectProject('DEMO-003')}
            className="text-xs px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <strong>DEMO-003</strong> (96% Exp vs 30% Progress)
          </button>
          <button
            onClick={() => onSelectProject('DEMO-004')}
            className="text-xs px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <strong>DEMO-004 & 005</strong> (93% Duplicate Match)
          </button>
          <button
            onClick={() => onSelectProject('DEMO-006')}
            className="text-xs px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <strong>DEMO-006</strong> (Agency Systemic Delay)
          </button>
        </div>
      </div>

      {/* Analytics Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Donut */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Risk Distribution</h3>
              <p className="text-xs text-slate-400">Algorithmic classification of monitored portfolio</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
              Avg Score: {summary?.avg_risk_score}/100
            </span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-800/80 text-xs">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center justify-between px-2 py-1 rounded bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-100">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Risk Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Sector Portfolio & Risk Share</h3>
              <p className="text-xs text-slate-400">Total works vs high-risk works flagged per sector</p>
            </div>
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              <span>View Map</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="h-64">
            {trends?.sector_breakdown && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.sector_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="sector" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="count" name="Total Works" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="high_risk" name="High Risk Works" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Projects Table Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        {/* Table Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Prioritized Works Catalog</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {filteredProjects.length} Filtered / {projects.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-400">Sorted by multi-signal risk index for administrative verification</p>
          </div>

          {/* Filter bars */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search ID, work, district, MP..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => { setSelectedState(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {uniqueStates.map(st => (
                <option key={st} value={st}>{st === 'ALL' ? 'All States' : st}</option>
              ))}
            </select>

            {/* Sector Filter */}
            <select
              value={selectedSector}
              onChange={(e) => { setSelectedSector(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {uniqueSectors.map(sec => (
                <option key={sec} value={sec}>{sec === 'ALL' ? 'All Sectors' : sec}</option>
              ))}
            </select>

            {/* Risk Level Filter */}
            <select
              value={selectedRiskLevel}
              onChange={(e) => { setSelectedRiskLevel(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-semibold"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">🔴 Critical (75-100)</option>
              <option value="HIGH">🟠 High (50-74)</option>
              <option value="MODERATE">🟡 Moderate (25-49)</option>
              <option value="LOW">🟢 Low (0-24)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort('project_id')}>
                  <div className="flex items-center gap-1">Project ID <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 px-3">Work Name & Scope</th>
                <th className="py-3 px-3">Location & MP</th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort('sanctioned_amount')}>
                  <div className="flex items-center gap-1">Sanctioned <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 px-3">Exp / Progress</th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort('risk_score')}>
                  <div className="flex items-center gap-1">Risk Score <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 px-3">Primary Risk Indicator</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">Loading risk intelligence catalog...</td>
                </tr>
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">No projects match the specified filter criteria.</td>
                </tr>
              ) : (
                paginatedProjects.map(project => {
                  const expPct = Math.round((project.actual_expenditure / project.sanctioned_amount) * 100);
                  const isDemoSpecial = project.project_id.startsWith('DEMO-');

                  return (
                    <tr
                      key={project.project_id}
                      className={`hover:bg-slate-800/60 transition ${
                        project.risk_level === 'CRITICAL' ? 'bg-rose-950/10' :
                        project.risk_level === 'HIGH' ? 'bg-orange-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isDemoSpecial && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                          <span>{project.project_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-[280px]">
                        <p className="font-medium text-slate-100 truncate" title={project.work_name}>
                          {project.work_name}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="text-teal-400 font-semibold">{project.work_type}</span>
                          <span>•</span>
                          <span>{project.implementing_agency}</span>
                        </p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-200">{project.district}, {project.state}</p>
                        <p className="text-[11px] text-slate-400">{project.mp_name}</p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        <p className="font-bold text-slate-100">₹{(project.sanctioned_amount / 100000).toFixed(1)} L</p>
                        <p className="text-[10px] text-slate-400">Est: ₹{(project.estimated_cost / 100000).toFixed(1)} L</p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${project.physical_progress_percentage === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                              style={{ width: `${project.physical_progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-slate-200">
                            {project.physical_progress_percentage}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Exp: ₹{(project.actual_expenditure / 100000).toFixed(1)} L ({expPct}%)
                        </p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <RiskBadge level={project.risk_level} score={project.risk_score} size="sm" />
                      </td>
                      <td className="py-3 px-3 max-w-[240px]">
                        <p className="text-[11px] text-slate-300 font-medium truncate" title={project.primary_reason}>
                          {project.primary_reason}
                        </p>
                        {project.duplicate_candidates.length > 0 && (
                          <span className="inline-block mt-0.5 text-[10px] text-amber-300 font-semibold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">
                            Duplicate Candidate ({project.duplicate_candidates[0].semantic_similarity}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectProject(project.project_id)}
                          className="px-2.5 py-1 rounded bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 border border-teal-500/40 text-xs font-semibold transition"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({sortedProjects.length} works)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pNum = i + 1;
                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-7 h-7 rounded text-xs font-bold ${
                      page === pNum ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
