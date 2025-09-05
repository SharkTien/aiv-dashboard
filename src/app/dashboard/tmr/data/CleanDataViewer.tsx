"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Submission = {
  id: number;
  formCode: string;
  entityId: number | null;
  entityName: string | null;
  utmCampaign: string | null;
  utmCampaignName: string | null;
  responses: { [key: string]: string };
  timestamp: string;
  duplicated: boolean;
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

  async function loadCleanData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions/clean?unlimited=true`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data.items) ? data.items : []);
      } else {
        console.error("Failed to load clean data");
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Error loading clean data:", error);
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
        console.error("Failed to load form fields");
        setFormFields([]);
      }
    } catch (error) {
      console.error("Error loading form fields:", error);
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
      return (
        submission.formCode?.toLowerCase().includes(searchLower) ||
        submission.entityName?.toLowerCase().includes(searchLower) ||
        submission.utmCampaign?.toLowerCase().includes(searchLower) ||
        Object.values(submission.responses).some(value => 
          value?.toLowerCase().includes(searchLower)
        )
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'timestamp') {
        aVal = a.timestamp;
        bVal = b.timestamp;
      } else if (sortField === 'entityName') {
        aVal = a.entityName;
        bVal = b.entityName;
      } else if (sortField === 'utmCampaign') {
        aVal = a.utmCampaign;
        bVal = b.utmCampaign;
      } else {
        // Sort by form field response
        aVal = a.responses[sortField];
        bVal = b.responses[sortField];
      }
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
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

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFieldValue = (value: string, fieldType: string) => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    if (fieldType === 'date') {
      try {
        // Handle different date formats that might come from the database
        let date: Date;
        
        // If it's already in ISO format or standard format
        if (value.includes('T') || value.includes('-')) {
          date = new Date(value);
        } 
        // If it's in DD/MM/YYYY or MM/DD/YYYY format
        else if (value.includes('/')) {
          const parts = value.split('/');
          if (parts.length === 3) {
            // Try DD/MM/YYYY first (more common in international)
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Month is 0-indexed
            const year = parseInt(parts[2]);
            
            // Validate the date
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
              date = new Date(year, month, day);
            } else {
              // Try MM/DD/YYYY format
              const month2 = parseInt(parts[0]) - 1;
              const day2 = parseInt(parts[1]);
              const year2 = parseInt(parts[2]);
              
              if (day2 >= 1 && day2 <= 31 && month2 >= 0 && month2 <= 11 && year2 >= 1900) {
                date = new Date(year2, month2, day2);
              } else {
                return value; // Return original if can't parse
              }
            }
          } else {
            return value;
          }
        }
        // If it's just a number (Excel serial date)
        else if (!isNaN(Number(value)) && Number(value) > 0) {
          const serialNumber = Number(value);
          // Excel serial date starts from 1900-01-01 (serial number 1 = 1900-01-01)
          // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
          if (serialNumber >= 1 && serialNumber < 100000) {
            // Excel epoch is 1900-01-01, but serial number 1 = 1900-01-01
            // So we subtract 1 to get the correct offset
            const excelEpoch = new Date(1900, 0, 1);
            date = new Date(excelEpoch.getTime() + (serialNumber - 1) * 24 * 60 * 60 * 1000);
          } else {
            return value;
          }
        }
        else {
          return value;
        }
        
        // Check if the date is valid
        if (!isNaN(date.getTime())) {
          // Format as DD/MM/YYYY for better readability
          return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      } catch (e) {
        // Fallback to original value if parsing fails
      }
    }
    
    if (fieldType === 'datetime') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
      } catch (e) {
        // Fallback to original value if parsing fails
      }
    }
    
    return value;
  };

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) return;
    const headers = ['Date', 'Entity', 'UTM Campaign', ...formFields.sort((a,b)=>a.sort_order-b.sort_order).map(f => f.field_label || f.field_name)];
    const csvRows: string[][] = filteredSubmissions.map(sub => {
      const base = [new Date(sub.timestamp).toLocaleString(), sub.entityName || '', sub.utmCampaignName || sub.utmCampaign || ''];
      const rest = formFields.sort((a,b)=>a.sort_order-b.sort_order).map(f => String(sub.responses[f.field_name] ?? ''));
      return [...base, ...rest];
    });
    const csv = [headers.join(','), ...csvRows.map(row => row.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmr_clean_data_${formId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Lock body scroll when sidebar open
  useEffect(() => {
    if (previewOpen) {
      const originalOverflow = document.body.style.overflow;
      (document.body as any).dataset.prevOverflow = originalOverflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = (document.body as any).dataset.prevOverflow || '';
        delete (document.body as any).dataset.prevOverflow;
      };
    }
  }, [previewOpen]);

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
                <Image
                  src="/giphy.gif"
                  alt="Loading animation"
                  fill
                  className="object-contain rounded-lg"
                  priority
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Loading clean data...
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please wait while we fetch the data...
                </p>
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
      {/* Search and Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search submissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
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

      {/* Results Summary */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} clean submissions
        </p>
      </div>

      {/* Table */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl border border-gray-200/50 dark:border-gray-600/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('timestamp')}
                >
                  Date {sortField === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('entityName')}
                >
                  Entity {sortField === 'entityName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('utmCampaign')}
                >
                  UTM Campaign {sortField === 'utmCampaign' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                {/* Dynamic form fields */}
                {formFields
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((field) => (
                    <th 
                      key={field.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort(field.field_name)}
                    >
                      {field.field_label || field.field_name} {sortField === field.field_name && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {currentSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(submission.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {submission.entityName || <span className="text-gray-400">Not allocated</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {submission.utmCampaign || <span className="text-gray-400">No campaign</span>}
                  </td>
                  {/* Dynamic form field values */}
                  {formFields
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((field) => {
                      const raw = String(submission.responses[field.field_name] || '');
                      const cellKey = `${submission.id}:${field.field_name}`;
                      const title = field.field_label || field.field_name;
                      return (
                        <td
                          key={field.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                          onContextMenu={(e) => handleCellContextMenu(e, cellKey, title, raw)}
                        >
                          <span
                            className="block max-w-[14rem] overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                            title={raw}
                            onClick={() => copyToClipboard(raw)}
                            onContextMenu={(e) => handleCellContextMenu(e, cellKey, title, raw)}
                          >
                            {formatFieldValue(raw, field.field_type)}
                          </span>
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sidebar Preview */}
        {previewOpen && (
          <div
            className="fixed inset-0 z-[1000] bg-black/40"
            onClick={() => { setPreviewOpen(false); setPreviewKey(null); }}
          />
        )}
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
