import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';
import { Upload, File, HelpCircle, Download, CheckCircle, RotateCw, AlertTriangle, FileSpreadsheet, Eye } from 'lucide-react';

export default function Translate() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [previewSheets, setPreviewSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  
  const [jobId, setJobId] = useState(null);
  const [jobProgress, setJobProgress] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [saveToTm, setSaveToTm] = useState(true);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        setError('Only Excel (.xlsx) files are supported.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setJobId(null);
      setJobProgress(null);
      setIsTranslating(false);
      parseExcelPreview(selectedFile);
    }
  };

  const parseExcelPreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        setPreviewSheets(workbook.SheetNames);
        const firstSheetName = workbook.SheetNames[0];
        setActiveSheet(firstSheetName);
        
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setPreviewData(jsonData.slice(0, 10)); // First 10 rows
      } catch (err) {
        console.error("Error reading file preview:", err);
        setPreviewData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.xlsx')) {
        setError('Only Excel (.xlsx) files are supported.');
        return;
      }
      setFile(droppedFile);
      setError(null);
      setJobId(null);
      setJobProgress(null);
      setIsTranslating(false);
      parseExcelPreview(droppedFile);
    }
  };

  const handleStartTranslation = async () => {
    if (!file) return;
    
    setIsTranslating(true);
    setError(null);
    setJobProgress({ status: 'PENDING', total_rows: 0, processed_rows: 0, tm_hits: 0, ai_translations: 0 });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/api/translate/upload?save_to_tm=${saveToTm}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setJobId(response.data.job_id);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to upload and start translation.');
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const pollProgress = async () => {
      try {
        const response = await api.get(`/api/jobs/${jobId}`);
        const data = response.data;
        setJobProgress(data);
        
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          setIsTranslating(false);
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch (err) {
        console.error("Error polling job status:", err);
        setError("Connection lost. Retrying to trace progress...");
      }
    };

    pollingRef.current = setInterval(pollProgress, 1500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId]);

  const handleClear = () => {
    setFile(null);
    setPreviewData([]);
    setPreviewSheets([]);
    setActiveSheet('');
    setJobId(null);
    setJobProgress(null);
    setIsTranslating(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getProgressPercentage = () => {
    if (!jobProgress || jobProgress.total_rows === 0) return 0;
    return Math.round((jobProgress.processed_rows / jobProgress.total_rows) * 100);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Translate Excel</h1>
        <p className="text-slate-500 mt-1 font-medium">
          Feed a game localization sheet and automatically translate blank Column B cells.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl flex items-start gap-3.5 shadow-sm animate-scale-up">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-950">Job Execution Failure</h4>
            <p className="text-xs text-rose-700 mt-1 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Box Area */}
      {!isTranslating && !jobProgress && (
        <div className="space-y-8">
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-slate-200 hover:border-brand-500 bg-white rounded-3xl p-16 text-center cursor-pointer transition-smooth group shadow-premium hover:shadow-lg relative overflow-hidden"
            >
              <div className="absolute -right-24 -bottom-24 w-48 h-48 bg-brand-50/50 rounded-full blur-3xl group-hover:bg-brand-50 transition-colors" />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx"
                className="hidden"
              />
              <div className="p-4 bg-brand-50 text-brand-600 rounded-2xl w-fit mx-auto mb-5 group-hover:scale-110 transition-smooth group-hover:shadow-glow-brand">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-slate-900 font-extrabold text-xl">Upload target localization file</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto font-medium">
                Drag and drop your Excel script here, or click to open folders.
              </p>
              
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4 text-slate-400" /> Multi-worksheet automatic iteration</span>
                <span>•</span>
                <span className="text-slate-500">Column A (zh) → Column B (vi)</span>
              </div>
            </div>
          ) : (
            /* Selected File Configuration View */
            <div className="space-y-6 animate-scale-up">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                    <File className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight truncate max-w-md">{file.name}</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1">
                      {(file.size / 1024).toFixed(1)} KB • Microsoft Excel Spreadsheet
                    </p>
                    
                    {/* Toggle settings */}
                    <div className="flex items-center gap-2.5 mt-2.5">
                      <input
                        type="checkbox"
                        id="saveToTm"
                        checked={saveToTm}
                        onChange={(e) => setSaveToTm(e.target.checked)}
                        className="w-4 h-4 text-brand-600 border-slate-200 rounded focus:ring-brand-500/20 focus:ring-2 cursor-pointer transition-smooth"
                      />
                      <label htmlFor="saveToTm" className="text-xs font-bold text-slate-500 select-none cursor-pointer hover:text-slate-700 transition-smooth">
                        Save AI translations to Translation Memory automatically
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClear}
                    className="text-xs font-bold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl transition-smooth"
                  >
                    Clear File
                  </button>
                  <button
                    onClick={handleStartTranslation}
                    className="text-xs font-bold bg-gradient-to-r from-brand-600 to-brand-700 text-white px-6 py-3 rounded-xl transition-smooth shadow-lg shadow-brand-500/15"
                  >
                    Start Translation
                  </button>
                </div>
              </div>

              {/* Data table preview */}
              {previewData.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl shadow-premium overflow-hidden border-t-4 border-t-brand-500">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/10">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4.5 h-4.5 text-slate-400" />
                      <h3 className="font-extrabold text-slate-950 text-sm">Target Sheet Preview (Header + 9 Rows)</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      Active: <span className="text-brand-600">{activeSheet}</span>
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-6 py-3.5 w-16 text-slate-400 text-center">Row</th>
                          <th className="px-6 py-3.5 border-l border-slate-100">Column A (Chinese Source)</th>
                          <th className="px-6 py-3.5 border-l border-slate-100">Column B (Vietnamese Target)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.map((row, index) => {
                          const isHeader = index === 0;
                          return (
                            <tr 
                              key={index} 
                              className={`hover:bg-slate-50/20 transition-colors ${isHeader ? 'bg-slate-50/40 font-bold text-slate-800 text-sm' : ''}`}
                            >
                              <td className="px-6 py-3 text-slate-400 font-semibold font-mono text-center">{index + 1}</td>
                              <td className="px-6 py-3 border-l border-slate-100 font-medium truncate max-w-md">
                                {row[0] !== undefined ? String(row[0]) : <span className="text-slate-300 italic">Empty</span>}
                              </td>
                              <td className="px-6 py-3 border-l border-slate-100 truncate max-w-md">
                                {row[1] !== undefined ? String(row[1]) : (
                                  isHeader ? "" : (
                                    <span className="inline-flex items-center text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg animate-pulse shadow-sm shadow-brand-50">
                                      To Translate
                                    </span>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4.5 border-t border-slate-100 text-slate-400 text-xs bg-slate-50/10">
                    * LocFlow will read **all sheets**, skip Row 1 on each, and fill only empty cells in Column B. Pre-translated rows are untouched.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress & Live status panel */}
      {(isTranslating || jobProgress) && (
        <div className="bg-white border border-slate-150 rounded-3xl p-8 shadow-premium max-w-2xl mx-auto space-y-8 animate-scale-up border-t-4 border-t-brand-500">
          <div className="text-center space-y-2">
            <h3 className="font-extrabold text-slate-950 text-xl truncate max-w-md mx-auto">
              {jobProgress?.filename || file?.name}
            </h3>
            
            <div className="flex items-center justify-center gap-2">
              {jobProgress?.status === 'PROCESSING' && <RotateCw className="w-4 h-4 text-brand-500 animate-spin" />}
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                {jobProgress?.status === 'PENDING' && 'Waiting in task queue...'}
                {jobProgress?.status === 'PROCESSING' && 'AI engine running batch translations...'}
                {jobProgress?.status === 'COMPLETED' && 'Excel file fully translated!'}
                {jobProgress?.status === 'FAILED' && 'Translation job aborted.'}
              </p>
            </div>
          </div>

          {/* Radial progress ring / Progress bar */}
          <div className="space-y-3 bg-slate-50/40 p-5 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Overall Progress</span>
              <span className="text-brand-700 font-extrabold text-base">{getProgressPercentage()}%</span>
            </div>
            
            <div className="w-full bg-slate-200/60 h-3 rounded-full overflow-hidden border border-slate-200/30 relative">
              <div 
                className="bg-gradient-to-r from-brand-500 to-brand-600 h-full rounded-full transition-all duration-300 shadow-inner relative"
                style={{ width: `${getProgressPercentage()}%` }}
              >
                {/* Subtle shimmer animation overlay when translating */}
                {jobProgress?.status === 'PROCESSING' && (
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-shimmer" style={{ width: '200%', transform: 'translateX(-100%)' }} />
                )}
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-400 mt-2 font-bold">
              <span>PROCESSED: {jobProgress?.processed_rows || 0} / {jobProgress?.total_rows || 0} ROWS</span>
              {jobProgress?.status === 'PROCESSING' && jobProgress?.eta_seconds > 0 && (
                <span className="text-slate-500">ETA: <span className="text-brand-600 font-extrabold">{jobProgress.eta_seconds}s</span></span>
              )}
            </div>
          </div>

          {/* Real-time details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 hover:border-emerald-200 p-5 rounded-2xl text-center shadow-premium transition-smooth hover:shadow-glow-emerald">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Dictionary hits</span>
              <span className="text-3xl font-extrabold text-slate-900 block mt-1">{jobProgress?.tm_hits || 0}</span>
              <span className="text-[10px] font-semibold text-emerald-600 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full w-fit mx-auto border border-emerald-100 block">Saved Cost (Regular)</span>
            </div>

            <div className="bg-white border border-slate-100 hover:border-brand-200 p-5 rounded-2xl text-center shadow-premium transition-smooth hover:shadow-glow-brand">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">AI Translations</span>
              <span className="text-3xl font-extrabold text-brand-700 block mt-1">{jobProgress?.ai_translations || 0}</span>
              <span className="text-[10px] font-semibold text-brand-500 mt-1 bg-brand-50 px-2 py-0.5 rounded-full w-fit mx-auto border border-brand-100 block">Gemini Output (Bold)</span>
            </div>
          </div>

          {/* Job Completion View */}
          {jobProgress?.status === 'COMPLETED' && (
            <div className="pt-4 border-t border-slate-100 flex flex-col items-center space-y-4 animate-scale-up">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full animate-bounce shadow-glow-emerald border border-emerald-100">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h4 className="font-extrabold text-slate-900 text-lg">Translation Completed Successfully</h4>
                <p className="text-slate-500 text-xs font-semibold max-w-sm mt-1 leading-relaxed">
                  Processed {jobProgress.total_rows} rows. AI cells are bolded in the sheet for easier review.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                <button
                  onClick={handleClear}
                  className="flex-1 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 py-3.5 rounded-xl transition-smooth"
                >
                  Translate Another File
                </button>
                <a
                  href={`http://localhost:8000/api/jobs/${jobId}/download`}
                  download
                  className="flex-1 flex items-center justify-center gap-2 text-xs font-extrabold bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white py-3.5 rounded-xl transition-smooth shadow-lg shadow-brand-500/15"
                >
                  <Download className="w-4 h-4" /> Download Translated Excel
                </a>
              </div>
            </div>
          )}

          {/* Job Failure view */}
          {jobProgress?.status === 'FAILED' && (
            <div className="pt-4 border-t border-slate-100 flex flex-col items-center space-y-4 animate-scale-up">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-full border border-rose-100">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-extrabold text-slate-900 text-lg">Processing Aborted</h4>
                <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-100 p-4 rounded-xl max-w-md mt-2 leading-relaxed">
                  {jobProgress.error_message || 'An unexpected worker exception occurred.'}
                </p>
              </div>
              <button
                onClick={handleClear}
                className="w-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl transition-smooth"
              >
                Back to Upload
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
