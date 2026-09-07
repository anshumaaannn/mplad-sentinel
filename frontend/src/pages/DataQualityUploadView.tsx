import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  FileText,
  AlertOctagon,
  MapPinOff,
  CalendarOff,
  ShieldCheck,
  FileWarning
} from 'lucide-react';
import { apiClient } from '../services/api';
import { DashboardSummary } from '../types';

interface DataQualityUploadViewProps {
  summary: DashboardSummary | null;
  onRefresh: () => Promise<void> | void;
}

export const DataQualityUploadView: React.FC<DataQualityUploadViewProps> = ({
  summary,
  onRefresh
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; project_id?: string; error: string }>>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResultMessage(null);
      setValidationErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResultMessage(null);
    setValidationErrors([]);

    try {
      const resp = await apiClient.uploadCSV(file, mode);
      if (resp.success) {
        setResultMessage(resp.message);
        if (resp.errors && resp.errors.length > 0) {
          setValidationErrors(resp.errors);
        }
        setFile(null);
        await onRefresh();
      } else {
        setResultMessage(`Upload error: ${resp.message}`);
      }
    } catch (err: any) {
      console.error('Failed to upload CSV:', err);
      setResultMessage(err.response?.data?.message || 'Network error during CSV ingestion.');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `project_id,work_name,state,district,constituency,mp_name,sector,work_type,sanctioned_amount,estimated_cost,actual_expenditure,sanction_date,start_date,expected_completion_date,completion_date,status,physical_progress_percentage,implementing_agency,latitude,longitude,beneficiary_count,unit,quantity
"TEST-001","Construction of Interlocking Road in Sector 4","Uttar Pradesh","Lucknow","Lucknow Central","Hon. MP","Infrastructure","Road Construction",2500000,2500000,2400000,"2024-01-10","2024-02-01","2024-08-30","2024-09-10","Completed",100,"PWD Lucknow",26.8467,80.9462,3500,"km",1.2
"TEST-002","Installation of 50 Solar LED Street Lights in Gram Kalyanpur","Bihar","Patna","Patna Sahib","Hon. MP","Energy & Lighting","Solar Street Lights",1800000,1800000,1650000,"2024-03-15","2024-04-01","2024-09-30","","In Progress",80,"BREDA",25.5941,85.1376,5000,"units",50`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mplads_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dq = summary?.data_quality;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Data Ingestion & Integrity Health Center
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Calculates live schema validity, missing coordinates, missing completion dates, and field completeness directly from the dataset.
          </p>
        </div>

        <button
          onClick={downloadSampleCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-teal-400" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* Primary Data Quality Metrics Cards */}
      {dq && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Total Records</span>
              <FileText className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-black text-slate-100 mt-2">{dq.total_projects}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Valid: <strong className="text-emerald-400">{dq.valid_records}</strong> • Invalid: <strong className="text-rose-400">{dq.invalid_records}</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Data Integrity Score</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <p className="text-2xl font-black text-emerald-400">{dq.data_integrity_score_pct}%</p>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Calculated across 6 schema checks</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Missing Coordinates</span>
              <MapPinOff className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2">{dq.missing_coordinates_count}</p>
            <p className="text-[11px] text-slate-400 mt-1">Records lacking valid lat/lng</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Missing Dates / Fields</span>
              <CalendarOff className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-2xl font-black text-orange-400 mt-2">
              {dq.missing_completion_dates_count + (dq.missing_required_fields_count || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Dates: {dq.missing_completion_dates_count} • Fields: {dq.missing_required_fields_count || 0}
            </p>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Upload MPLADS Project Dataset (CSV)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest real-world project records or Ministry data dumps for automated risk scoring and peer benchmarking.
          </p>
        </div>

        {/* Drag / File selector box */}
        <div className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-8 text-center bg-slate-950/40 transition">
          <FileSpreadsheet className="w-12 h-12 text-teal-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-200">
            {file ? file.name : 'Select or drop MPLADS CSV file here'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Standard CSV schema format. Maximum file size: 25 MB.
          </p>

          <label className="inline-block mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold cursor-pointer border border-slate-700 transition">
            Browse File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Options & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400 font-medium">Ingestion Mode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="mode"
                value="replace"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="text-teal-500 focus:ring-0"
              />
              <span>Replace Entire Portfolio</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="mode"
                value="append"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
                className="text-teal-500 focus:ring-0"
              />
              <span>Append to Current Portfolio</span>
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${uploading ? 'animate-spin' : ''}`} />
            <span>{uploading ? 'Parsing & Scoring...' : 'Upload & Run Risk Analysis'}</span>
          </button>
        </div>

        {/* Status result notification */}
        {resultMessage && (
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-slate-200">{resultMessage}</span>
          </div>
        )}

        {/* Validation Errors List */}
        {validationErrors.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <FileWarning className="w-4 h-4" />
              <span>{validationErrors.length} Record Inconsistencies Detected During Parse:</span>
            </div>
            <ul className="text-[11px] text-rose-200/90 space-y-1 max-h-40 overflow-y-auto pl-5 list-disc">
              {validationErrors.map((err, idx) => (
                <li key={idx}>
                  Row {err.row}: {err.error} {err.project_id ? `(${err.project_id})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
