"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownMenu, { DropdownItem } from "@/components/DropdownMenu";

type Form = {
  id: number;
  code: string;
  name: string;
  type: 'oGV' | 'TMR' | 'EWA';
  created_at: string;
  updated_at: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export default function FormsManager() {
  const searchParams = useSearchParams();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'oGV' | 'TMR' | 'EWA'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", type: "oGV" as 'oGV' | 'TMR' | 'EWA' });
  const [duplicatingForm, setDuplicatingForm] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [editFormName, setEditFormName] = useState("");

  async function load(page: number = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });
      
      if (searchTerm.trim()) {
        params.append("q", searchTerm.trim());
      }

      if (typeFilter !== 'all') {
        params.append("type", typeFilter);
      }

      const res = await fetch(`/api/forms?${params}`);
      const data = await res.json();
      
      setForms(Array.isArray(data.items) ? data.items : []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Error loading forms:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Initialize type filter from URL params
    const typeFromUrl = searchParams.get('type');
    if (typeFromUrl && ['oGV', 'TMR', 'EWA'].includes(typeFromUrl)) {
      setTypeFilter(typeFromUrl as 'oGV' | 'TMR' | 'EWA');
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
    load(1);
  }, [searchTerm, typeFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    load(page);
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      
      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({ name: "", type: "oGV" });
        load(currentPage);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create form");
      }
    } catch (error) {
      console.error("Error creating form:", error);
      alert("Failed to create form");
    }
  };

  const handleDeleteForm = async (id: number) => {
    if (!confirm("Are you sure you want to delete this form?")) return;
    
    try {
      const res = await fetch(`/api/forms?id=${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        load(currentPage);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete form");
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Failed to delete form");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied form code: " + text);
    } catch {}
  };

  const handleDuplicateForm = async (formId: number) => {
    if (!confirm("Are you sure you want to duplicate this form? This will create a copy with all fields but no submissions.")) return;
    
    setDuplicatingForm(formId);
    try {
      const res = await fetch(`/api/forms/${formId}/duplicate`, {
        method: "POST",
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`Form duplicated successfully! New form: ${data.newForm.name} (Code: ${data.newForm.code})`);
        load(currentPage);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to duplicate form");
      }
    } catch (error) {
      console.error("Error duplicating form:", error);
      alert("Failed to duplicate form");
    } finally {
      setDuplicatingForm(null);
    }
  };

  const startEditForm = (form: Form) => {
    setEditingForm(form);
    setEditFormName(form.name);
  };

  const handleDropdownAction = (action: () => void) => {
    action();
  };

  const handleEditForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm) return;

    try {
      const res = await fetch(`/api/forms/${editingForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editFormName }),
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`Form updated successfully! New code: ${data.form.code}`);
        setEditingForm(null);
        setEditFormName("");
        load(currentPage);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update form");
      }
    } catch (error) {
      console.error("Error updating form:", error);
      alert("Failed to update form");
    }
  };

  const cancelEdit = () => {
    setEditingForm(null);
    setEditFormName("");
  };

  return (
    <div className="space-y-6">
      {/* Header with search and create */}
      {/* Create Form Modal */}
      {/* Edit Form Name Modal */}
      {editingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={cancelEdit} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white text-slate-900 dark:bg-gray-800 dark:text-white shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Rename Form</h3>
              <form onSubmit={handleEditForm} className="space-y-4">
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Form Name</label>
                  <input
                    type="text"
                    placeholder="Enter new form name"
                    value={editFormName}
                    onChange={(e) => setEditFormName(e.target.value)}
                    className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                    required
                  />
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> The form code will be automatically updated based on the new name.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
                  >
                    Update Form
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 h-11 rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Loading Overlay for Duplicate */}
      <LoadingOverlay 
        isVisible={duplicatingForm !== null} 
        message="Duplicating form..." 
      />
      {/* Modal Create Form */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white text-slate-900 dark:bg-gray-800 dark:text-white shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Form</h3>
              <form onSubmit={handleCreateForm} className="space-y-4">
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Form Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Recruitment 2025"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Form Type</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as 'oGV' | 'TMR' | 'EWA' })}
                    className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                    required
                  >
                    <option key="oGV" value="oGV">oGV</option>
                    <option key="TMR" value="TMR">TMR</option>
                    <option key="EWA" value="EWA">EWA</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  After creating, copy the <span className="font-medium">Form Code</span> and set it as <code>data-form-code</code> on your Webflow form.
                </p>
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
                  >
                    Create Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-11 rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'oGV' | 'TMR' | 'EWA')}
              className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
            >
              <option key="all" value="all">All Types</option>
              <option key="oGV" value="oGV">oGV</option>
              <option key="TMR" value="TMR">TMR</option>
              <option key="EWA" value="EWA">EWA</option>
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
            >
              Create Form
            </button>
          </div>
        </div>
      </div>

      {/* Forms list */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Forms</h3>
          {pagination && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
          )}
        </div>
        
        {loading ? (
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
                      Loading forms...
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
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No forms found
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                        <span className="text-sky-600 dark:text-sky-400 font-semibold text-sm">
                          {form.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {form.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          <span>Form Code:</span>
                          <code className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">{form.code}</code>
                          <button
                            onClick={() => copy(form.code)}
                            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                          >Copy</button>
                          <span className="mx-2">•</span>
                          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            {form.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Created: {new Date(form.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/forms/${form.id}/submissions`}
                      className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                    >
                      View
                    </Link>
                    <DropdownMenu>
                      <DropdownItem onClick={() => handleDropdownAction(() => window.location.href = `/dashboard/forms/${form.id}`)}>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Fields
                        </div>
                      </DropdownItem>
                      <DropdownItem onClick={() => handleDropdownAction(() => startEditForm(form))}>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Rename
                        </div>
                      </DropdownItem>
                      <DropdownItem 
                        onClick={() => handleDropdownAction(() => handleDuplicateForm(form.id))}
                        disabled={duplicatingForm === form.id}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {duplicatingForm === form.id ? 'Duplicating...' : 'Duplicate'}
                        </div>
                      </DropdownItem>
                      <DropdownItem 
                        onClick={() => handleDropdownAction(() => handleDeleteForm(form.id))}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </div>
                      </DropdownItem>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
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
