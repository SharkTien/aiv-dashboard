"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingOverlay from "@/components/LoadingOverlay";

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
  const [fieldLoading, setFieldLoading] = useState(false);
  const [dupFieldIds, setDupFieldIds] = useState<number[]>([]);
  const [newField, setNewField] = useState({
    field_name: "",
    field_label: "",
    field_type: "text",
    field_options: "",
  });

  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [datasourceTable, setDatasourceTable] = useState("");
  const [datasourceOptions, setDatasourceOptions] = useState<DatasourceOption[]>([]);
  
  // Drag & Drop states
  const [draggedField, setDraggedField] = useState<number | null>(null);
  const [dragOverField, setDragOverField] = useState<number | null>(null);

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
        console.log("FormBuilder: Fields data:", data);
        setFields(Array.isArray(data.fields) ? data.fields : []);
      } else {
        console.error("Failed to load fields:", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error loading fields:", error);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([loadForm(), loadFields(), loadDuplicateSettings()]);
      setLoading(false);
    }
    load();
  }, [formId]);

  // Debug: Log fields whenever they change
  useEffect(() => {
    console.log("FormBuilder: Fields state updated:", fields);
  }, [fields]);

  useEffect(() => {
    async function loadDatasources() {
      try {
        const res = await fetch("/api/entities");
        if (res.ok) {
          const data = await res.json();
          setDatasources(data.entities || []);
        }
      } catch (error) {
        console.error("Error loading datasources:", error);
      }
    }
    loadDatasources();
  }, []);

  useEffect(() => {
    if (datasourceTable) {
      async function loadDatasourceOptions() {
        try {
          const res = await fetch(`/api/entities/${datasourceTable}`);
          if (res.ok) {
            const data = await res.json();
            setDatasourceOptions(data.entities || []);
          }
        } catch (error) {
          console.error("Error loading datasource options:", error);
        }
      }
      loadDatasourceOptions();
    } else {
      setDatasourceOptions([]);
    }
  }, [datasourceTable]);

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    setFieldLoading(true);

    try {
      const payload = {
        field_name: newField.field_name,
        field_label: newField.field_label,
        field_type: newField.field_type,
        field_options: buildFieldOptionsPayload(),
      };

      const res = await fetch(`/api/forms/${formId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        loadFields();
        cancelEdit();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add field");
      }
    } catch (error) {
      console.error("Error adding field:", error);
      alert("Failed to add field");
    } finally {
      setFieldLoading(false);
    }
  }

  async function handleUpdateField(e: React.FormEvent) {
    e.preventDefault();
    if (!editingField) return;

    setFieldLoading(true);

    try {
      const payload = {
        field_name: newField.field_name,
        field_label: newField.field_label,
        field_type: newField.field_type,
        field_options: buildFieldOptionsPayload(),
      };

      const res = await fetch(`/api/forms/${formId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          field_id: editingField.id
        }),
      });

      if (res.ok) {
        loadFields();
        cancelEdit();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update field");
      }
    } catch (error) {
      console.error("Error updating field:", error);
      alert("Failed to update field");
    } finally {
      setFieldLoading(false);
    }
  }

  async function handleDeleteField(fieldId: number) {
    if (!confirm("Are you sure you want to delete this field?")) return;

    setFieldLoading(true);

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
    } finally {
      setFieldLoading(false);
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, fieldId: number) => {
    setDraggedField(fieldId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", fieldId.toString());
  };

  async function loadDuplicateSettings() {
    try {
      const res = await fetch(`/api/forms/${formId}/duplicate-settings`);
      if (res.ok) {
        const data = await res.json();
        setDupFieldIds(Array.isArray(data.fieldIds) ? data.fieldIds : []);
      }
    } catch (e) {
      console.error('Failed to load duplicate settings', e);
    }
  }

  async function saveDuplicateSettings(nextIds: number[]) {
    try {
      const res = await fetch(`/api/forms/${formId}/duplicate-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldIds: nextIds })
      });
      if (res.ok) {
        setDupFieldIds(nextIds);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save duplicate settings');
      }
    } catch (e) {
      alert('Failed to save duplicate settings');
    }
  }

  const handleDragOver = (e: React.DragEvent, fieldId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverField(fieldId);
  };

  const handleDragLeave = () => {
    setDragOverField(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFieldId: number) => {
    e.preventDefault();
    
    if (!draggedField || draggedField === targetFieldId) {
      setDraggedField(null);
      setDragOverField(null);
      return;
    }

    try {
      // Find current positions
      const draggedIndex = fields.findIndex(f => f.id === draggedField);
      const targetIndex = fields.findIndex(f => f.id === targetFieldId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      // Create new order
      const newFields = [...fields];
      const [draggedItem] = newFields.splice(draggedIndex, 1);
      newFields.splice(targetIndex, 0, draggedItem);

      // Update sort_order for all fields
      const updatedFields = newFields.map((field, index) => ({
        ...field,
        sort_order: index + 1
      }));

      // Update the order in database
      const res = await fetch(`/api/forms/${formId}/fields/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldOrders: updatedFields.map(f => ({ id: f.id, sort_order: f.sort_order }))
        }),
      });

      if (res.ok) {
        setFields(updatedFields);
      } else {
        console.error("Failed to update field order");
        // Reload fields to revert changes
        loadFields();
      }
    } catch (error) {
      console.error("Error updating field order:", error);
      loadFields();
    } finally {
      setDraggedField(null);
      setDragOverField(null);
    }
  };

  const startEditField = (field: FormField) => {
    setEditingField(field);
    setNewField({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      field_options: field.field_options || "",
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
    <div className="space-y-4">
      {/* Form Info */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{form.name}</h2>
            <p className="text-xs text-gray-600 dark:text-gray-300">Code: {form.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/forms/${formId}/submissions`}
              className="px-3 py-1.5 text-xs rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
            >
              View Submissions
            </Link>
            <Link
              href="/dashboard/forms"
              className="px-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
            >
              Back to Forms
            </Link>
          </div>
        </div>
      </div>

      {/* Fields List */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Form Fields</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drag fields to reorder • Order affects submission columns
            </p>
            <button
              onClick={() => setShowAddField(true)}
              className="px-3 py-1.5 text-xs rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
            >
              Add Field
            </button>
          </div>
        </div>

        {/* Duplicate Settings */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Duplicate detection fields</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select one or more fields to detect duplicates. Newest submission stays, older ones are marked duplicated.</p>
          {fields.length === 0 ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">No fields available.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {fields.map(f => (
                <label key={f.id} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70">
                  <input
                    type="checkbox"
                    checked={dupFieldIds.includes(f.id)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...dupFieldIds, f.id] : dupFieldIds.filter(id => id !== f.id);
                      saveDuplicateSettings(next);
                    }}
                  />
                  <span>{f.field_label} <span className="text-gray-400">({f.field_name})</span></span>
                </label>
              ))}
            </div>
          )}
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            No fields added yet. Click "Add Field" to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => {
              const isRequiredField = false;
              return (
                <div
                  key={field.id}
                  draggable={!isRequiredField}
                  onDragStart={!isRequiredField ? (e) => handleDragStart(e, field.id) : undefined}
                  onDragOver={!isRequiredField ? (e) => handleDragOver(e, field.id) : undefined}
                  onDragLeave={!isRequiredField ? handleDragLeave : undefined}
                  onDrop={!isRequiredField ? (e) => handleDrop(e, field.id) : undefined}
                  className={`flex items-center justify-between gap-3 p-3 rounded-md bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50 transition-all ${
                    isRequiredField ? 'cursor-default' : 'cursor-move'
                  } ${
                    draggedField === field.id ? 'opacity-50 scale-95' : ''
                  } ${
                    dragOverField === field.id ? 'border-sky-400 bg-sky-50/50 dark:bg-sky-900/20' : ''
                  }`}
                >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <span className="text-sky-600 dark:text-sky-400 font-semibold text-xs">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 text-gray-400">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {field.field_label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        {field.field_name} • {field.field_type}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <>
                    <button
                      onClick={() => startEditField(field)}
                      className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="px-2 py-1 text-xs rounded-md bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
      
      {/* Loading Overlay for Field Operations */}
      <LoadingOverlay 
        isVisible={fieldLoading} 
        message="Processing field..." 
      />
      
      {/* Add/Edit Field Modal */}
      {(showAddField || editingField) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={cancelEdit} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white text-slate-900 dark:bg-gray-800 dark:text-white shadow-2xl">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {editingField ? "Edit Field" : "Add New Field"}
              </h3>
              <form onSubmit={editingField ? handleUpdateField : handleAddField} className="space-y-3">
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Field Name</label>
                  <input
                    type="text"
                    placeholder="e.g., email, phone_number"
                    value={newField.field_name}
                    onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                    className="h-8 rounded-md ring-1 ring-black/15 dark:ring-white/15 px-2 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all text-sm"
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Field Label</label>
                  <input
                    type="text"
                    placeholder="e.g., Email Address"
                    value={newField.field_label}
                    onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                    className="h-8 rounded-md ring-1 ring-black/15 dark:ring-white/15 px-2 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all text-sm"
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Field Type</label>
                  <select
                    value={newField.field_type}
                    onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                    className="h-8 rounded-md ring-1 ring-black/15 dark:ring-white/15 px-2 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all text-sm"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {newField.field_type === "database" && (
                  <div className="space-y-2">
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Select datasource table</label>
                      <select
                        value={datasourceTable}
                        onChange={(e) => setDatasourceTable(e.target.value)}
                        className="h-8 rounded-md ring-1 ring-black/15 dark:ring-white/15 px-2 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all text-sm"
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
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Preview options (value ➜ label)</label>
                        <div className="max-h-32 overflow-auto rounded-md ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 px-2 py-1 text-xs">
                          {datasourceOptions.length === 0 ? (
                            <div className="text-gray-500 dark:text-gray-400">No items</div>
                          ) : (
                            <ul className="space-y-0.5">
                              {datasourceOptions.slice(0, 30).map((opt) => (
                                <li key={String(opt.value)} className="text-gray-700 dark:text-gray-200">
                                  <span className="font-mono text-xs text-gray-500">{String(opt.value)}</span>
                                  <span className="mx-1">➜</span>
                                  <span className="text-xs">{opt.label}</span>
                                </li>
                              ))}
                              {datasourceOptions.length > 30 && (
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
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Options (one per line)</label>
                    <textarea
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      value={newField.field_options}
                      onChange={(e) => setNewField({ ...newField, field_options: e.target.value })}
                      className="h-16 rounded-md ring-1 ring-black/15 dark:ring-white/15 px-2 py-1 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all resize-none text-sm"
                    />
                  </div>
                )}
                <div></div>
                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="submit"
                    className="flex-1 h-8 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors text-sm"
                  >
                    {editingField ? "Update Field" : "Add Field"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 h-8 rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors text-sm"
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
