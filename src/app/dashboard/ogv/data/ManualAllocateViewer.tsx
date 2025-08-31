'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import LoadingOverlay from '@/components/LoadingOverlay';

type Submission = {
  id: number;
  form_id: number;
  entity_id: number | null;
  timestamp: string;
  responses: FormResponse[];
};

type FormResponse = {
  field_name: string;
  value: string;
  value_label?: string;
};

type Entity = {
  entity_id: number;
  name: string;
};

type ManualAllocateViewerProps = {
  formId: number;
};

export default function ManualAllocateViewer({ formId }: ManualAllocateViewerProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch submissions with empty entity_id
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [submissionsRes, entitiesRes] = await Promise.all([
          fetch(`/api/forms/${formId}/submissions/manual-allocate`),
          fetch('/api/entities')
        ]);

                 if (submissionsRes.ok && entitiesRes.ok) {
           const [submissionsData, entitiesData] = await Promise.all([
             submissionsRes.json(),
             entitiesRes.json()
           ]);
           console.log('Submissions data:', submissionsData);
           console.log('Entities data:', entitiesData);
           console.log('Entities items:', entitiesData.items);
           console.log('Entities items length:', entitiesData.items?.length);
           setSubmissions(submissionsData.submissions || []);
           // Filter out national entities and organic (only show local entities)
           const localEntities = Array.isArray(entitiesData.items) ? entitiesData.items.filter((e: any) => e.type === 'local' && e.name.toLowerCase() !== 'organic') : [];
           setEntities(localEntities);
                 } else {
           console.error('API responses not ok:', {
             submissionsOk: submissionsRes.ok,
             entitiesOk: entitiesRes.ok,
             submissionsStatus: submissionsRes.status,
             entitiesStatus: entitiesRes.status
           });
           
           if (!entitiesRes.ok) {
             const errorText = await entitiesRes.text();
             console.error('Entities API error response:', errorText);
           }
         }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId]);

  // Filter submissions based on search term
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(submission => {
      const searchLower = searchTerm.toLowerCase();
      return submission.responses.some(response => 
        response.value.toLowerCase().includes(searchLower) ||
        response.field_name.toLowerCase().includes(searchLower)
      );
    });
  }, [submissions, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // Handle entity allocation
  const handleAllocateEntity = async (submissionId: number, entityId: number) => {
    setAllocating(submissionId);
    try {
      const res = await fetch(`/api/forms/${formId}/submissions/${submissionId}/allocate-entity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: entityId }),
      });

      if (res.ok) {
        // Update local state
        setSubmissions(prev => prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, entity_id: entityId }
            : sub
        ));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to allocate entity');
      }
    } catch (error) {
      console.error('Error allocating entity:', error);
      alert('Failed to allocate entity');
    } finally {
      setAllocating(null);
    }
  };

  // Get display value for a field
  const getDisplayValue = (responses: FormResponse[], fieldName: string) => {
    const response = responses.find(r => r.field_name === fieldName);
    return response?.value_label || response?.value || '';
  };

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
             {/* Header placeholder */}
             <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
               <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
             </div>
             
             {/* Table placeholder */}
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

  return (
    <div className="space-y-6">
      {/* Header with search and stats */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Manual Entity Allocation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Allocate submissions that have no entity_id or are assigned to organic entity
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                {filteredSubmissions.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Need allocation
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name, email, phone, uni..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl border border-gray-200/50 dark:border-gray-600/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-600/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Submissions
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} results
            </div>
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-lg font-medium mb-2">
              {searchTerm ? 'No submissions found' : 'No submissions need manual allocation'}
            </div>
            <div className="text-sm">
              {searchTerm ? 'Try adjusting your search terms.' : 'All submissions are properly allocated to non-organic entities.'}
            </div>
          </div>
        ) : (
          <>
                         {/* Table Header */}
             <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
               <div className="col-span-3">Name & Contact</div>
               <div className="col-span-2">University</div>
               <div className="col-span-2">Other Uni</div>
               <div className="col-span-2">Submitted</div>
               <div className="col-span-3">Allocate Entity</div>
             </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-200/50 dark:divide-gray-600/50">
              {currentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-600/30 transition-colors"
                >
                                     {/* Name & Contact */}
                   <div className="col-span-3">
                     <div className="font-medium text-gray-900 dark:text-white mb-1">
                       {getDisplayValue(submission.responses, 'name') || 'N/A'}
                     </div>
                     <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                       <div>{getDisplayValue(submission.responses, 'email') || 'No email'}</div>
                       <div>{getDisplayValue(submission.responses, 'phone') || 'No phone'}</div>
                     </div>
                   </div>

                   {/* University */}
                   <div className="col-span-2">
                     <div className="text-sm text-gray-900 dark:text-white">
                       {getDisplayValue(submission.responses, 'uni') || 'N/A'}
                     </div>
                   </div>

                   {/* Other Uni */}
                   <div className="col-span-2">
                     <div className="text-sm text-gray-900 dark:text-white">
                       {getDisplayValue(submission.responses, 'other--uni') || 'N/A'}
                     </div>
                   </div>

                   {/* Submitted */}
                   <div className="col-span-2">
                     <div className="text-sm text-gray-900 dark:text-white">
                       {new Date(submission.timestamp).toLocaleDateString()}
                     </div>
                     <div className="text-xs text-gray-500 dark:text-gray-400">
                       {new Date(submission.timestamp).toLocaleTimeString()}
                     </div>
                   </div>

                  {/* Allocate Entity */}
                  <div className="col-span-3">
                    <div className="space-y-2">
                      {/* Current Entity */}
                      {submission.entity_id && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Current: <span className="font-medium text-gray-700 dark:text-gray-300">
                            {entities.find(e => e.entity_id === submission.entity_id)?.name || 'Unknown'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <select
                          onChange={(e) => {
                            const entityId = Number(e.target.value);
                            if (entityId) {
                              handleAllocateEntity(submission.id, entityId);
                            }
                          }}
                          disabled={allocating === submission.id}
                          className="flex-1 px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all disabled:opacity-50"
                        >
                          <option value="">Select entity...</option>
                          {entities.map(entity => {
                            console.log('Rendering entity:', entity);
                            return (
                              <option key={entity.entity_id} value={entity.entity_id}>
                                {entity.name}
                              </option>
                            );
                          })}
                        </select>
                        {allocating === submission.id && (
                          <div className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400">
                            <div className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                            Allocating...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-600/50 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-300">Show:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option key="5" value={5}>5</option>
                      <option key="10" value={10}>10</option>
                      <option key="25" value={25}>25</option>
                      <option key="50" value={50}>50</option>
                      <option key="100" value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-300">per page</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
