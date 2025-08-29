"use client";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import LoadingOverlay from "@/components/LoadingOverlay";

type CleanSubmission = {
  id: number;
  timestamp: string;
  entityId: number | null;
  entityName: string | null;
  responses: CleanFormResponse[];
};

type CleanFormResponse = {
  field_name: string;
  field_label: string;
  value: string;
  value_label?: string | null;
};

type FacetOption = {
  value: string;
  label: string;
  count: number;
};

type FacetOptions = {
  years: FacetOption[];
  majors: FacetOption[];
  startDates: FacetOption[];
  receiveInfos: FacetOption[];
  channels: FacetOption[];
  entities: FacetOption[];
};

export default function CleanDataViewer({ formId }: { formId: number }) {
  const [submissions, setSubmissions] = useState<CleanSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [textQuery, setTextQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const [selectedReceiveInfo, setSelectedReceiveInfo] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  useEffect(() => {
    loadCleanData();
  }, [formId]);

  // Listen for export event
  useEffect(() => {
    const handleExport = (event: CustomEvent) => {
      if (event.detail?.type === 'clean') {
        exportToCSV();
      }
    };

    window.addEventListener('exportCSV', handleExport as EventListener);
    return () => {
      window.removeEventListener('exportCSV', handleExport as EventListener);
    };
  }, []);

  async function loadCleanData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions/clean`);
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

  // Generate facet options from submissions
  const facetOptions = useMemo(() => {
    const options: FacetOptions = {
      years: [],
      majors: [],
      startDates: [],
      receiveInfos: [],
      channels: [],
      entities: []
    };

    const yearCounts = new Map<string, number>();
    const majorCounts = new Map<string, number>();
    const startDateCounts = new Map<string, number>();
    const receiveInfoCounts = new Map<string, number>();
    const channelCounts = new Map<string, number>();
    const entityCounts = new Map<string, number>();

    submissions.forEach(submission => {
      // Count entities
      const entityName = submission.entityName || "Unknown";
      entityCounts.set(entityName, (entityCounts.get(entityName) || 0) + 1);

      // Count other fields from responses
      submission.responses.forEach(response => {
        const value = response.value_label || response.value;
        
        switch (response.field_name) {
          case 'birth':
            const year = value.split('-')[0] || value;
            yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
            break;
          case 'Major':
            majorCounts.set(value, (majorCounts.get(value) || 0) + 1);
            break;
          case 'startdate':
            startDateCounts.set(value, (startDateCounts.get(value) || 0) + 1);
            break;
          case 'ReceiveInformation':
            receiveInfoCounts.set(value, (receiveInfoCounts.get(value) || 0) + 1);
            break;
          case 'Channel':
            channelCounts.set(value, (channelCounts.get(value) || 0) + 1);
            break;
        }
      });
    });

    // Convert to arrays
    options.years = Array.from(yearCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    options.majors = Array.from(majorCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    options.startDates = Array.from(startDateCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    options.receiveInfos = Array.from(receiveInfoCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    options.channels = Array.from(channelCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    options.entities = Array.from(entityCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    return options;
  }, [submissions]);

  // Filter submissions based on selected filters
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(submission => {
      // Text search
      if (textQuery) {
        const searchText = textQuery.toLowerCase();
        const hasMatch = submission.responses.some(response => {
          const value = response.value_label || response.value;
          return value.toLowerCase().includes(searchText);
        });
        if (!hasMatch) return false;
      }

      // Entity filter
      if (selectedEntity) {
        const entityName = submission.entityName || "Unknown";
        if (entityName !== selectedEntity) return false;
      }

      // Other filters
      const hasYearMatch = !selectedYear || submission.responses.some(r => 
        r.field_name === 'birth' && (r.value_label || r.value).split('-')[0] === selectedYear
      );
      if (!hasYearMatch) return false;

      const hasMajorMatch = !selectedMajor || submission.responses.some(r => 
        r.field_name === 'Major' && (r.value_label || r.value) === selectedMajor
      );
      if (!hasMajorMatch) return false;

      const hasStartDateMatch = !selectedStartDate || submission.responses.some(r => 
        r.field_name === 'startdate' && (r.value_label || r.value) === selectedStartDate
      );
      if (!hasStartDateMatch) return false;

      const hasReceiveInfoMatch = !selectedReceiveInfo || submission.responses.some(r => 
        r.field_name === 'ReceiveInformation' && (r.value_label || r.value) === selectedReceiveInfo
      );
      if (!hasReceiveInfoMatch) return false;

      const hasChannelMatch = !selectedChannel || submission.responses.some(r => 
        r.field_name === 'Channel' && (r.value_label || r.value) === selectedChannel
      );
      if (!hasChannelMatch) return false;

      return true;
    });
  }, [submissions, textQuery, selectedEntity, selectedYear, selectedMajor, selectedStartDate, selectedReceiveInfo, selectedChannel]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) return;

    // Get all field names from responses - export all filtered data, not just current page
    const allFieldNames = new Set<string>();
    filteredSubmissions.forEach(submission => {
      submission.responses.forEach(response => {
        allFieldNames.add(response.field_name);
      });
    });

    const fieldNames = Array.from(allFieldNames).sort();

    // Prepare CSV data
    const csvHeaders = ['Timestamp', 'Entity', ...fieldNames.map(name => {
      const response = filteredSubmissions[0]?.responses.find(r => r.field_name === name);
      return response?.field_label || name;
    })];

    const csvRows = filteredSubmissions.map(sub => {
      const ts = sub.timestamp;
      const timestamp = new Date(ts).toLocaleString();
      
      const row = [timestamp, sub.entityName || 'No entity'];
      
      fieldNames.forEach(fieldName => {
        const response = sub.responses.find(r => r.field_name === fieldName);
        const value = response?.value_label || response?.value || "";
        row.push(value);
      });
      
      return row;
    });

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clean_data_form_${formId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Facet Dropdown Component
  const FacetDropdown = ({ title, options, selected, onChange }: {
    title: string;
    options: FacetOption[];
    selected: string;
    onChange: (value: string) => void;
  }) => (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50"
      >
        <option value="">{title}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </div>
  );

  if (loading) {
    return (
      <div className="relative min-h-[400px]">
        {/* Custom loading overlay for this section */}
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20 max-w-md w-full mx-4">
            <div className="flex flex-col items-center space-y-6">
              {/* Loading animation */}
              <div className="relative w-24 h-24">
                <Image
                  src="/giphy.gif"
                  alt="Loading animation"
                  fill
                  className="object-contain rounded-lg"
                  priority
                />
              </div>

              {/* Loading text */}
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Loading clean data...
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please wait while we fetch the data...
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Placeholder content to maintain layout */}
        <div className="space-y-6 opacity-0">
          <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
            <div className="flex flex-wrap gap-3">
              <div className="hidden md:block">
                <input className="h-10 w-80 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
            <div className="h-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex flex-wrap gap-3">
          <div className="hidden md:block">
            <label className="sr-only">Search</label>
            <input
              value={textQuery}
              onChange={(e) => { setTextQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search submission-code, name, phone, email, uni, other--uni"
              className="h-10 w-80 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <FacetDropdown title="Entity" options={facetOptions.entities} selected={selectedEntity} onChange={setSelectedEntity} />
          <FacetDropdown title="Year" options={facetOptions.years} selected={selectedYear} onChange={setSelectedYear} />
          <FacetDropdown title="Major" options={facetOptions.majors} selected={selectedMajor} onChange={setSelectedMajor} />
          <FacetDropdown title="Start Date" options={facetOptions.startDates} selected={selectedStartDate} onChange={setSelectedStartDate} />
          <FacetDropdown title="Receive Info" options={facetOptions.receiveInfos} selected={selectedReceiveInfo} onChange={setSelectedReceiveInfo} />
          <FacetDropdown title="Channel" options={facetOptions.channels} selected={selectedChannel} onChange={setSelectedChannel} />
        </div>
      </div>

      {/* Results */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Clean Data ({filteredSubmissions.length} submissions)
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} results
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV()}
              className="px-3 py-2 text-sm rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 font-medium transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </div>
            </button>
          </div>
        </div>
        
        {currentSubmissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No clean submissions found
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {currentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        Submission #{submission.id}
                      </div>
                      {submission.entityName && (
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                          {submission.entityName}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {submission.responses.map((response, index) => (
                        <span key={index} className="mr-4">
                          <strong>{response.field_label}:</strong> {response.value_label || response.value}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(submission.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    Next
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Show:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                  <span className="text-sm text-gray-600 dark:text-gray-300">per page</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
