import React, { useState } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  RotateCcw, 
  RefreshCw, 
  FileText, 
  Check, 
  AlertOctagon,
  Download
} from 'lucide-react';
import { DashboardSummary } from '../types';
import { apiClient } from '../services/api';

interface DataQualityUploadViewProps {
  summary: DashboardSummary | null;
  onRefresh: () => void;
}

export const DataQualityUploadView: React.FC<DataQualityUploadViewProps> = ({ summary, onRefresh }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [uploading, setUploading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

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
      const res = await apiClient.uploadCSV(file, mode);
      if (res.success) {
        setResultMessage(res.message);
        if (res.validation_errors && res.validation_errors.length > 0) {
          setValidationErrors(res.validation_errors);
        }
        setFile(null);
        onRefresh();
      } else {
        setResultMessage(`Upload error: ${res.message}`);
      }
    } catch (err: any) {
      setResultMessage(`Upload failed: ${err.response?.data?.message || err.message}`);
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
            Ingest external MPLADS CSV records, audit data completeness, and run real-time risk intelligence
          </p>
        </div>

        <button
          onClick={downloadSampleCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
        >
          <Download className="w-3.5 h-3.5 text-teal-400" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* Data Quality Metrics Cards */}
      {dq && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Total Records</span>
              <FileText className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-black text-slate-100 mt-2">{dq.total_projects}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              <strong>{dq.valid_records}</strong> fully valid schema rows
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Data Integrity Score</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">{dq.data_integrity_score_pct}%</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Validated dates, coordinates & amounts
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Requires Ground Review</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{dq.records_requiring_review}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              High / Critical statistical anomalies
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Last Engine Run</span>
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-sm font-bold font-mono text-slate-200 mt-2 truncate">
              {new Date(dq.last_analyzed_at).toLocaleTimeString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {new Date(dq.last_analyzed_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* CSV Ingestion Dropzone Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Upload MPLADS CSV Dataset</h3>
          <p className="text-xs text-slate-400">
            Select a CSV file with MPLADS project data. The engine will normalize fields, perform feature extraction, and compute explainable risk scores.
          </p>
        </div>

        {/* Upload Form Box */}
        <div className="border-2 border-dashed border-slate-700 hover:border-teal-500/50 rounded-xl p-8 text-center transition bg-slate-950/40 space-y-4">
          <input
            type="file"
            id="csv-file-input"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-200">
              {file ? file.name : 'Click to Browse or Drag & Drop MPLADS CSV File'}
            </p>
            <p className="text-xs text-slate-500">
              Supported fields: project_id, work_name, state, district, sanctioned_amount, expenditure, progress, coordinates...
            </p>
          </label>

          {file && (
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Ingestion Mode:</span>
                <button
                  type="button"
                  onClick={() => setMode('replace')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    mode === 'replace' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Replace Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setMode('append')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    mode === 'append' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Append to Existing
                </button>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-teal-600/20 disabled:opacity-50"
              >
                {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                <span>{uploading ? 'Processing & Ingesting...' : 'Upload & Analyze Dataset'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Ingestion Response Banner */}
        {resultMessage && (
          <div className="p-4 rounded-xl bg-slate-950 border border-teal-500/40 text-xs text-teal-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-100">{resultMessage}</p>
            </div>
          </div>
        )}

        {/* Validation Errors Table */}
        {validationErrors.length > 0 && (
          <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Validation Warnings ({validationErrors.length} rows skipped)</span>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-800 text-xs text-slate-400">
              {validationErrors.map((err, i) => (
                <div key={i} className="py-1.5 flex justify-between">
                  <span>Row {err.row} {err.project_id ? `(${err.project_id})` : ''}</span>
                  <span className="text-rose-400">{err.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
