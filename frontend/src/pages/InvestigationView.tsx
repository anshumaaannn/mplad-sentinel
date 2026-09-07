import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Calendar, 
  Coins, 
  MapPin, 
  User, 
  Building2, 
  Layers, 
  AlertOctagon, 
  TrendingUp, 
  Clock, 
  Copy, 
  CheckCircle2, 
  FileCheck, 
  ChevronRight,
  ExternalLink,
  Info,
  ArrowRight
} from 'lucide-react';
import { Project, AnomalyEvidence, DuplicateMatch } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { apiClient } from '../services/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface InvestigationViewProps {
  projectId: string;
  onSelectProject: (id: string) => void;
  onOpenDuplicatePair?: (pA: string, pB: string) => void;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  projectId,
  onSelectProject,
  onOpenDuplicatePair
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [proj, allRes] = await Promise.all([
          apiClient.getProjectById(projectId),
          apiClient.getProjects({ limit: 300 })
        ]);
        setProject(proj);
        setAllProjects(allRes.data);
      } catch (err) {
        console.error('Failed to load project details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Loading Risk Intelligence Dossier for {projectId}...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <AlertOctagon className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">Project Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">Unable to locate project record with ID "{projectId}".</p>
      </div>
    );
  }

  const expPct = Math.round((project.actual_expenditure / project.sanctioned_amount) * 100);
  const costDev = project.peer_benchmark?.cost_deviation_pct || 0;
  const peerMedian = project.peer_benchmark?.peer_cost_median || project.sanctioned_amount;

  const peerChartData = [
    { name: 'Peer Median', amount: Math.round(peerMedian / 100000), fill: '#0ea5e9' },
    { name: 'This Project', amount: Math.round((project.actual_expenditure > 0 ? project.actual_expenditure : project.sanctioned_amount) / 100000), fill: project.risk_score >= 50 ? '#f43f5e' : '#10b981' }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Project Selector & Breadcrumb */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-slate-500">Investigation Dossier</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-mono text-teal-400 font-bold">{project.project_id}</span>
          <span className="text-slate-500">({project.district}, {project.state})</span>
        </div>

        {/* Quick switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Jump to Case:</span>
          <select
            value={project.project_id}
            onChange={(e) => onSelectProject(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
          >
            <optgroup label="Special Demo Benchmark Anomalies">
              <option value="DEMO-001">DEMO-001 • CC Road (Cost Outlier +275%)</option>
              <option value="DEMO-002">DEMO-002 • Health Wing (Severe 900d Delay)</option>
              <option value="DEMO-003">DEMO-003 • Solar Lights (96% Exp / 30% Prog)</option>
              <option value="DEMO-004">DEMO-004 • Community Hall (Duplicate Pair A)</option>
              <option value="DEMO-005">DEMO-005 • Cultural Hall (Duplicate Pair B)</option>
              <option value="DEMO-006">DEMO-006 • Drainage System (Agency Overrun)</option>
            </optgroup>
            <optgroup label="All Projects">
              {allProjects.map(p => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_id} - {p.work_name.substring(0, 45)}... ({p.risk_score} pts)
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Main Project Dossier Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-slate-800 text-teal-400 font-bold border border-slate-700">
                {project.project_id}
              </span>
              <RiskBadge level={project.risk_level} score={project.risk_score} size="md" />
              <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                Status: {project.status}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 font-medium">
                {project.sector} • {project.work_type}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-100 leading-tight">
              {project.work_name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>{project.district}, {project.state} ({project.constituency})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>MP: <strong>{project.mp_name}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Agency: <strong>{project.implementing_agency}</strong></span>
              </div>
            </div>
          </div>

          {/* Large Overall Risk Score Ring */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/80 border border-slate-800 min-w-[180px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Risk Score Index</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className={`text-4xl font-black ${
                project.risk_score >= 75 ? 'text-rose-400' :
                project.risk_score >= 50 ? 'text-orange-400' :
                project.risk_score >= 25 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {project.risk_score}
              </span>
              <span className="text-sm text-slate-500 font-bold">/100</span>
            </div>
            <RiskBadge level={project.risk_level} size="sm" />
          </div>
        </div>

        {/* Quick Financial & Execution KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block mb-1">Sanctioned Amount</span>
            <span className="text-base font-bold font-mono text-slate-100">
              ₹{(project.sanctioned_amount / 100000).toFixed(2)} Lakh
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Est: ₹{(project.estimated_cost / 100000).toFixed(2)} L</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block mb-1">Actual Disbursed</span>
            <span className="text-base font-bold font-mono text-cyan-300">
              ₹{(project.actual_expenditure / 100000).toFixed(2)} Lakh
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Utilization: <strong>{expPct}%</strong></span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block mb-1">Physical Progress</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              {project.physical_progress_percentage}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Scope: {project.quantity} {project.unit}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block mb-1">Target Timeline</span>
            <span className="text-sm font-semibold text-slate-200">
              {project.expected_completion_date}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Sanctioned: {project.sanction_date}</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Risk Breakdown + Peer Benchmarking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Signal Breakdown Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Multi-Signal Risk Assessment</h3>
              <p className="text-xs text-slate-400">Contribution of independent analytical risk dimensions</p>
            </div>
            <span className="text-xs font-mono font-bold text-teal-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Total: {project.risk_score} pts
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {/* Financial Risk */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Financial Anomaly (Cost Overrun / Outlier)</span>
                <span className="font-mono font-bold text-rose-300">{project.risk_breakdown.financial_risk} / 25 pts</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(project.risk_breakdown.financial_risk / 25) * 100}%` }} />
              </div>
            </div>

            {/* Delay Risk */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Execution Delay (Timeline Deviation)</span>
                <span className="font-mono font-bold text-orange-300">{project.risk_breakdown.delay_risk} / 20 pts</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(project.risk_breakdown.delay_risk / 20) * 100}%` }} />
              </div>
            </div>

            {/* Progress Mismatch */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Progress / Expenditure Mismatch</span>
                <span className="font-mono font-bold text-purple-300">{project.risk_breakdown.progress_mismatch_risk} / 20 pts</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(project.risk_breakdown.progress_mismatch_risk / 20) * 100}%` }} />
              </div>
            </div>

            {/* Duplicate / Semantic */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Duplicate / Semantic Overlap</span>
                <span className="font-mono font-bold text-amber-300">{project.risk_breakdown.duplicate_risk} / 15 pts</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(project.risk_breakdown.duplicate_risk / 15) * 100}%` }} />
              </div>
            </div>

            {/* Geospatial Clustering */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Geospatial Density Clustering</span>
                <span className="font-mono font-bold text-blue-300">{project.risk_breakdown.geospatial_risk} / 10 pts</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(project.risk_breakdown.geospatial_risk / 10) * 100}%` }} />
              </div>
            </div>

            {/* Agency Behavioral */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Implementing Agency Historic Risk Index</span>
                <span className="font-mono font-bold text-cyan-300">{project.risk_breakdown.agency_risk} / 10 pts</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${(project.risk_breakdown.agency_risk / 10) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Peer Benchmarking Comparison Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Peer Benchmarking</h3>
              <p className="text-xs text-slate-400">Comparison against {project.peer_benchmark?.peer_count} peer works ({project.peer_benchmark?.peer_group_name})</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              costDev > 40 ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40' :
              costDev < -20 ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' :
              'bg-slate-800 text-slate-300'
            }`}>
              {costDev > 0 ? `+${costDev}%` : `${costDev}%`} vs Peer Median
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Project Value</span>
              <span className="text-sm font-bold font-mono text-slate-100 mt-1 block">
                ₹{((project.actual_expenditure > 0 ? project.actual_expenditure : project.sanctioned_amount) / 100000).toFixed(1)} L
              </span>
              <span className="text-[10px] text-slate-500">Observed</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Peer Group Median</span>
              <span className="text-sm font-bold font-mono text-cyan-300 mt-1 block">
                ₹{(peerMedian / 100000).toFixed(1)} Lakh
              </span>
              <span className="text-[10px] text-slate-500">n = {project.peer_benchmark?.peer_count} works</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Cost Percentile</span>
              <span className="text-sm font-bold font-mono text-amber-300 mt-1 block">
                {project.peer_benchmark?.cost_percentile}th %ile
              </span>
              <span className="text-[10px] text-slate-500">Cohort Ranking</span>
            </div>
          </div>

          <div className="h-40 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peerChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} unit=" L" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={85} />
                <Tooltip
                  formatter={(val: any) => [`₹${val} Lakh`, 'Cost']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* WHY FLAGGED? — AUDIT EVIDENCE & SIGNAL EXPLANATIONS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                Why Flagged? — Algorithmic Evidence & Signals
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparent, auditable reasons generated by the multi-signal risk intelligence engine
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {project.evidences.length} Risk Signal{project.evidences.length !== 1 ? 's' : ''} Detected
          </span>
        </div>

        {project.evidences.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-200">No Anomalous Risk Signals Detected</p>
            <p className="text-xs text-slate-400 mt-1">This project's financial utilization, timeline execution, and geographic scope conform to baseline peer benchmarks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {project.evidences.map((evidence, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center border border-slate-700">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-sm text-slate-100">{evidence.anomaly_type}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      evidence.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      evidence.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {evidence.severity} SEVERITY
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-teal-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                    {evidence.deviation}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {evidence.explanation}
                </p>

                {/* Metric & Baseline Table Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Observed Value:</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block">{evidence.observed_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Baseline / Expected:</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block">{evidence.baseline_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Comparison Benchmark:</span>
                    <span className="font-semibold text-cyan-300 mt-0.5 block">{evidence.comparison_group}</span>
                  </div>
                </div>

                {/* Recommended Verification Action */}
                <div className="flex items-start gap-2 pt-1 text-xs text-teal-300">
                  <FileCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Recommended Officer Action:</strong> {evidence.recommended_action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicate Candidates Section if present */}
      {project.duplicate_candidates.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                  Potential Duplicate / Overlapping Scope Candidates
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Lexical NLP embedding and Haversine distance proximity match
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {project.duplicate_candidates.length} Candidate Match{project.duplicate_candidates.length !== 1 ? 'es' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.duplicate_candidates.map((match, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {match.matched_project_id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      {match.semantic_similarity}% NLP Match
                    </span>
                    <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                      {match.distance_km} km away
                    </span>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                  {match.matched_work_name}
                </p>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>Sanctioned: ₹{(match.matched_sanctioned_amount / 100000).toFixed(1)} L</span>
                  <span>{match.matched_district}</span>
                </div>

                <button
                  onClick={() => onSelectProject(match.matched_project_id)}
                  className="w-full mt-2 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition"
                >
                  <span>Investigate Matched Work ({match.matched_project_id})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
