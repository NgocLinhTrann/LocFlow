import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Database, Search, Upload, Trash2, ArrowRight, RotateCw, CheckCircle, AlertCircle, FileSpreadsheet, Edit2, Check, X, Download } from 'lucide-react';

export default function Memory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editSource, setEditSource] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editError, setEditError] = useState(null);
  
  // Import states
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  
  const fileInputRef = useRef(null);
  const limit = 10;

  const fetchMemory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/memory', {
        params: { page, limit, search, sort_order: sortOrder }
      });
      setItems(response.data.items);
      setTotal(response.data.total);
      // Reset select boxes on query parameters shift
      setSelectedIds([]);
    } catch (err) {
      console.error("Error fetching translation memory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory();
  }, [page, search, sortOrder]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Delete individual TM entry
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this translation memory pair?")) return;
    try {
      await api.delete(`/api/memory/${id}`);
      fetchMemory();
    } catch (err) {
      console.error("Error deleting TM entry:", err);
      alert("Failed to delete memory entry.");
    }
  };

  // Inline Editing methods
  const startEditing = (item) => {
    setEditingId(item.id);
    setEditSource(item.source_text);
    setEditTarget(item.translated_text);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditSource('');
    setEditTarget('');
    setEditError(null);
  };

  const handleSaveEdit = async (id) => {
    const srcCleaned = editSource.trim();
    const tgtCleaned = editTarget.trim();

    if (!srcCleaned || !tgtCleaned) {
      setEditError("Fields cannot be empty.");
      return;
    }

    try {
      await api.put(`/api/memory/${id}`, {
        source_text: srcCleaned,
        translated_text: tgtCleaned
      });
      setEditingId(null);
      fetchMemory();
    } catch (err) {
      console.error("Error editing memory entry:", err);
      setEditError(err.response?.data?.detail || "Failed to update entry. It might already exist in TM or Glossary.");
    }
  };

  // Select items & Bulk Delete
  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(x => x.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected translation memory entries?`)) return;
    try {
      await api.post('/api/memory/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      fetchMemory();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert("Failed to delete selected memory entries.");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL entries in translation memory? This action cannot be undone.")) return;
    try {
      await api.delete('/api/memory');
      setSelectedIds([]);
      setPage(1);
      fetchMemory();
    } catch (err) {
      console.error("Clear TM failed:", err);
      alert("Failed to clear translation memory.");
    }
  };

  const handleExport = () => {
    try {
      const exportUrl = `${api.defaults.baseURL || 'http://localhost:8000'}/api/memory/export`;
      window.location.href = exportUrl;
    } catch (err) {
      console.error("Export TM failed:", err);
      alert("Failed to export translation memory.");
    }
  };

  // Upload Dictionary File
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setImportError('Only Excel (.xlsx) files are supported.');
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/memory/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(response.data.imported_count);
      setPage(1);
      fetchMemory();
    } catch (err) {
      console.error(err);
      setImportError(err.response?.data?.detail || 'Import failed. Check file layout.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Translation Memory</h1>
          <p className="text-slate-500 mt-1 font-medium">
            Cache verified translations to instantly localize identical cells and reduce AI costs.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 w-full sm:w-auto flex-wrap">
          {total > 0 && (
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-smooth shadow-sm"
              title="Export Translation Memory to Excel"
            >
              <Download className="w-4 h-4 text-slate-500" /> Export Excel
            </button>
          )}

          {total > 0 && (
            <button
              onClick={handleClearAll}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-4 py-2.5 rounded-xl transition-smooth shadow-sm"
              title="Clear All Translation Memory"
            >
              <Trash2 className="w-4 h-4" /> Delete All
            </button>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl transition-smooth shadow-lg shadow-rose-600/15"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".xlsx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={importing}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:from-slate-350 disabled:to-slate-400 text-white font-bold px-5 py-2.5 rounded-xl transition-smooth shadow-lg shadow-brand-500/15"
          >
            {importing ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" /> Seeding Database...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Seed Dictionary (.xlsx)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Import Status Alert */}
      {importResult !== null && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-scale-up">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-xs font-semibold">
            Memory seed successful! Added <span className="font-extrabold text-emerald-700">{importResult}</span> cached pairs.
          </p>
        </div>
      )}

      {importError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-scale-up">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-xs font-semibold">{importError}</p>
        </div>
      )}

      {/* Inline Editing Error alert */}
      {editError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-scale-up">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-xs font-semibold">{editError}</p>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input Filter */}
        <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-premium flex items-center gap-3 focus-within:ring-2 focus-within:ring-brand-500/15 focus-within:border-brand-500 transition-smooth">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search translation memory by Chinese or Vietnamese terms..."
            className="w-full bg-transparent border-0 text-sm focus:outline-none placeholder-slate-450 text-slate-800 font-medium"
          />
        </div>

        {/* Sort Order Selector */}
        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-premium flex items-center gap-2">
          <span className="text-xs font-bold text-slate-455 uppercase shrink-0 select-none">Sort:</span>
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            className="text-sm font-semibold bg-transparent border-none text-slate-700 focus:outline-none cursor-pointer pr-4"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Memory List Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-premium overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <RotateCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Querying translation cache database...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto space-y-4 animate-scale-up">
            <div className="p-4 bg-slate-50 rounded-2xl w-fit mx-auto text-slate-400">
              <Database className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Translation cache is empty</h3>
              <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
                Upload a 2-column Excel dictionary (Chinese and Vietnamese fully populated) to seed the cache.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4 w-12 text-center select-none">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.length === items.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-brand-600 border-slate-200 rounded focus:ring-brand-500/20 focus:ring-2 cursor-pointer transition-smooth"
                    />
                  </th>
                  <th className="px-6 py-4">Source Text (Chinese)</th>
                  <th className="px-6 py-4"><ArrowRight className="w-4 h-4 text-slate-400 inline mr-1" /> Translated Text (Vietnamese)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {items.map((item) => {
                  const isEditing = editingId === item.id;
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors duration-150 ${
                        isEditing 
                          ? 'bg-brand-50/10' 
                          : isSelected 
                            ? 'bg-slate-50/60' 
                            : 'hover:bg-slate-50/20'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 text-brand-600 border-slate-200 rounded focus:ring-brand-500/20 focus:ring-2 cursor-pointer transition-smooth"
                        />
                      </td>

                      {/* Source Text Cell */}
                      <td className="px-6 py-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSource}
                            onChange={(e) => setEditSource(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500"
                          />
                        ) : (
                          <span className="font-semibold text-slate-850 break-all max-w-sm block">{item.source_text}</span>
                        )}
                      </td>

                      {/* Target Text Cell */}
                      <td className="px-6 py-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500"
                          />
                        ) : (
                          <span className="text-slate-750 break-all max-w-sm block">{item.translated_text}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-smooth border border-transparent hover:border-emerald-100"
                              title="Save Changes"
                            >
                              <Check className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-smooth border border-transparent hover:border-slate-200"
                              title="Cancel Edit"
                            >
                              <X className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEditing(item)}
                              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 transition-smooth border border-transparent hover:border-slate-100"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-smooth border border-transparent hover:border-rose-100"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  PAGE <span className="text-slate-900">{page}</span> OF {totalPages} ({total.toLocaleString()} ENTRIES)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 px-4 py-2.5 rounded-xl transition-smooth"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 px-4 py-2.5 rounded-xl transition-smooth"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Format Helper Info Box */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-premium flex items-start gap-4 text-xs">
        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 text-slate-500 font-semibold leading-relaxed">
          <h4 className="font-bold text-slate-900">Translation Memory Tips:</h4>
          <p>• **Sorting**: Use the sort selector to toggle between Newest (most recently processed/seeded) and Oldest records.</p>
          <p>• **Modify**: Click the edit pencil icon on any row to edit fields inline, then save with checkmark.</p>
          <p>• **Bulk Actions**: Select row checkboxes (or click the header checkbox to select all) and click the red "Delete Selected" button to clean up multiple entries at once.</p>
        </div>
      </div>
    </div>
  );
}
