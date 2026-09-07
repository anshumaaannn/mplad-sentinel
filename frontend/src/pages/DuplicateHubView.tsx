import React, { useState, useEffect } from 'react';
import { Copy, AlertOctagon, MapPin, Building2, Coins, ArrowRight, CheckCircle2, Split } from 'lucide-react';
import { DuplicatePair } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { apiClient } from '../services/api';

interface DuplicateHubViewProps {
  onSelectProject: (id: string) => void;
}

export const DuplicateHubView: React.FC<DuplicateHubViewProps> = ({ onSelectProject }) => {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [selectedPairIndex, setSelectedPairIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDuplicates = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getDuplicates();
        setPairs(data);
      } catch (err) {
        console.error('Failed to load duplicate pairs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDuplicates();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Running NLP Semantic Embedding & Geospatial Proximity Hub...</p>
      </div>
    );
  }

  const activePair = pairs[selectedPairIndex];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Potential Duplicate & Overlapping Works Hub
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-checks text similarity embeddings and geographic proximity to flag potential asset duplication
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
          {pairs.length} Candidate Duplicate Pair{pairs.length !== 1 ? 's' : ''} Identified
        </span>
      </div>

      {pairs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No High-Probability Duplicates Detected</h3>
          <p className="text-xs text-slate-400 mt-1">All monitored works exhibit distinct geographic locations and independent scope definitions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Duplicate Pairs List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
              Detected Pairs ({pairs.length})
            </h3>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {pairs.map((pair, idx) => {
                const isSelected = selectedPairIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedPairIndex(idx)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-teal-400">
                        {pair.projectA.project_id} ↔ {pair.projectB.project_id}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {pair.similarity}% Match
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-200 line-clamp-1">
                      {pair.projectA.work_name}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800">
                      <span>{pair.projectA.district}</span>
                      <span className="font-semibold text-cyan-300">📍 {pair.distance_km} km apart</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Side-by-Side Comparison Dossier */}
          {activePair && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl lg:col-span-2 space-y-6">
              {/* Pair Banner Summary */}
              <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Split className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                      Side-by-Side Scope Comparison
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Requires verification before releasing further milestone funds
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {activePair.similarity}% Semantic Match
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {activePair.distance_km} km Distance
                  </span>
                </div>
              </div>

              {/* Duplicate Reasons List */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider block text-[11px]">
                  Duplicate Risk Indicators:
                </span>
                <ul className="space-y-1 text-slate-300">
                  {activePair.reasons.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Side-by-Side Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project A */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
                      {activePair.projectA.project_id}
                    </span>
                    <RiskBadge level={activePair.projectA.risk_level} score={activePair.projectA.risk_score} size="sm" />
                  </div>

                  <h4 className="text-xs font-bold text-slate-100 leading-snug">
                    {activePair.projectA.work_name}
                  </h4>

                  <div className="space-y-1.5 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sanctioned:</span>
                      <span className="font-bold text-slate-100">₹{(activePair.projectA.sanctioned_amount / 100000).toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Exp / Progress:</span>
                      <span>₹{(activePair.projectA.actual_expenditure / 100000).toFixed(1)} L ({activePair.projectA.physical_progress_percentage}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sanction Date:</span>
                      <span>{activePair.projectA.sanction_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Agency:</span>
                      <span className="truncate max-w-[150px]">{activePair.projectA.implementing_agency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coordinates:</span>
                      <span className="font-mono">{activePair.projectA.latitude}, {activePair.projectA.longitude}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectProject(activePair.projectA.project_id)}
                    className="w-full mt-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <span>Investigate {activePair.projectA.project_id}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Project B */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
                      {activePair.projectB.project_id}
                    </span>
                    <RiskBadge level={activePair.projectB.risk_level} score={activePair.projectB.risk_score} size="sm" />
                  </div>

                  <h4 className="text-xs font-bold text-slate-100 leading-snug">
                    {activePair.projectB.work_name}
                  </h4>

                  <div className="space-y-1.5 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sanctioned:</span>
                      <span className="font-bold text-slate-100">₹{(activePair.projectB.sanctioned_amount / 100000).toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Exp / Progress:</span>
                      <span>₹{(activePair.projectB.actual_expenditure / 100000).toFixed(1)} L ({activePair.projectB.physical_progress_percentage}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sanction Date:</span>
                      <span>{activePair.projectB.sanction_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Agency:</span>
                      <span className="truncate max-w-[150px]">{activePair.projectB.implementing_agency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coordinates:</span>
                      <span className="font-mono">{activePair.projectB.latitude}, {activePair.projectB.longitude}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectProject(activePair.projectB.project_id)}
                    className="w-full mt-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <span>Investigate {activePair.projectB.project_id}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
