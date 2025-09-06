"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Submission = {
  id: number;
  timestamp: string;
  entityId: number | null;
  entityName: string | null;
  responses: { [key: string]: string };
};

type Entity = {
  entity_id: number;
  name: string;
  type: string;
};

type FormField = {
  id: number;
  field_name: string;
  field_label: string;
  field_type: string;
  sort_order: number;
};

export default function ManualAllocateViewer({ formId }: { formId: number }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [submissionsRes, entitiesRes, fieldsRes] = await Promise.all([
          fetch(`/api/forms/${formId}/submissions/manual-allocate`),
          fetch("/api/entities"),
          fetch(`/api/forms/${formId}/fields`)
        ]);

        if (submissionsRes.ok && entitiesRes.ok && fieldsRes.ok) {
          const [submissionsData, entitiesData, fieldsData] = await Promise.all([
            submissionsRes.json(),
            entitiesRes.json(),
            fieldsRes.json()
          ]);
          setSubmissions(submissionsData.submissions || []);
          // Filter out national entities and organic (only show local entities)
          const localEntities = Array.isArray(entitiesData.items) ? entitiesData.items.filter((e: any) => e.type === 'local' && e.name.toLowerCase() !== 'organic') : [];
          setEntities(localEntities);
          setFormFields(fieldsData.fields || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (formId) {
      loadData();
    }
  }, [formId]);

  const handleAllocate = async (submissionId: number, entityId: number) => {
    setAllocating(submissionId);
    try {
      const response = await fetch(`/api/forms/${formId}/submissions/${submissionId}/allocate-entity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: entityId }),
      });

      if (response.ok) {
        // Update the submission in the local state
        setSubmissions(prev => prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, entityId, entityName: entities.find(e => e.entity_id === entityId)?.name || null }
            : sub
        ));
      } else {
        const errorData = await response.json();
        alert(`Failed to allocate: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error allocating entity:", error);
      alert("Failed to allocate entity");
    } finally {
      setAllocating(null);
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFieldValue = (value: string, fieldType: string) => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    if (fieldType === 'date') {
      try {
        // Handle different date formats that might come from the database
        let date: Date;
        
        // If it's already in ISO format or standard format
        if (value.includes('T') || value.includes('-')) {
          date = new Date(value);
        } 
        // If it's in DD/MM/YYYY or MM/DD/YYYY format
        else if (value.includes('/')) {
          const parts = value.split('/');
          if (parts.length === 3) {
            // Try DD/MM/YYYY first (more common in international)
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Month is 0-indexed
            const year = parseInt(parts[2]);
            
            // Validate the date
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
              date = new Date(year, month, day);
            } else {
              // Try MM/DD/YYYY format
              const month2 = parseInt(parts[0]) - 1;
              const day2 = parseInt(parts[1]);
              const year2 = parseInt(parts[2]);
              
              if (day2 >= 1 && day2 <= 31 && month2 >= 0 && month2 <= 11 && year2 >= 1900) {
                date = new Date(year2, month2, day2);
              } else {
                return value; // Return original if can't parse
              }
            }
          } else {
            return value;
          }
        }
        // If it's just a number (Excel serial date)
        else if (!isNaN(Number(value)) && Number(value) > 0) {
          const serialNumber = Number(value);
          // Excel serial date starts from 1900-01-01 (serial number 1 = 1900-01-01)
          // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
          if (serialNumber >= 1 && serialNumber < 100000) {
            // Excel epoch is 1900-01-01, but serial number 1 = 1900-01-01
            // So we subtract 1 to get the correct offset
            const excelEpoch = new Date(1900, 0, 1);
            date = new Date(excelEpoch.getTime() + (serialNumber - 1) * 24 * 60 * 60 * 1000);
          } else {
            return value;
          }
        }
        else {
          return value;
        }
        
        // Check if the date is valid
        if (!isNaN(date.getTime())) {
          // Format as DD/MM/YYYY for better readability
          return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      } catch (e) {
        // Fallback to original value if parsing fails
      }
    }
    
    if (fieldType === 'datetime') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
      } catch (e) {
        // Fallback to original value if parsing fails
      }
    }
    
    return value;
  };

  if (loading) {
    return (
      <div className="relative min-h-[400px]">
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20 max-w-md w-full mx-4">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative w-24 h-24">
                <Image
                  src="/giphy.gif"
                  alt="Loading animation"
                  fill
                  className="object-contain rounded-lg"
                  priority
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Loading submissions...
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please wait while we fetch the data...
                </p>
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
      {/* Header */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Manual Entity Allocation
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Allocate submissions to entities manually. Only submissions without entity allocation are shown.
        </p>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-8 border border-gray-200/50 dark:border-gray-600/50 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No unallocated submissions found for this form.
            </p>
          </div>
        ) : (
          submissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Submission Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Submission #{submission.id}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(submission.timestamp)}
                    </span>
                    {submission.entityName && (
                      <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
                        Allocated to: {submission.entityName}
                      </span>
                    )}
                  </div>
                  
                  {/* Responses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {formFields
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((field) => {
                        const value = submission.responses[field.field_name];
                        return (
                          <div key={field.id} className="text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {field.field_label || field.field_name}:
                            </span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                              {formatFieldValue(value, field.field_type)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Allocation Controls */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allocate to Entity:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={submission.entityId || ''}
                      onChange={(e) => {
                        const entityId = e.target.value ? Number(e.target.value) : null;
                        if (entityId) {
                          handleAllocate(submission.id, entityId);
                        }
                      }}
                      disabled={allocating === submission.id}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 disabled:opacity-50"
                    >
                      <option value="">Select entity...</option>
                      {entities.map((entity) => (
                        <option key={entity.entity_id} value={entity.entity_id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                    {allocating === submission.id && (
                      <div className="flex items-center justify-center w-8 h-8">
                        <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {submissions.length > 0 && (
        <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {submissions.length} unallocated submissions
          </p>
        </div>
      )}
    </div>
  );
}
