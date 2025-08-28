"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Form = {
  id: number;
  code: string;
  name: string;
};

type FormField = {
  id: number;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options: string | null;
  is_required: boolean;
  sort_order: number;
};

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone Number" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "number", label: "Number" },
  { value: "database", label: "Database Lookup" },
];

// Types
type Datasource = { table: string; valueKey: string; labelKey: string };
type DatasourceOption = { value: number | string; label: string };

export default function FormBuilder({ formId }: { formId: number }) {
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [newField, setNewField] = useState({
    field_name: "",
    field_label: "",
    field_type: "text",
    field_options: "",
    is_required: false,
  });

  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [datasourceTable, setDatasourceTable] = useState("");
  const [datasourceOptions, setDatasourceOptions] = useState<DatasourceOption[]>([]);

  async function loadForm() {
    try {
      const res = await fetch(`/api/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data.form);
      }
    } catch (error) {
      console.error("Error loading form:", error);
    }
  }

  async function loadFields() {
    try {
      const res = await fetch(`/api/forms/${formId}/fields`);
      if (res.ok) {
        const data = await res.json();
        setFields(Array.isArray(data.items) ? data.items : []);
      }
    } catch (error) {
      console.error("Error loading fields:", error);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([loadForm(), loadFields()]);
      setLoading(false);
    }
    load();
  }, [formId]);

  useEffect(() => {
    fetch("/api/forms/datasources")
      .then((r) => r.json())
      .then((d) => setDatasources(Array.isArray(d.items) ? d.items : []))
      .catch(() => setDatasources([]));
  }, []);

  useEffect(() => {
    if (!datasourceTable) {
      setDatasourceOptions([]);
      return;
    }
    fetch(`/api/forms/datasources/${datasourceTable}`)
      .then((r) => r.json())
      .then((d) => setDatasourceOptions(Array.isArray(d.items) ? d.items : []))
      .catch(() => setDatasourceOptions([]));
  }, [datasourceTable]);

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const addFieldOptionsJson = buildFieldOptionsPayload();

      const res = await fetch(`/api/forms/${formId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newField,
          field_options: addFieldOptionsJson,
          sort_order: fields.length + 1,
        }),
      });

      if (res.ok) {
        setShowAddField(false);
        setNewField({
          field_name: "",
          field_label: "",
          field_type: "text",
          field_options: "",
          is_required: false,
        });
        loadFields();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add field");
      }
    } catch (error) {
      console.error("Error adding field:", error);
      alert("Failed to add field");
    }
  };

  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField) return;

    try {
      const updateFieldOptionsJson = buildFieldOptionsPayload();
      const res2 = await fetch(`/api/forms/${formId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_id: editingField.id,
          ...newField,
          field_options: updateFieldOptionsJson,
        }),
      });

      if (res2.ok) {
        setEditingField(null);
        setNewField({
          field_name: "",
          field_label: "",
          field_type: "text",
          field_options: "",
          is_required: false,
        });
        loadFields();
      } else {
        const data = await res2.json();
        alert(data.error || "Failed to update field");
      }
    } catch (error) {
      console.error("Error updating field:", error);
      alert("Failed to update field");
    }
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!confirm("Are you sure you want to delete this field?")) return;

    try {
      const res = await fetch(`/api/forms/${formId}/fields?field_id=${fieldId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadFields();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete field");
      }
    } catch (error) {
      console.error("Error deleting field:", error);
      alert("Failed to delete field");
    }
  };

  const startEditField = (field: FormField) => {
    setEditingField(field);
    setNewField({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      field_options: field.field_options || "",
      is_required: field.is_required,
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setShowAddField(false);
    setNewField({
      field_name: "",
      field_label: "",
      field_type: "text",
      field_options: "",
      is_required: false,
    });
  };

  const buildFieldOptionsPayload = () => {
    if (newField.field_type === "database") {
      // store selected table name in field_options as JSON
      return JSON.stringify({ source: datasourceTable });
    }
    if (
      newField.field_type === "select" ||
      newField.field_type === "radio" ||
      newField.field_type === "checkbox"
    ) {
      const lines = (newField.field_options || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return JSON.stringify(lines);
    }
    return null;
  };

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
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/forms/${formId}/submissions`}
              className="px-4 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
            >
              View Submissions
            </Link>
            <Link
              href="/dashboard/forms"
              className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
            >
              Back to Forms
            </Link>
          </div>
        </div>
      </div>

      {/* Fields List */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Form Fields</h3>
          <button
            onClick={() => setShowAddField(true)}
            className="px-4 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
          >
            Add Field
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No fields added yet. Click "Add Field" to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center justify-between gap-3 p-4 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <span className="text-sky-600 dark:text-sky-400 font-semibold text-xs">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {field.field_label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {field.field_name} • {field.field_type}
                      {field.is_required && " • Required"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditField(field)}
                    className="px-3 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="px-3 py-1 text-xs rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Field Modal */}
      {(showAddField || editingField) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={cancelEdit} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white text-slate-900 dark:bg-gray-800 dark:text-white shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {editingField ? "Edit Field" : "Add New Field"}
              </h3>
              <form onSubmit={editingField ? handleUpdateField : handleAddField} className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Field Name</label>
                  <input
                    type="text"
                    placeholder="e.g., email, phone_number"
                    value={newField.field_name}
                    onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                    className="h-10 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Field Label</label>
                  <input
                    type="text"
                    placeholder="e.g., Email Address"
                    value={newField.field_label}
                    onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                    className="h-10 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Field Type</label>
                  <select
                    value={newField.field_type}
                    onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                    className="h-10 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {newField.field_type === "database" && (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Select datasource table</label>
                      <select
                        value={datasourceTable}
                        onChange={(e) => setDatasourceTable(e.target.value)}
                        className="h-10 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                      >
                        <option value="">-- Choose table --</option>
                        {datasources.map((ds) => (
                          <option key={ds.table} value={ds.table}>
                            {ds.table}
                          </option>
                        ))}
                      </select>
                    </div>
                    {datasourceTable && (
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Preview options (value ➜ label)</label>
                        <div className="max-h-40 overflow-auto rounded-md ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 px-3 py-2 text-sm">
                          {datasourceOptions.length === 0 ? (
                            <div className="text-gray-500 dark:text-gray-400">No items</div>
                          ) : (
                            <ul className="space-y-1">
                              {datasourceOptions.slice(0, 50).map((opt) => (
                                <li key={String(opt.value)} className="text-gray-700 dark:text-gray-200">
                                  <span className="font-mono text-xs text-gray-500">{String(opt.value)}</span>
                                  <span className="mx-2">➜</span>
                                  <span>{opt.label}</span>
                                </li>
                              ))}
                              {datasourceOptions.length > 50 && (
                                <li className="text-xs text-gray-400">…and more</li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">At submit time, the stored value will be the selected row id from the chosen table.</p>
                  </div>
                )}
                {(newField.field_type === "select" || newField.field_type === "radio" || newField.field_type === "checkbox") && (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Options (one per line)</label>
                    <textarea
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      value={newField.field_options}
                      onChange={(e) => setNewField({ ...newField, field_options: e.target.value })}
                      className="h-20 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 py-2 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all resize-none"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={newField.is_required}
                    onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="required" className="text-sm text-gray-700 dark:text-gray-200">
                    Required field
                  </label>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
                  >
                    {editingField ? "Update Field" : "Add Field"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 h-10 rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
