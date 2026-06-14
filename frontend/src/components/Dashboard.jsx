import React, { useState, useEffect } from 'react';
import api from '../api';
import { Database, FileSpreadsheet, Clock, Languages, ArrowRight, RotateCw, AlertCircle, CheckCircle, Clock5 } from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/dashboard/stats');
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to the backend server. Please verify FastAPI is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <Clock5 className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RotateCw className="w-3.5 h-3.5 animate-spin" /> Translating
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] animate-fade-in">
        <div className="p-4 bg-brand-50 rounded-2xl mb-4 shadow-sm shadow-brand-100">
          <RotateCw className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
        <p className="text-slate-500 font-semibold text-sm">Gathering localization metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-100 shadow-premium rounded-3xl p-8 text-center max-w-xl mx-auto mt-12 animate-scale-up">
        <div className="p-4 bg-rose-50 rounded-full w-fit mx-auto mb-5 text-rose-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Connection Required</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">{error}</p>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-brand-500/10 transition-smooth"
        >
          <RotateCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  const {
    total_processed = 0,
    total_tm_hits = 0,
    total_ai_trans = 0,
    hours_saved = 0,
    glossary_count = 0,
    tm_count = 0,
    recent_jobs = []
  } = stats || {};

  const tmReuseRate = total_processed > 0 ? Math.round((total_tm_hits / total_processed) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Real-time statistics of your Chinese-Vietnamese translation workflows.</p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 - Total */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium hover:shadow-md transition-smooth relative overflow-hidden group border-t-4 border-t-brand-500">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Processed</span>
            <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600 group-hover:scale-105 transition-smooth">
              <Languages className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{total_processed.toLocaleString()}</div>
          <p className="text-[11px] text-slate-500 mt-2">
            <span className="font-bold text-brand-600">{total_ai_trans.toLocaleString()}</span> via AI • <span className="font-semibold text-slate-700">{total_tm_hits.toLocaleString()}</span> from Memory
          </p>
        </div>

        {/* Metric 2 - TM Match Rate */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium hover:shadow-md transition-smooth relative overflow-hidden group border-t-4 border-t-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Memory Match Rate</span>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-105 transition-smooth">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{tmReuseRate}%</div>
          <p className="text-[11px] text-emerald-600 mt-2 font-bold">
            Saved {total_tm_hits.toLocaleString()} calls via cached dictionary hits.
          </p>
        </div>

        {/* Metric 3 - Hours Saved */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium hover:shadow-md transition-smooth relative overflow-hidden group border-t-4 border-t-purple-500">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hours Saved</span>
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 group-hover:scale-105 transition-smooth">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{hours_saved}h</div>
          <p className="text-[11px] text-slate-500 mt-2">
            Assuming 15 seconds per manual row.
          </p>
        </div>

        {/* Metric 4 - Total Local DB Size */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium hover:shadow-md transition-smooth relative overflow-hidden group border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database Size</span>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 group-hover:scale-105 transition-smooth">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{(glossary_count + tm_count).toLocaleString()}</div>
          <p className="text-[11px] text-slate-500 mt-2">
            <span className="font-bold text-slate-800">{glossary_count}</span> Glossary terms • <span className="font-bold text-slate-800">{tm_count}</span> TM entries
          </p>
        </div>
      </div>

      {/* Action Shortcuts Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-obsidian-950 text-white rounded-3xl p-6 flex flex-col justify-between h-48 group shadow-premium hover:shadow-lg transition-smooth border border-obsidian-900 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-36 h-36 bg-brand-500/10 rounded-full blur-3xl" />
          <div>
            <h3 className="text-lg font-bold">New Translation Job</h3>
            <p className="text-slate-400 text-sm mt-1.5 max-w-sm">Upload a Chinese game Excel sheet to immediately fill out Column B Vietnamese cells.</p>
          </div>
          <button
            onClick={() => setActiveTab('translate')}
            className="flex items-center gap-2 font-bold bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white w-fit px-5 py-3 rounded-xl transition-smooth shadow-lg shadow-brand-500/15"
          >
            Translate Excel <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between h-48 group shadow-premium hover:shadow-lg transition-smooth">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Manage Terminology</h3>
            <p className="text-slate-500 text-sm mt-1.5 max-w-sm">Upload dictionary seeds or define glossary terminology rules for Gemini to follow.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('memory')}
              className="text-xs font-bold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-xl transition-smooth"
            >
              Translation Memory
            </button>
            <button
              onClick={() => setActiveTab('glossary')}
              className="text-xs font-bold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-xl transition-smooth"
            >
              Glossary Terms
            </button>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-premium overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
          <h2 className="font-extrabold text-slate-950">Recent Translation Tasks</h2>
          <button
            onClick={fetchStats}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-smooth border border-slate-100 bg-white"
            title="Refresh History"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {recent_jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 max-w-xs mx-auto">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700 text-sm">No translation logs</h3>
            <p className="text-xs mt-1">Ready for your first game translation sheet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Filename</th>
                  <th className="px-6 py-4">Total Rows</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {recent_jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4.5 font-semibold text-slate-900 truncate max-w-xs">{job.filename}</td>
                    <td className="px-6 py-4.5 font-medium">{job.total_rows.toLocaleString()}</td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/20">
                          <div 
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${job.total_rows > 0 ? (job.processed_rows / job.total_rows) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">
                          {job.processed_rows}/{job.total_rows}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">{getStatusBadge(job.status)}</td>
                    <td className="px-6 py-4.5 text-xs text-slate-400 font-medium">
                      {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      {job.status === 'COMPLETED' ? (
                        <a
                          href={`http://localhost:8000/api/jobs/${job.id}/download`}
                          download
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-white bg-brand-50 hover:bg-brand-600 px-3.5 py-2 rounded-xl transition-smooth shadow-sm"
                        >
                          Download Excel
                        </a>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center text-xs font-bold text-slate-400 bg-slate-50 px-3.5 py-2 rounded-xl cursor-not-allowed border border-slate-100"
                        >
                          Unavailable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
