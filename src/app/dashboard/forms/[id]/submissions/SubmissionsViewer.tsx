"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Form = {
  id: number;
  code: string;
  name: string;
};

type Submission = {
  id: number;
  submitted_at: string;
  responses: FormResponse[];
};

type FormResponse = {
  field_name: string;
  field_label: string;
  value: string;
};

export default function SubmissionsViewer({ formId }: { formId: number }) {
  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      // Load form info
      const formRes = await fetch(`/api/forms/${formId}`);
      if (formRes.ok) {
        const formData = await formRes.json();
        setForm(formData.form);
      }

      // Load submissions
      const submissionsRes = await fetch(`/api/forms/${formId}/submissions`);
      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        setSubmissions(Array.isArray(submissionsData.items) ? submissionsData.items : []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const fieldHeaders = useMemo(() => {
    // Gather ordered unique field headers across submissions by first appearance order
    const seen = new Set<string>();
    const headers: { name: string; label: string }[] = [];
    for (const sub of submissions) {
      for (const r of sub.responses) {
        if (!seen.has(r.field_name)) {
          seen.add(r.field_name);
          headers.push({ name: r.field_name, label: r.field_label });
        }
      }
    }
    return headers;
  }, [submissions]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  if (!form) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Form not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form Info */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{form.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Code: {form.code}</p>
          </div>
          <Link
            href={`/dashboard/forms/${formId}`}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
          >
            Back to Form
          </Link>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Submissions ({submissions.length})
          </h3>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No submissions yet</div>
        ) : (
          <div className="w-full overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 dark:bg-gray-800/60">
                  <th className="px-3 py-2 text-gray-700 dark:text-gray-200 sticky top-0">ID</th>
                  <th className="px-3 py-2 text-gray-700 dark:text-gray-200 sticky top-0">Submitted At</th>
                  {fieldHeaders.map((h) => (
                    <th key={h.name} className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap sticky top-0">
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  // Build a field_name -> value map for quick lookup
                  const valueMap = new Map(sub.responses.map((r) => [r.field_name, r.value]));
                  return (
                    <tr key={sub.id} className="border-t border-gray-200/60 dark:border-gray-600/60">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{sub.id}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {new Date(sub.submitted_at).toLocaleString()}
                      </td>
                      {fieldHeaders.map((h) => (
                        <td key={h.name} className="px-3 py-2 text-gray-900 dark:text-white align-top">
                          {valueMap.get(h.name) || <span className="text-gray-400">(empty)</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
