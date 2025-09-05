"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

// Align types with TMR CleanDataViewer usage
type Submission = {
  id: number;
  timestamp: string;
  entityId: number | null;
  entityName: string | null;
  formCode: string;
  utmCampaign: string | null;
  utmCampaignName: string | null;
  responses: { field_name: string; field_label: string; value: string; value_label?: string | null }[];
};

type FormField = {
  id: number;
  field_name: string;
  field_label: string;
  field_type: string;
  sort_order: number;
};

export default function CleanDataViewer({ formId }: { formId: number }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  // Preview sidebar state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewValue, setPreviewValue] = useState<string>("");
  // Copy feedback
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.createElement('div');
      toast.textContent = 'Copied!';
      toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-3 py-1.5 rounded shadow-lg z-[1100] text-xs';
      document.body.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 1200);
    }).catch(() => {});
  };

  // Lock body scroll when sidebar is open to avoid layout shift and stray gaps
  useEffect(() => {
    if (previewOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.dataset.prevOverflow = originalOverflow;
      document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = document.body.dataset.prevOverflow || '';
        delete (document.body as any).dataset.prevOverflow;
      };
    }
  }, [previewOpen]);

  async function loadCleanData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions/clean?unlimited=true`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data.items) ? data.items : []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFormFields() {
    try {
      const response = await fetch(`/api/forms/${formId}/fields`);
      if (response.ok) {
        const data = await response.json();
        setFormFields(data.fields || []);
      } else {
        setFormFields([]);
      }
    } catch (error) {
      setFormFields([]);
    }
  }

  useEffect(() => {
    if (formId) {
      loadCleanData();
      loadFormFields();
    }
  }, [formId]);

  // Filter and sort submissions
  const filteredSubmissions = submissions
    .filter(submission => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const responsesText = (Array.isArray(submission.responses)
        ? submission.responses.map(r => (r.value_label || r.value || ""))
        : Object.values(submission.responses as any)
      ).join(" ").toLowerCase();
      return (
        (submission.formCode || "").toLowerCase().includes(searchLower) ||
        (submission.entityName || "").toLowerCase().includes(searchLower) ||
        (submission.utmCampaign || "").toLowerCase().includes(searchLower) ||
        responsesText.includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === 'timestamp') {
        aVal = a.timestamp; bVal = b.timestamp;
      } else if (sortField === 'entityName') {
        aVal = a.entityName; bVal = b.entityName;
      } else if (sortField === 'utmCampaign') {
        aVal = a.utmCampaign; bVal = b.utmCampaign;
      } else {
        // Sort by form field response
        const mapA = Array.isArray(a.responses)
          ? new Map(a.responses.map((r: any) => [r.field_name, r]))
          : new Map(Object.entries(a.responses as any).map(([k, v]: any) => [k, { field_name: k, field_label: k, value: String(v), value_label: String(v) }]));
        const mapB = Array.isArray(b.responses)
          ? new Map(b.responses.map((r: any) => [r.field_name, r]))
          : new Map(Object.entries(b.responses as any).map(([k, v]: any) => [k, { field_name: k, field_label: k, value: String(v), value_label: String(v) }]));
        aVal = mapA.get(sortField)?.value_label || mapA.get(sortField)?.value || "";
        bVal = mapB.get(sortField)?.value_label || mapB.get(sortField)?.value || "";
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatFieldValue = (value: string, fieldType: string) => {
    if (!value) return <span className="text-gray-400">-</span>;
    if (fieldType === 'date') {
      try {
        let date: Date;
        if (value.includes('T') || value.includes('-')) {
          date = new Date(value);
        } else if (value.includes('/')) {
          const parts = value.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            date = new Date(year, month, day);
          } else { return value; }
        } else if (!isNaN(Number(value)) && Number(value) > 0) {
          const serial = Number(value);
          if (serial >= 1 && serial < 100000) {
            const excelEpoch = new Date(1900, 0, 1);
            date = new Date(excelEpoch.getTime() + (serial - 1) * 24 * 60 * 60 * 1000);
          } else { return value; }
        } else { return value; }
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch {}
    }
    if (fieldType === 'datetime') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          });
        }
      } catch {}
    }
    return value;
  };

  // Export current filtered rows to CSV
  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) return;
    const headers = ['Date', 'Entity', 'UTM Campaign', ...formFields.sort((a,b)=>a.sort_order-b.sort_order).map(f => f.field_label || f.field_name)];
    const csvRows: string[][] = filteredSubmissions.map(sub => {
      const map = new Map(sub.responses.map(r => [r.field_name, r]));
      const base = [new Date(sub.timestamp).toLocaleString(), sub.entityName || '', sub.utmCampaignName || sub.utmCampaign || ''];
      const rest = formFields.sort((a,b)=>a.sort_order-b.sort_order).map(f => {
        const r = map.get(f.field_name);
        return (r?.value_label ?? r?.value ?? '') as string;
      });
      return [...base, ...rest];
    });
    const csv = [headers.join(','), ...csvRows.map(row => row.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ogv_clean_data_${formId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open/close preview sidebar with right-click
  const handleCellContextMenu = (e: React.MouseEvent, key: string, title: string, value: string) => {
    e.preventDefault();
    if (previewOpen && previewKey === key) {
      setPreviewOpen(false);
      setPreviewKey(null);
      return;
    }
    setPreviewKey(key);
    setPreviewTitle(title);
    setPreviewValue(value);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <div className="relative min-h-[400px]">
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20 max-w-md w-full mx-4">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative w-24 h-24">
                <Image src="/giphy.gif" alt="Loading animation" fill className="object-contain rounded-lg" priority />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading clean data...</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch the data...</p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
            <input
            type="text"
            placeholder="Search submissions..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
            />
          </div>
          <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
            <button
            type="button"
            onClick={exportToCSV}
            className="ml-2 px-3 py-2 text-sm rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-700/50"
            >
                Export CSV
            </button>
          </div>
        </div>
        
      {/* Summary */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} clean submissions
        </p>
          </div>

      {/* Table */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl border border-gray-200/50 dark:border-gray-600/50 overflow-auto">
        <table className="table-fixed w-full min-w-[960px]">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('timestamp')}>
                Date {sortField === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-52 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('entityName')}>
                Entity {sortField === 'entityName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-56 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('utmCampaign')}>
                UTM Campaign {sortField === 'utmCampaign' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {formFields.sort((a, b) => a.sort_order - b.sort_order).map((field) => (
                <th key={field.id} className="w-60 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort(field.field_name)}>
                  {field.field_label || field.field_name} {sortField === field.field_name && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
            {currentSubmissions.map((submission) => {
              const respMap = Array.isArray(submission.responses)
                ? new Map(submission.responses.map((r: any) => [r.field_name, r]))
                : new Map(Object.entries(submission.responses as any).map(([k, v]: any) => [
                    k,
                    { field_name: k, field_label: (formFields.find(f => f.field_name === k)?.field_label) || k, value: String(v), value_label: String(v) }
                  ]));
              return (
                <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(submission.timestamp).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="block overflow-hidden text-ellipsis" title={submission.entityName || undefined}>
                      {submission.entityName || <span className="text-gray-400">Not allocated</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="block overflow-hidden text-ellipsis" title={(submission.utmCampaignName || submission.utmCampaign) || undefined}>
                      {submission.utmCampaignName || submission.utmCampaign || <span className="text-gray-400">No campaign</span>}
                    </span>
                  </td>
                  {formFields.sort((a, b) => a.sort_order - b.sort_order).map((field) => {
                    const r = respMap.get(field.field_name);
                    const raw = r?.value_label || r?.value || "";
                    const cellKey = `${submission.id}:${field.field_name}`;
                    const title = `${field.field_label || field.field_name}`;
                    return (
                      <td
                        key={field.id}
                        className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 align-top"
                        onContextMenu={(e) => handleCellContextMenu(e, cellKey, title, String(raw))}
                      >
                        <span
                          className="block max-w-[14rem] overflow-hidden text-ellipsis whitespace-nowrap cursor-context-menu"
                          title={String(raw)}
                          onContextMenu={(e) => handleCellContextMenu(e, cellKey, title, String(raw))}
                          onClick={() => copyToClipboard(String(raw))}
                        >
                          {formatFieldValue(raw, field.field_type)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                        );
                      })}
          </tbody>
        </table>
      </div>

      {/* Sidebar Preview */}
      {/* Overlay */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-black/40"
          onClick={() => { setPreviewOpen(false); setPreviewKey(null); }}
        />
      )}
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-[1001] h-full w-[380px] sm:w-[420px] bg-white dark:bg-gray-800 transform transition-transform duration-300 ${previewOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
        role="dialog"
        aria-hidden={!previewOpen}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{previewTitle}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Right-click any cell to preview full value</p>
                    </div>
          <button
            type="button"
            onClick={() => { setPreviewOpen(false); setPreviewKey(null); }}
            className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
                    </div>
        <div className="p-4">
          <div className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words max-h-[calc(100vh-120px)] overflow-auto">
            {previewValue || <span className="text-gray-400">(empty)</span>}
                  </div>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">Page {currentPage} of {totalPages}</div>
                <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
    </div>
  );
}
