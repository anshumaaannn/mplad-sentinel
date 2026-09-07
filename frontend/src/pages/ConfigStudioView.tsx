import React, { useState, useEffect } from 'react';
import { Sliders, Save, RotateCcw, CheckCircle2, Sparkles, ShieldAlert, Info } from 'lucide-react';
import { SystemConfig } from '../types';
import { apiClient } from '../services/api';

interface ConfigStudioViewProps {
  onConfigSaved: () => void;
}

export const ConfigStudioView: React.FC<ConfigStudioViewProps> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getConfig();
        setConfig(data);
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  if (loading || !config) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Loading Risk Rules & Weight Configuration...</p>
      </div>
    );
  }

  const handleWeightChange = (key: keyof SystemConfig['weights'], val: number) => {
    setConfig({
      ...config,
      weights: {
        ...config.weights,
        [key]: val
      }
    });
    setSaveSuccess(false);
  };

  const handleThresholdChange = (key: keyof SystemConfig['thresholds'], val: number) => {
    setConfig({
      ...config,
      thresholds: {
        ...config.thresholds,
        [key]: val
      }
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateConfig(config);
      setSaveSuccess(true);
      onConfigSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const reset = await apiClient.resetConfig();
      setConfig(reset);
      setSaveSuccess(true);
      onConfigSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to reset config:', err);
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = Object.values(config.weights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Risk Weight & Anomaly Threshold Rules Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure signal weights and algorithmic anomaly thresholds without modifying ML code
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-teal-600/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Recomputing...' : 'Apply & Recalculate Catalog'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-teal-950/60 border border-teal-500/40 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>Configuration applied successfully! All 250+ project risk scores, benchmarks, and signals recomputed.</span>
        </div>
      )}

      {/* Two Grid Cards: Weights and Thresholds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signal Weights Slider Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Multi-Signal Risk Weights</h3>
              <p className="text-xs text-slate-400">Controls contribution of each dimension to the 0-100 score</p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
              Sum: {totalWeight} pts
            </span>
          </div>

          <div className="space-y-4">
            {/* Financial Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Financial Overrun & Outlier Weight</span>
                <span className="font-mono font-bold text-rose-300">{config.weights.financial_weight} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={config.weights.financial_weight}
                onChange={(e) => handleWeightChange('financial_weight', parseInt(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Delay Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Execution Timeline Delay Weight</span>
                <span className="font-mono font-bold text-orange-300">{config.weights.delay_weight} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                value={config.weights.delay_weight}
                onChange={(e) => handleWeightChange('delay_weight', parseInt(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Progress Mismatch Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Disbursement vs Physical Progress Gap Weight</span>
                <span className="font-mono font-bold text-purple-300">{config.weights.progress_mismatch_weight} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                value={config.weights.progress_mismatch_weight}
                onChange={(e) => handleWeightChange('progress_mismatch_weight', parseInt(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Duplicate Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Semantic NLP Duplicate Scope Weight</span>
                <span className="font-mono font-bold text-amber-300">{config.weights.duplicate_weight} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                value={config.weights.duplicate_weight}
                onChange={(e) => handleWeightChange('duplicate_weight', parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Geo Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Geospatial Density Clustering Weight</span>
                <span className="font-mono font-bold text-blue-300">{config.weights.geospatial_weight} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={config.weights.geospatial_weight}
                onChange={(e) => handleWeightChange('geospatial_weight', parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Agency Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Implementing Agency Historic Risk Weight</span>
                <span className="font-mono font-bold text-cyan-300">{config.weights.agency_weight} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={config.weights.agency_weight}
                onChange={(e) => handleWeightChange('agency_weight', parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Anomaly Detection Thresholds Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Algorithmic Anomaly Thresholds</h3>
            <p className="text-xs text-slate-400">Baseline deviation cutoffs triggering automated flag generation</p>
          </div>

          <div className="space-y-4">
            {/* Peer Cost Deviation */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Peer Cost Outlier Threshold (% above peer median)</span>
                <span className="font-mono font-bold text-teal-300">+{config.thresholds.peer_cost_deviation_threshold_pct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={config.thresholds.peer_cost_deviation_threshold_pct}
                onChange={(e) => handleThresholdChange('peer_cost_deviation_threshold_pct', parseInt(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Cost Overrun */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Direct Cost Overrun Threshold (% above estimate)</span>
                <span className="font-mono font-bold text-teal-300">+{config.thresholds.cost_overrun_threshold_pct}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                value={config.thresholds.cost_overrun_threshold_pct}
                onChange={(e) => handleThresholdChange('cost_overrun_threshold_pct', parseInt(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Progress Gap */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Disbursement vs Progress Divergence Gap (%)</span>
                <span className="font-mono font-bold text-teal-300">+{config.thresholds.expenditure_progress_gap_threshold}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={config.thresholds.expenditure_progress_gap_threshold}
                onChange={(e) => handleThresholdChange('expenditure_progress_gap_threshold', parseInt(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Delay Days */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Timeline Delay Threshold (Days past expected end)</span>
                <span className="font-mono font-bold text-teal-300">+{config.thresholds.delay_days_threshold} days</span>
              </div>
              <input
                type="range"
                min={15}
                max={180}
                value={config.thresholds.delay_days_threshold}
                onChange={(e) => handleThresholdChange('delay_days_threshold', parseInt(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* NLP Similarity */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">NLP Duplicate Similarity Cutoff (% match)</span>
                <span className="font-mono font-bold text-teal-300">{config.thresholds.semantic_similarity_threshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                value={config.thresholds.semantic_similarity_threshold}
                onChange={(e) => handleThresholdChange('semantic_similarity_threshold', parseInt(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Geo Distance */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Duplicate Proximity Radius (km)</span>
                <span className="font-mono font-bold text-teal-300">{config.thresholds.duplicate_distance_threshold_km} km</span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                step={0.5}
                value={config.thresholds.duplicate_distance_threshold_km}
                onChange={(e) => handleThresholdChange('duplicate_distance_threshold_km', parseFloat(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
