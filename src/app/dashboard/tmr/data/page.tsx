"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import SubmissionsViewer from "@/app/dashboard/forms/[id]/submissions/SubmissionsViewer";
import CleanDataViewer from "./CleanDataViewer";
import ManualAllocateViewer from "./ManualAllocateViewer";
import LoadingOverlay from "@/components/LoadingOverlay";
import Link from "next/link";

type TabType = 'raw' | 'clean' | 'manual';

type Form = {
  id: number;
  code: string;
  name: string;
  type: 'oGV' | 'TMR' | 'EWA';
  created_at: string;
  updated_at: string;
};

export default function Page() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>('raw');

  async function loadForms(query: string) {
    setLoadingForms(true);
    try {
      const params = new URLSearchParams({ limit: "50", type: "TMR" });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/forms?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        setForms(items);
        // Default select newest by created_at (API already orders by created_at DESC)
        if (!selectedFormId && items.length > 0) setSelectedFormId(items[0].id);
      }
    } finally { setLoadingForms(false); }
  }

  // Debounced search - this will handle both initial load and search
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { 
      loadForms(q).finally(() => setLoading(false));
    }, q === "" ? 0 : 350); // No delay for initial load, 350ms delay for search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">TMR Data</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Latest TMR form submissions.</p>
        </div>

      </div>

      <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-gray-800/80 backdrop-blur p-6 space-y-4">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('raw')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'raw'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Raw Data
            </button>
            <button
              onClick={() => setActiveTab('clean')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'clean'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Clean Data
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'manual'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Manual Allocate
            </button>
          </nav>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Select Phase</label>
            <div className="flex gap-2">
              <select value={selectedFormId?.toString() || ''} onChange={(e) => setSelectedFormId(e.target.value ? Number(e.target.value) : null)} className="flex-1 h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all">
                {forms.length === 0 ? (
                  <option value="">{loadingForms ? 'Loading…' : 'No forms found'}</option>
                ) : (
                  forms.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))
                )}
              </select>

            </div>
          </div>
          
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
                      Loading form data...
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
        ) : selectedFormId ? (
          activeTab === 'raw' ? (
            <SubmissionsViewer 
              formId={selectedFormId} 
              options={{ 
                showBack: false, 
                allowImport: false, 
                allowBulkActions: false, 
                showTemplate: false, 
                showEntity: true 
              }} 
            />
          ) : activeTab === 'clean' ? (
            <CleanDataViewer formId={selectedFormId} />
          ) : (
            <ManualAllocateViewer formId={selectedFormId} />
          )
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300">Select a form to view submissions.</div>
        )}
      </div>


    </div>
  );
}