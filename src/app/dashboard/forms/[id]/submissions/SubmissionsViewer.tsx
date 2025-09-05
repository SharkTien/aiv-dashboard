"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import ExcelTemplate from "./ExcelTemplate";
import LoadingOverlay from "@/components/LoadingOverlay";
import SearchableDropdown from "@/components/SearchableDropdown";

type Form = {
  id: number;
  code: string;
  name: string;
  type: 'oGV' | 'TMR' | 'EWA';
};

type Submission = {
  id: number;
  submitted_at?: string; // legacy
  timestamp?: string;    // new
  entityId?: number | null;
  entityName?: string | null;
  duplicated?: boolean;  // whether this submission is marked as duplicate
  responses: FormResponse[];
};

type FormResponse = {
  field_name: string;
  field_label: string;
  value: string;
  value_label?: string | null;
  field_type?: string;
  field_id?: number;
};

export default function SubmissionsViewer({ formId, options, inlineLoading }: { formId: number; options?: { showBack?: boolean; allowImport?: boolean; allowBulkActions?: boolean; showTemplate?: boolean; showEntity?: boolean }, inlineLoading?: boolean }) {
  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showBulkEditUtm, setShowBulkEditUtm] = useState(false);
  const [bulkUtm, setBulkUtm] = useState<{ utm_campaign?: string; utm_medium?: string; utm_source?: string; utm_content?: string; utm_id?: string }>({});
  const [availableForms, setAvailableForms] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [utmCampaigns, setUtmCampaigns] = useState<Array<{ value: string; label: string; count?: number }>>([]);
  const [selectedTargetForm, setSelectedTargetForm] = useState<number | null>(null);
  
  // Date filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Helper function to format any datetime value (Excel serial, MySQL datetime, etc.)
  const formatDateTime = (value: string, fieldType?: string) => {
    try {
      if (!value || value.trim() === "") {
        return <span className="text-gray-400">(empty)</span>;
      }

      let date: Date;
      
      // Handle Excel serial numbers (e.g., 45522, 45523)
      // Excel serial numbers are typically between 1 and 100000 (representing dates from 1900 to 2173)
      if (/^\d+(\.\d+)?$/.test(value)) {
        const serialNumber = parseFloat(value);
        
        // Check if this looks like a valid Excel serial number (reasonable date range)
        if (serialNumber >= 1 && serialNumber <= 100000) {
          // Excel dates are days since 1900-01-01
          // Note: Excel incorrectly treats 1900 as a leap year, so we need to adjust
          const excelEpoch = new Date(1900, 0, 1);
          const millisecondsPerDay = 24 * 60 * 60 * 1000;
          
          // Adjust for Excel's leap year bug (1900 is not a leap year)
          let adjustedSerial = serialNumber;
          if (serialNumber > 59) {
            adjustedSerial = serialNumber - 1;
          }
          
          date = new Date(excelEpoch.getTime() + (adjustedSerial - 1) * millisecondsPerDay);
          if (isNaN(date.getTime())) {
            // Fall back to other parsing methods
            date = new Date(value);
          }
        } else {
          // Not a valid Excel serial number, try other parsing methods
          date = new Date(value);
        }
      }
      // Handle MySQL DATETIME format: "2024-12-31 07:00:00"
      else if (value.includes(' ') && value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        date = new Date(value.replace(' ', 'T') + '.000Z');
      }
      // Handle ISO format: "2024-12-31T07:00:00.000Z"
      else if (value.includes('T')) {
        date = new Date(value);
      }
      // Handle Unix timestamp (seconds since epoch)
      else if (/^\d{9,13}$/.test(value)) {
        const timestampNum = parseInt(value);
        
        // Check if it's a reasonable Unix timestamp (seconds since epoch)
        // Range: 2000-01-01 to 2030-12-31 (946684800 to 1893456000)
        if (timestampNum >= 946684800 && timestampNum <= 1893456000) {
          date = new Date(timestampNum * 1000);
        }
        // Check if it's a reasonable milliseconds timestamp
        // Range: 2000-01-01 to 2030-12-31 (946684800000 to 1893456000000)
        else if (timestampNum >= 946684800000 && timestampNum <= 1893456000000) {
          date = new Date(timestampNum);
        } else {
          // Fall back to Date parsing
          date = new Date(value);
        }
      }
      else {
        // Attempt to parse as a general date string (e.g., 2024-12-31)
        date = new Date(value);
      }

      if (isNaN(date.getTime())) {
        return value;
      }

      // Respect explicit field type for output format
      if (fieldType === 'date') {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      if (fieldType === 'datetime') {
        return date.toLocaleString('en-GB', { 
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
      }

      // Default formatting
      return date.toLocaleString();
    } catch (error) {
      return value;
    }
  };

  async function loadData() {
    try {
      // Load form info
      const formRes = await fetch(`/api/forms/${formId}`);
      if (formRes.ok) {
        const formData = await formRes.json();
        setForm(formData.form);
      } else {
        console.error("Failed to load form:", formRes.status, formRes.statusText);
      }

      // Load submissions
      const submissionsRes = await fetch(`/api/forms/${formId}/submissions`);
      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        setSubmissions(Array.isArray(submissionsData.items) ? submissionsData.items : []);
      } else {
        console.error("Failed to load submissions:", submissionsRes.status, submissionsRes.statusText);
        const errorData = await submissionsRes.json().catch(() => ({}));
        console.error("Error details:", errorData);
      }
    } catch (error) {
      console.error("Error in loadData:", error);
    }
    setLoading(false);
  }

  async function loadAvailableForms() {
    try {
      const response = await fetch('/api/forms?limit=1000');
      if (response.ok) {
        const data = await response.json();
        // Filter out current form
        const otherForms = data.items.filter((f: any) => f.id !== formId);
        setAvailableForms(otherForms);
      }
    } catch (error) {
      console.error("Error loading available forms:", error);
    }
  }

  async function loadUtmCampaigns() {
    try {
      const response = await fetch(`/api/forms/${formId}/utm-campaigns`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUtmCampaigns(data.data.options);
        }
      }
    } catch (error) {
      console.error("Error loading UTM campaigns:", error);
    }
  }

  async function handleMoveSubmissions() {
    if (!selectedTargetForm || selectedSubmissions.size === 0) {
      return;
    }

    setMoving(true);
    try {
      const response = await fetch(`/api/forms/${formId}/submissions/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionIds: Array.from(selectedSubmissions),
          targetFormId: selectedTargetForm
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload data and reset selection
        await loadData();
        setSelectedSubmissions(new Set());
        setIsSelectAll(false);
        setShowMoveModal(false);
        setSelectedTargetForm(null);
        
        // Show success message
        alert(result.message);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error moving submissions:", error);
      alert("Failed to move submissions");
    } finally {
      setMoving(false);
    }
  }

  useEffect(() => {
    loadData();
    loadFormFields();
    loadUtmCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  // Listen for export event
  useEffect(() => {
    const handleExport = (event: CustomEvent) => {
      if (event.detail?.type === 'raw') {
        exportToCSV();
      }
    };

    window.addEventListener('exportCSV', handleExport as EventListener);
    return () => {
      window.removeEventListener('exportCSV', handleExport as EventListener);
    };
  }, []);

  useEffect(() => {
    if (showMoveModal) {
      loadAvailableForms();
    }
  }, [showMoveModal]);

  // Get form fields for template
  const [formFields, setFormFields] = useState<Array<{ field_name: string; field_label: string; field_type: string }>>([]);

  // Text search across key fields
  const [textQuery, setTextQuery] = useState("");
  // Facet filters
  const [selectedYear, setSelectedYear] = useState<Set<string>>(new Set());
  const [selectedMajor, setSelectedMajor] = useState<Set<string>>(new Set());
  const [selectedStartDate, setSelectedStartDate] = useState<Set<string>>(new Set());
  const [selectedReceiveInfo, setSelectedReceiveInfo] = useState<Set<string>>(new Set());
  const [selectedChannel, setSelectedChannel] = useState<Set<string>>(new Set());
  const [selectedEntity, setSelectedEntity] = useState<Set<string>>(new Set());

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
    name: ["name", "họ tên", "full name"],
    phone: ["phone", "số điện thoại"],
    email: ["email"],
    uni: ["uni", "university", "trường"],
    otherUni: ["other--uni", "other_uni", "trường khác", "other university"],
  } as const;

  function findFieldValue(sub: Submission, keys: string[]): string {
    const lower = keys.map(k => k.toLowerCase());
    const r = sub.responses.find(r => lower.some(k => r.field_name?.toLowerCase().includes(k) || r.field_label?.toLowerCase().includes(k)));
    return (r?.value_label || r?.value || "").trim();
  }

  // Reset to first page when submissions change
  useEffect(() => {
    setCurrentPage(1);
  }, [submissions]);

  // Reset select all state when page changes
  useEffect(() => {
    setIsSelectAll(false);
  }, [currentPage]);

  // Update select all state when current submissions change
  useEffect(() => {
    const currentSubmissions = submissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    if (currentSubmissions.length > 0) {
      const allCurrentSelected = currentSubmissions.every(sub => selectedSubmissions.has(sub.id));
      setIsSelectAll(allCurrentSelected);
    } else {
      setIsSelectAll(false);
    }
  }, [submissions, currentPage, itemsPerPage, selectedSubmissions]);

  const fieldHeaders = useMemo(() => {
    // Use formFields to show all fields, even if they don't have submissions yet
    // Filter out 'timestamp' field since we have a separate "Submission Time" column
    const headers = formFields
      .filter(field => field.field_name !== 'timestamp')
      .map(field => ({
        name: field.field_name,
        label: field.field_label
      }));
    return headers;
  }, [formFields]);

  async function loadFormFields() {
    try {
      const response = await fetch(`/api/forms/${formId}/fields`);
      if (response.ok) {
        const data = await response.json();
        setFormFields(data.fields || []);
      } else {
        console.error("Failed to load form fields:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error loading form fields:", error);
    }
  }

  // Build facet options from current submissions
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

    return {
      years: collect(FIELD_MAP.year).sort(),
      majors: collect(FIELD_MAP.major).sort(),
      startDates: collect(FIELD_MAP.startDate).sort(),
      receiveInfos: collect(FIELD_MAP.receiveInfo).sort(),
      channels: collect(FIELD_MAP.channel).sort(),
      entities: Array.from(entities).sort(),
    };
  }, [submissions]);

  // Filter submissions by date range + facets + text query
  const filteredSubmissions = useMemo(() => {
    if (!startDate && !endDate) {
      // Continue to facet/text filtering
    }

    return submissions.filter(submission => {
      const submissionDate = submission.timestamp || submission.submitted_at;

      // Date range check
      if ((startDate || endDate) && submissionDate) {
        let date: Date;
        if (submissionDate.includes(' ') && submissionDate.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
          date = new Date(submissionDate.replace(' ', 'T') + '.000Z');
        } else if (submissionDate.includes('T')) {
          date = new Date(submissionDate);
        } else {
          date = new Date(submissionDate);
        }
        if (isNaN(date.getTime())) return false;
        const submissionDateOnly = date.toISOString().split('T')[0];
        if (startDate && endDate && !(submissionDateOnly >= startDate && submissionDateOnly <= endDate)) return false;
        if (startDate && !endDate && !(submissionDateOnly >= startDate)) return false;
        if (!startDate && endDate && !(submissionDateOnly <= endDate)) return false;
      }

      // Text search over key fields
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

      // Facet checks
      const checkSet = (set: Set<string>, keys: readonly string[]) => set.size === 0 || set.has(findFieldValue(submission, Array.from(keys)));

      if (!checkSet(selectedYear, FIELD_MAP.year)) return false;
      if (!checkSet(selectedMajor, FIELD_MAP.major)) return false;
      if (!checkSet(selectedStartDate, FIELD_MAP.startDate)) return false;
      if (!checkSet(selectedReceiveInfo, FIELD_MAP.receiveInfo)) return false;
      if (!checkSet(selectedChannel, FIELD_MAP.channel)) return false;
      
      // Entity filter
      if (selectedEntity.size > 0 && !selectedEntity.has(submission.entityName || '')) return false;
      
      return true;
    });
  }, [submissions, startDate, endDate, textQuery, selectedYear, selectedMajor, selectedStartDate, selectedReceiveInfo, selectedChannel, selectedEntity]);

  // Pagination logic
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  
  // Get current page submissions
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await fetch(`/api/forms/${formId}/import`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      const result = await response.json();

      if (response.ok) {
        setImportResult({ success: true, message: result.message, details: result.details });
        // Reload submissions after successful import
        await loadData();
      } else {
        setImportResult({ success: false, message: result.error || "Import failed" });
      }
    } catch (error) {
      setImportResult({ success: false, message: "Network error during import" });
    } finally {
      setTimeout(() => {
        setImporting(false);
        setImportProgress(0);
      }, 1000); // Show 100% for 1 second
      // Reset file input
      event.target.value = "";
    }
  };

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) return;

    // Prepare CSV data - export all filtered data, not just current page
    const csvHeaders = ['Timestamp', 'Entity', ...fieldHeaders.map(h => h.label)];
    const csvRows = filteredSubmissions.map(sub => {
      const map = new Map(sub.responses.map((r) => [r.field_name, r]));
      const ts = (sub.timestamp || sub.submitted_at) as string;
      const timestamp = new Date(ts).toLocaleString();
      
      const row = [timestamp, sub.entityName || 'No entity'];
      fieldHeaders.forEach(h => {
        const resp = map.get(h.name) as FormResponse | undefined;
        const display = resp?.value_label || resp?.value || "";
        row.push(display);
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
    link.setAttribute('download', `raw_data_${form?.name || 'submissions'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk action functions
  const handleSelectAll = () => {
    if (isSelectAll) {
      // Deselect only current page submissions
      const newSelected = new Set(selectedSubmissions);
      currentSubmissions.forEach(sub => {
        newSelected.delete(sub.id);
      });
      setSelectedSubmissions(newSelected);
      setIsSelectAll(false);
    } else {
      // Select only current page submissions
      const newSelected = new Set(selectedSubmissions);
      currentSubmissions.forEach(sub => {
        newSelected.add(sub.id);
      });
      setSelectedSubmissions(newSelected);
      setIsSelectAll(true);
    }
  };

  const handleSelectSubmission = (submissionId: number) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(submissionId)) {
      newSelected.delete(submissionId);
    } else {
      newSelected.add(submissionId);
    }
    setSelectedSubmissions(newSelected);
    
    // Check if all current page submissions are selected
    const currentPageSelected = currentSubmissions.every(sub => newSelected.has(sub.id));
    setIsSelectAll(currentPageSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedSubmissions.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedSubmissions.size} submission(s)? This action cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/forms/${formId}/submissions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionIds: Array.from(selectedSubmissions)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSelectedSubmissions(new Set());
        setIsSelectAll(false);
        await loadData();
        setImportResult({
          success: true,
          message: result.message
        });
      } else {
        setImportResult({
          success: false,
          message: result.error || 'Failed to delete submissions'
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Failed to delete submissions'
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return inlineLoading ? (
      <div className="p-6 text-sm text-gray-600 dark:text-gray-300">Loading submissions...</div>
    ) : (
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
                  Loading submissions...
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
        <div className="opacity-0">
          <div className="space-y-6">
            <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
            </div>
            <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl border border-gray-200/50 dark:border-gray-600/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-600/50">
                <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Form not found</div>;
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {(startDate || endDate) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Filter:</strong> {startDate || 'Any'} to {endDate || 'Any'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
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
      {/* Move Submissions Modal */}
      {options?.allowBulkActions !== false && showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Move Submissions
              </h3>
              <button
                onClick={() => setShowMoveModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Move {selectedSubmissions.size} selected submission{selectedSubmissions.size !== 1 ? 's' : ''} to another form.
              </p>
              
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Target Form:
              </label>
              <select
                value={selectedTargetForm || ''}
                onChange={(e) => setSelectedTargetForm(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a form...</option>
                {availableForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name} ({form.code})
                  </option>
                ))}
              </select>
              
              {availableForms.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  No other forms available.
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveSubmissions}
                disabled={!selectedTargetForm || moving}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {moving ? 'Moving...' : 'Move Submissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit UTM Modal */}
      {options?.allowBulkActions !== false && showBulkEditUtm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowBulkEditUtm(false)}>
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bulk Edit UTM fields</h3>
              <button onClick={() => setShowBulkEditUtm(false)} className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">Close</button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* UTM Campaign with SearchableDropdown */}
              <div>
                <SearchableDropdown
                  title="utm_campaign"
                  options={utmCampaigns}
                  value={bulkUtm.utm_campaign || ''}
                  onChange={(value) => setBulkUtm({ ...bulkUtm, utm_campaign: value })}
                  placeholder="Type to search campaigns..."
                />
              </div>
              
              {/* Other UTM fields with regular inputs */}
              {(["utm_medium","utm_source","utm_content","utm_id"] as const).map((k) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{k}</label>
                  <input
                    value={(bulkUtm as any)[k] || ''}
                    onChange={(e) => setBulkUtm({ ...bulkUtm, [k]: e.target.value })}
                    placeholder={`Set ${k} (leave empty to skip)`}
                    className="w-full h-10 rounded-lg ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              <button onClick={() => setShowBulkEditUtm(false)} className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
              <button
                onClick={async () => {
                  const updates = Object.fromEntries(Object.entries(bulkUtm).filter(([_,v]) => typeof v === 'string' && v.trim().length > 0).map(([k,v]) => [k, (v as string).trim()]));
                  if (Object.keys(updates).length === 0) { setShowBulkEditUtm(false); return; }
                  try {
                    const res = await fetch(`/api/forms/${formId}/submissions/bulk-edit-utm`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ submissionIds: Array.from(selectedSubmissions), updates })
                    });
                    if (res.ok) {
                      alert('Updated successfully');
                      setShowBulkEditUtm(false);
                      setBulkUtm({});
                      // Refresh data
                      await loadData();
                    } else {
                      const err = await res.json().catch(() => ({}));
                      alert(err.error || 'Failed to update');
                    }
                  } catch (e) { alert('Failed to update'); }
                }}
                className="px-3 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
              >
                Apply to {selectedSubmissions.size} selected
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Form Info */}
      <div className="bg-white/60 !overflow-visible dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{form.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">Code: {form.code}</p>
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                {form.type}
              </span>
            </div>
          </div>
          {options?.showBack !== false && (
            <Link
              href={`/dashboard/forms/${formId}`}
              className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
            >
              Back to Form
            </Link>
          )}
        </div>
      </div>

      {/* Excel Template */}
      {options?.showTemplate !== false && formFields.length > 0 && (
        <ExcelTemplate fields={formFields} formName={form?.name || 'Form'} />
      )}

      {/* Submissions Table */}
      <div className="bg-white/60 !overflow-visible dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50 overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Submissions ({filteredSubmissions.length})
              {startDate || endDate ? (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (filtered from {submissions.length} total)
                </span>
              ) : null}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Showing {fieldHeaders.length} fields • {currentSubmissions.length} submissions on this page
              {selectedSubmissions.size > 0 && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                  • {selectedSubmissions.size} selected
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
              {options?.allowBulkActions !== false && selectedSubmissions.size > 0 && (
                <>
                  <button
                    onClick={() => setShowMoveModal(true)}
                    disabled={moving}
                    className="px-3 py-2 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    {moving ? 'Moving...' : `Move ${selectedSubmissions.size}`}
                  </div>
                </button>
                <button
                  onClick={() => setShowBulkEditUtm(true)}
                  className="px-3 py-2 text-sm rounded-lg bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12"/></svg>
                    Edit UTM ({selectedSubmissions.size})
                  </div>
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="px-3 py-2 text-sm rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {deleting ? 'Deleting...' : `Delete ${selectedSubmissions.size}`}
                  </div>
                </button>
                </>
              )}
              {filteredSubmissions.length > 0 && (
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length}
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600 dark:text-gray-300">Show:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reset to first page
                        setSelectedSubmissions(new Set()); // Clear selections
                        setIsSelectAll(false);
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option key="5" value={5}>5</option>
                      <option key="10" value={10}>10</option>
                      <option key="25" value={25}>25</option>
                      <option key="50" value={50}>50</option>
                      <option key="100" value={100}>100</option>
                      <option key="500" value={500}>500</option>
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-300">per page</span>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2">
                {/* Date Filter Button */}
                <button
                  onClick={() => setShowDateFilter(true)}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    startDate || endDate
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-50 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Filter by Date
                    {(startDate || endDate) && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </button>
                
                {filteredSubmissions.length > 0 && (
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
                )}
              {options?.allowImport !== false && (
                <label className="relative cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileImport}
                    className="hidden"
                    disabled={importing}
                  />
                  <span className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    importing
                      ? 'bg-gray-100 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                  }`}>
                    {importing ? 'Importing...' : 'Import Excel'}
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Facet Filters (dropdowns) */}
        <div className="flex flex-wrap gap-3 mb-4">
            <div className="hidden md:block">
              <label className="sr-only">Search</label>
              <input
                value={textQuery}
                onChange={(e) => { setTextQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search submission-code, name, phone, email, uni, other--uni"
                className="h-10 w-80 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          <FacetDropdown title="Year" options={facetOptions.years} selected={selectedYear} onChange={setSelectedYear} />
          <FacetDropdown title="Major" options={facetOptions.majors} selected={selectedMajor} onChange={setSelectedMajor} />
          <FacetDropdown title="Start Date" options={facetOptions.startDates} selected={selectedStartDate} onChange={setSelectedStartDate} />
          <FacetDropdown title="Receive Info" options={facetOptions.receiveInfos} selected={selectedReceiveInfo} onChange={setSelectedReceiveInfo} />
          <FacetDropdown title="Channel" options={facetOptions.channels} selected={selectedChannel} onChange={setSelectedChannel} />
          <FacetDropdown title="Entity" options={facetOptions.entities} selected={selectedEntity} onChange={setSelectedEntity} />
        </div>
              {/* Loading Overlay for Import */}
      {options?.allowImport !== false && (
        <LoadingOverlay
          isVisible={importing}
          message="Importing submissions..."
          progress={importProgress}
          showProgress={true}
        />
      )}
      <LoadingOverlay
        isVisible={deleting && options?.allowBulkActions !== false}
        message="Deleting submissions..."
      />
        {/* Import Result Message */}
        {options?.allowImport !== false && importResult && (
          <div className={`mb-4 p-4 rounded-lg ${
            importResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className={`text-sm font-medium ${
              importResult.success 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {importResult.message}
            </div>
            {importResult.details && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                <div>Total rows: {importResult.details.totalRows}</div>
                <div>Success: {importResult.details.successCount}</div>
                <div>Failed: {importResult.details.errorCount}</div>
                {importResult.details.duplicateCount > 0 && (
                  <div className="text-orange-600 dark:text-orange-400">
                    Skipped duplicates: {importResult.details.duplicateCount}
                  </div>
                )}
                {importResult.details.formCodeField && (
                  <div>Duplicate check: {importResult.details.formCodeField}</div>
                )}
                {importResult.details.validFields && (
                  <div>Matched fields: {importResult.details.validFields.join(", ")}</div>
                )}
                {importResult.details.errors && importResult.details.errors.length > 0 && (
                  <div className="mt-1">
                    <div className="font-medium">Errors:</div>
                    {importResult.details.errors.map((error: string, index: number) => (
                      <div key={index} className="text-red-600 dark:text-red-400">• {error}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No submissions yet</div>
        ) : (
          <>
            <div className="relative w-full max-w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-500">
              <table className="min-w-max text-sm">
                <thead>
                  <tr className="text-left bg-gray-50 dark:bg-gray-800/60">
                    <th className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelectAll}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                    </th>
                    <th className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">Timestamp</th>
                    {options?.showEntity !== false && (
                      <th className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">Entity</th>
                    )}
                    {fieldHeaders.map((h) => (
                      <th key={h.name} className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentSubmissions.map((sub) => {
                    // Build a field_name -> response map
                    const map = new Map(sub.responses.map((r) => [r.field_name, r]));
                    const ts = (sub.timestamp || sub.submitted_at) as string;
                    
                    return (
                      <tr key={sub.id} className="border-t border-gray-200/60 dark:border-gray-600/60">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedSubmissions.has(sub.id)}
                              onChange={() => handleSelectSubmission(sub.id)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {(() => {
                            try {
                              // Use the formatDateTime function for consistent formatting
                              return formatDateTime(ts);
                            } catch (error) {
                              console.error('Error formatting submission timestamp:', ts, error);
                              return <span className="text-gray-400">Error parsing date</span>;
                            }
                          })()}
                        </td>
                        {options?.showEntity !== false && (
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {sub.entityName ? (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                {sub.entityName}
                              </span>
                            ) : (
                              <span className="text-gray-400">NOT FOUND</span>
                            )}
                          </td>
                        )}
                        {fieldHeaders.map((h) => {
                          const resp = map.get(h.name) as FormResponse | undefined;
                          const fieldValue = resp?.value || "";
                          const display = resp?.value_label || fieldValue || "";
                          
                          // Prefer explicit field_type from response; fallback to heuristic by field name
                          const fieldType = resp?.field_type;
                          const nameLower = h.name.toLowerCase();
                          const looksLikeDateValue = /\d{2,4}[\/-]\d{1,2}|T\d{2}:\d{2}|^\d{9,13}$/.test(fieldValue)
                            || (/^\d+$/.test(fieldValue) && Number(fieldValue) >= 1 && Number(fieldValue) < 100000);
                          const isDateLikeHeader = nameLower.includes('time') || nameLower.includes('timestamp') || nameLower.includes('date');
                          const shouldFormatByType = (fieldType === 'date' || fieldType === 'datetime') && looksLikeDateValue;
                          const shouldFormatByName = isDateLikeHeader && looksLikeDateValue;
                          const displayNode = (shouldFormatByType || shouldFormatByName) ? formatDateTime(fieldValue, fieldType) : (display || "");
                          
                          return (
                            <td
                              key={h.name}
                              className="px-3 py-2 max-w-48 text-gray-900 dark:text-white align-top whitespace-nowrap overflow-clip cursor-pointer"
                              title={display}
                              onClick={() => {
                                if (display) {
                                  navigator.clipboard.writeText(display).then(() => {
                                    const toast = document.createElement('div');
                                    toast.textContent = 'Copied!';
                                    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 text-sm animate-fade-in';
                                    document.body.appendChild(toast);
                                    setTimeout(() => {
                                      toast.classList.add('opacity-0');
                                      setTimeout(() => document.body.removeChild(toast), 400);
                                    }, 1200);
                                  });
                                }
                              }}
                            >
                              <span className="block overflow-clip text-ellipsis" style={{ maxWidth: '12rem' }}>
                                {displayNode || <span className="text-gray-400">(empty)</span>}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>      
    </div>
  );
}

function Facet({ title, options, selected, onChange }: { title: string; options: string[]; selected: Set<string>; onChange: (s: Set<string>) => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => options.filter(o => o.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const toggle = (v: string) => {
    const s = new Set(selected);
    if (s.has(v)) s.delete(v); else s.add(v);
    onChange(s);
  };
  return (
    <div className="rounded-lg ring-1 ring-black/10 dark:ring-white/10 p-3 bg-white/70 dark:bg-gray-800/70 max-h-80 overflow-y-auto thin-scrollbar">
      <div className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">{title}</div>
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
  );
}

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
