"use client";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import SearchableDropdown from "@/components/SearchableDropdown";

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
  // Removed inline allocation in Clean view (only Raw Data supports it)
  
  // Filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedUtmCampaign, setSelectedUtmCampaign] = useState<Set<string>>(new Set());
  const [entities, setEntities] = useState<Array<{ value: string; label: string; count?: number }>>([]);
  
  // Facet filters (like Raw Data)
  const [textQuery, setTextQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<Set<string>>(new Set());
  const [selectedMajor, setSelectedMajor] = useState<Set<string>>(new Set());
  const [selectedStartDate, setSelectedStartDate] = useState<Set<string>>(new Set());
  const [selectedReceiveInfo, setSelectedReceiveInfo] = useState<Set<string>>(new Set());
  const [selectedChannel, setSelectedChannel] = useState<Set<string>>(new Set());
  
  // Field mapping for facet filters (same as Raw Data)
  const FIELD_MAP = {
    year: ["year", "năm", "Year"],
    major: ["major", "ngành", "Major"],
    startDate: [
      "start date",
      "start_date",
      "startdate",
      "desired start",
      "khi nào",
      "thời điểm",
      "thoi diem",
      "ngày bắt đầu",
      "ngay bat dau",
      "plan time",
      "expected time",
      "start",
      "Start Date"
    ],
    receiveInfo: [
      "receive info",
      "receive_info",
      "receiveinfo",
      "subscription",
      "opt in",
      "opt_in",
      "optin",
      "contact preference",
      "nhận thông tin",
      "nhan thong tin",
      "Receive Info"
    ],
    channel: ["channel", "kênh", "Channel"],
    formCode: ["form-code", "form_code", "code", "mã"],
    name: ["name", "tên", "Name"],
    phone: ["phone", "số điện thoại", "sdt", "Phone"],
    email: ["email"],
    uni: ["uni", "university", "trường"],
    otherUni: ["other--uni", "other_uni", "trường khác", "other university"],
  } as const;

  function findFieldValue(sub: Submission, keys: string[]): string {
    const lower = keys.map(k => k.toLowerCase());
    const r = sub.responses.find(r => lower.some(k => r.field_name?.toLowerCase().includes(k) || r.field_label?.toLowerCase().includes(k)));
    return (r?.value_label || r?.value || "").trim();
  }

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

  async function loadFilterOptions() {
    try {
      // Load entities (for filtering) and keep full list for admin allocation
      const entityResponse = await fetch('/api/entities');
      if (entityResponse.ok) {
        const entityData = await entityResponse.json();
        if (entityData.success) {
          setEntities(entityData.items.map((item: any) => ({ value: item.name, label: item.name, count: 0 })));
        }
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }

  useEffect(() => {
    if (formId) {
      loadCleanData();
      loadFormFields();
      loadFilterOptions();
    }
  }, [formId]);

  // No allocate handlers in Clean view

  // Build facet options from current submissions (same as Raw Data)
  const facetOptions = useMemo(() => {
    const collect = (keys: readonly string[]) => {
      const set = new Set<string>();
      submissions.forEach(sub => {
        const v = findFieldValue(sub, Array.from(keys));
        if (v) set.add(v);
      });
      return Array.from(set);
    };

    // Collect entity names
    const entities = new Set<string>();
    submissions.forEach(sub => {
      if (sub.entityName) {
        entities.add(sub.entityName);
      }
    });

    // Collect UTM campaigns
    const utmCampaigns = new Set<string>();
    submissions.forEach(sub => {
      const campaignName = sub.utmCampaignName || sub.utmCampaign;
      if (campaignName) {
        utmCampaigns.add(campaignName);
      }
    });

    return {
      years: collect(FIELD_MAP.year).sort(),
      majors: collect(FIELD_MAP.major).sort(),
      startDates: collect(FIELD_MAP.startDate).sort(),
      receiveInfos: collect(FIELD_MAP.receiveInfo).sort(),
      channels: collect(FIELD_MAP.channel).sort(),
      entities: Array.from(entities).sort(),
      utmCampaigns: Array.from(utmCampaigns).sort(),
    };
  }, [submissions]);

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    const filtered = submissions.filter(submission => {
      // Date range filter
      if (startDate || endDate) {
        const submissionDate = new Date(submission.timestamp);
        if (startDate && submissionDate < new Date(startDate)) return false;
        if (endDate && submissionDate > new Date(endDate + 'T23:59:59')) return false;
      }

      // Text search filter (enhanced like Raw Data)
      if (textQuery.trim()) {
        const q = textQuery.toLowerCase();
        const values = [
          findFieldValue(submission, Array.from(FIELD_MAP.formCode)),
          findFieldValue(submission, Array.from(FIELD_MAP.name)),
          findFieldValue(submission, Array.from(FIELD_MAP.phone)),
          findFieldValue(submission, Array.from(FIELD_MAP.email)),
          findFieldValue(submission, Array.from(FIELD_MAP.uni)),
          findFieldValue(submission, Array.from(FIELD_MAP.otherUni)),
        ];
        if (!values.some(v => v.toLowerCase().includes(q))) return false;
      }

      // Legacy search term filter (for backward compatibility)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const responsesText = (Array.isArray(submission.responses)
          ? submission.responses.map(r => (r.value_label || r.value || ""))
          : Object.values(submission.responses as any)
        ).join(" ").toLowerCase();
        
        const matchesSearch = (
          (submission.formCode || "").toLowerCase().includes(searchLower) ||
          (submission.entityName || "").toLowerCase().includes(searchLower) ||
          (submission.utmCampaign || "").toLowerCase().includes(searchLower) ||
          responsesText.includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Entity filter
      if (selectedEntity && submission.entityName !== selectedEntity) return false;

      // UTM Campaign filter
      if (selectedUtmCampaign.size > 0) {
        const campaignName = submission.utmCampaignName || submission.utmCampaign || '';
        if (!selectedUtmCampaign.has(campaignName)) return false;
      }

      // Facet checks (same as Raw Data)
      const checkSet = (set: Set<string>, keys: readonly string[]) => set.size === 0 || set.has(findFieldValue(submission, Array.from(keys)));

      if (!checkSet(selectedYear, FIELD_MAP.year)) return false;
      if (!checkSet(selectedMajor, FIELD_MAP.major)) return false;
      if (!checkSet(selectedStartDate, FIELD_MAP.startDate)) return false;
      if (!checkSet(selectedReceiveInfo, FIELD_MAP.receiveInfo)) return false;
      if (!checkSet(selectedChannel, FIELD_MAP.channel)) return false;

      return true;
    });

    // Sort filtered results
    return filtered.sort((a, b) => {
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
  }, [submissions, startDate, endDate, textQuery, searchTerm, selectedEntity, selectedUtmCampaign, selectedYear, selectedMajor, selectedStartDate, selectedReceiveInfo, selectedChannel, sortField, sortDirection]);

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
      {/* Date Filter Modal */}
      {showDateFilter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filter by Date Range
              </h3>
              <button
                onClick={() => setShowDateFilter(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setShowDateFilter(false);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
              >
                Clear Filter
              </button>
              <button
                onClick={() => {
                  setShowDateFilter(false);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4">
        {/* Search and main controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search submission-code, name, phone, email, uni, other--uni"
              value={textQuery}
              onChange={(e) => { setTextQuery(e.target.value); setCurrentPage(1); }}
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

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Filter Button */}
          <button
            onClick={() => setShowDateFilter(true)}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
              startDate || endDate
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-gray-50 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Filter by Date
            {(startDate || endDate) && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full">
                Active
              </span>
            )}
          </button>

          {/* Facet Dropdowns (same as Raw Data) */}
          <FacetDropdown title="Year" options={facetOptions.years} selected={selectedYear} onChange={setSelectedYear} />
          <FacetDropdown title="Major" options={facetOptions.majors} selected={selectedMajor} onChange={setSelectedMajor} />
          <FacetDropdown title="Start Date" options={facetOptions.startDates} selected={selectedStartDate} onChange={setSelectedStartDate} />
          <FacetDropdown title="Receive Info" options={facetOptions.receiveInfos} selected={selectedReceiveInfo} onChange={setSelectedReceiveInfo} />
          <FacetDropdown title="Channel" options={facetOptions.channels} selected={selectedChannel} onChange={setSelectedChannel} />
          <FacetDropdown title="Entity" options={facetOptions.entities} selected={new Set(selectedEntity ? [selectedEntity] : [])} onChange={(s) => setSelectedEntity(Array.from(s)[0] || '')} />

          {/* UTM Campaign Filter */}
          <FacetDropdown title="UTM Campaign" options={facetOptions.utmCampaigns} selected={selectedUtmCampaign} onChange={setSelectedUtmCampaign} />

          {/* Clear all filters */}
          {(startDate || endDate || selectedEntity || selectedUtmCampaign.size > 0 || selectedYear.size > 0 || selectedMajor.size > 0 || selectedStartDate.size > 0 || selectedReceiveInfo.size > 0 || selectedChannel.size > 0) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedEntity('');
                setSelectedUtmCampaign(new Set());
                setSelectedYear(new Set());
                setSelectedMajor(new Set());
                setSelectedStartDate(new Set());
                setSelectedReceiveInfo(new Set());
                setSelectedChannel(new Set());
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-700/50"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>
        
      {/* Summary */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} clean submissions
            {filteredSubmissions.length !== submissions.length && (
              <span className="ml-2 text-xs text-gray-500">
                (filtered from {submissions.length} total)
              </span>
            )}
          </p>
          {(startDate || endDate || selectedEntity || selectedUtmCampaign.size > 0 || selectedYear.size > 0 || selectedMajor.size > 0 || selectedStartDate.size > 0 || selectedReceiveInfo.size > 0 || selectedChannel.size > 0) && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Active filters:</span>
              {startDate || endDate ? ' Date' : ''}
              {selectedYear.size > 0 ? ` Year(${selectedYear.size})` : ''}
              {selectedMajor.size > 0 ? ` Major(${selectedMajor.size})` : ''}
              {selectedStartDate.size > 0 ? ` StartDate(${selectedStartDate.size})` : ''}
              {selectedReceiveInfo.size > 0 ? ` ReceiveInfo(${selectedReceiveInfo.size})` : ''}
              {selectedChannel.size > 0 ? ` Channel(${selectedChannel.size})` : ''}
              {selectedEntity ? ' Entity' : ''}
              {selectedUtmCampaign.size > 0 ? ` UTM(${selectedUtmCampaign.size})` : ''}
            </div>
          )}
        </div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" title="Editable in Raw Data only">
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

// FacetDropdown component (same as Raw Data)
function FacetDropdown({ title, options, selected, onChange }: { title: string; options: string[]; selected: Set<string>; onChange: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => options.filter(o => o.toLowerCase().includes(q.toLowerCase())), [options, q]);

  // close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest?.('[data-facet="'+title+'"]')) setOpen(false);
    }
    if (open) document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open, title]);

  const toggle = (v: string) => {
    const s = new Set(selected);
    if (s.has(v)) s.delete(v); else s.add(v);
    onChange(s);
  };

  const selectedCount = selected.size;

  return (
    <div className="relative" data-facet={title}>
      <button onClick={() => setOpen(v => !v)} className="h-10 px-3 rounded-md ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/60 text-sm text-gray-800 dark:text-gray-100 inline-flex items-center gap-2">
        <span className="font-medium">{title}</span>
        <span className="text-gray-500">{selectedCount > 0 ? `(${selectedCount})` : 'Select'}</span>
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-lg ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-gray-800 shadow-lg p-3 max-h-80 overflow-y-auto no-scrollbar">
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search" className="w-full h-9 mb-2 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-2 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white" />
          <div className="space-y-2">
            {filtered.map(o => (
              <label key={o} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                <input type="checkbox" checked={selected.has(o)} onChange={() => toggle(o)} className="w-4 h-4" />
                <span className="truncate" title={o}>{o}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="text-xs text-gray-500">No options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
