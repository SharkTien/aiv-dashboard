"use client";
import { useEffect, useMemo, useState } from "react";
import SubmissionsViewer from "@/app/dashboard/forms/[id]/submissions/SubmissionsViewer";

export default function Page() {
  const [forms, setForms] = useState<Array<{ id: number; name: string; code: string; created_at?: string }>>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadForms("");
      setLoading(false);
    })();
  }, []);

  async function loadForms(query: string) {
    setLoadingForms(true);
    try {
      const params = new URLSearchParams({ limit: "50", type: "oGV" });
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

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { loadForms(q); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">oGV Data</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Latest oGV form submissions.</p>
      </div>

      <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-gray-800/80 backdrop-blur p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Select Phase</label>
            <select value={selectedFormId ?? ''} onChange={(e) => setSelectedFormId(e.target.value ? Number(e.target.value) : null)} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all">
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

        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading…</div>
        ) : selectedFormId ? (
          <SubmissionsViewer inlineLoading formId={selectedFormId} options={{ showBack: false, allowImport: false, allowBulkActions: false, showTemplate: false }} />
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300">Select a form to view submissions.</div>
        )}
      </div>
    </div>
  );
}


