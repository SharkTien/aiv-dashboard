"use client";
import { useEffect, useState } from "react";
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
  }, [formId]);

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

      {/* Submissions */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Submissions ({submissions.length})
          </h3>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No submissions yet
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="p-4 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Submission #{submission.id}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {submission.responses.map((response, index) => (
                    <div key={index} className="flex">
                      <div className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {response.field_label}:
                      </div>
                      <div className="w-2/3 text-sm text-gray-900 dark:text-white">
                        {response.value || <span className="text-gray-400">(empty)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
