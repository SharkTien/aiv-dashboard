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

type User = {
  user_id: number;
  sub: string;
  role: string;
  entity_id: number | null;
};

type ManualAllocateViewerProps = {
  formId: number;
};

export default function ManualAllocateViewerWithRequests({ formId }: ManualAllocateViewerProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState<number | null>(null);
  const [requesting, setRequesting] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'allocate' | 'my-requests'>('allocate');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch user info and data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [submissionsRes, entitiesRes, userRes] = await Promise.all([
          fetch(`/api/forms/${formId}/submissions/manual-allocate`),
          fetch('/api/entities'),
          fetch('/api/auth/me')
        ]);

        if (submissionsRes.ok && entitiesRes.ok && userRes.ok) {
          const [submissionsData, entitiesData, userData] = await Promise.all([
            submissionsRes.json(),
            entitiesRes.json(),
            userRes.json()
          ]);

          setSubmissions(submissionsData.submissions || []);
          setEntities(entitiesData.items || []);
          setUser(userData.user);
          
          // Requests will be loaded by useEffect when user state is set
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId]);

  // Load requests when user is loaded and is a lead
  useEffect(() => {
    if (user?.role === 'lead') {
      loadPendingRequests();
    }
  }, [user]);

  // Load requests when switching to my-requests tab
  useEffect(() => {
    if (activeTab === 'my-requests' && user?.role === 'lead') {
      loadPendingRequests();
    }
  }, [activeTab, user]);

  // Load pending requests for lead users
  const loadPendingRequests = async () => {
    console.log('Loading pending requests for user:', user?.sub, 'role:', user?.role);
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/allocation-requests');
      console.log('API response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('API response data:', data);
        const userRequests = data.items?.filter((req: any) => req.requested_by === user?.sub) || [];
        console.log('Filtered user requests:', userRequests);
        const pendingSubmissionIds = new Set(
          userRequests.filter((req: any) => req.status === 'pending').map((req: any) => req.submission_id)
        );
        setPendingRequests(pendingSubmissionIds as Set<number>);
        setMyRequests(userRequests);
        console.log('Set pending requests:', pendingSubmissionIds);
        console.log('Set my requests:', userRequests);
      } else {
        console.error('Failed to load requests:', res.status);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Filter submissions based on search term (uni and other--uni fields)
  const filteredSubmissions = useMemo(() => {
    if (!searchTerm.trim()) return submissions;

    return submissions.filter(submission => {
      return submission.responses.some(response => 
        (response.field_name === 'uni' || response.field_name === 'other--uni') && (
          response.value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          response.value_label?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    });
  }, [submissions, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  const handleAllocate = async (submissionId: number, entityId: number) => {
    setAllocating(submissionId);
    try {
      const response = await fetch(`/api/forms/${formId}/submissions/${submissionId}/allocate-entity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: entityId })
      });

      if (response.ok) {
        // Remove the submission from the list
        setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to allocate submission'}`);
      }
    } catch (error) {
      console.error('Error allocating submission:', error);
      alert('Failed to allocate submission');
    } finally {
      setAllocating(null);
    }
  };

  const handleRequestAllocate = async (submissionId: number, entityId: number) => {
    setRequesting(submissionId);
    try {
      const response = await fetch('/api/allocation-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          submission_id: submissionId, 
          requested_entity_id: entityId 
        })
      });

      if (response.ok) {
        alert('Allocation request submitted successfully! Admin will review your request.');
        // Add to pending requests
        setPendingRequests(prev => new Set([...prev, submissionId]));
        // Reload requests to update the tab
        await loadPendingRequests();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to submit allocation request'}`);
      }
    } catch (error) {
      console.error('Error requesting allocation:', error);
      alert('Failed to submit allocation request');
    } finally {
      setRequesting(null);
    }
  };

  const handleCancelRequest = async (submissionId: number) => {
    try {
      // Find the request ID for this submission
      const res = await fetch('/api/allocation-requests?status=pending');
      if (res.ok) {
        const data = await res.json();
        const userRequest = data.items?.find((req: any) => 
          req.requested_by === user?.sub && req.submission_id === submissionId
        );
        
        if (userRequest) {
          const cancelRes = await fetch(`/api/allocation-requests/${userRequest.id}`, {
            method: 'DELETE'
          });
          
          if (cancelRes.ok) {
            alert('Allocation request cancelled successfully!');
            
            // Remove from pending requests
            setPendingRequests(prev => {
              const newSet = new Set(prev);
              newSet.delete(submissionId);
              return newSet;
            });
            
            // Delete related notifications
            try {
              await fetch('/api/notifications', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'allocation_request',
                  data: { request_id: userRequest.id }
                })
              });
            } catch (notificationError) {
              console.error('Error deleting notifications:', notificationError);
              // Don't show error to user as the main action succeeded
            }
            
            // Reload requests to update the tab
            await loadPendingRequests();
          } else {
            alert('Failed to cancel allocation request');
          }
        }
      }
    } catch (error) {
      console.error('Error cancelling allocation request:', error);
      alert('Failed to cancel allocation request');
    }
  };

  const getEntityOptions = () => {
    if (!user) return entities;
    
    // If user is lead and has an entity, only show their entity
    if (user.role === 'lead' && user.entity_id) {
      return entities.filter(e => e.entity_id === user.entity_id);
    }
    
    // Admin can see all entities
    return entities;
  };

  const canAllocateDirectly = () => {
    return user?.role === 'admin';
  };

  const canRequestAllocate = () => {
    return user?.role === 'lead' && user?.entity_id;
  };

  // Refresh data when switching tabs
  const handleTabChange = async (tab: 'allocate' | 'my-requests') => {
    setActiveTab(tab);
    if (tab === 'my-requests' && user?.role === 'lead') {
      await loadPendingRequests();
    }
  };

  if (loading) {
    return <LoadingOverlay isVisible={true} />;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      {user?.role === 'lead' && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('allocate')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'allocate'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Manual Allocate
            </button>
            <button
              onClick={() => handleTabChange('my-requests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my-requests'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              My Requests ({myRequests.length})
            </button>
          </nav>
        </div>
      )}

      {activeTab === 'allocate' && (
        <>
          {/* Search and Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by university..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Show:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Role:</strong> {user.role} 
            {user.entity_id && (
              <>
                {' | '}
                <strong>Entity:</strong> {entities.find(e => e.entity_id === user.entity_id)?.name || 'Unknown'}
              </>
            )}
          </p>
          {canAllocateDirectly() && (
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              You can allocate submissions directly as an admin.
            </p>
          )}
          {canRequestAllocate() && (
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              You can request to allocate submissions to your entity ({entities.find(e => e.entity_id === user.entity_id)?.name}). Admin will review your requests.
            </p>
          )}
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Submission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Responses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {submission.responses.find(r => r.field_name === 'form-code')?.value}
                        </div>
                        {pendingRequests.has(submission.id) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(submission.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {submission.responses
                        .filter(response => response.field_name === 'uni' || response.field_name === 'other--uni')
                        .map((response, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {response.field_name === 'other--uni' ? 'Other University' : 'University'}:
                          </span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {response.value_label || response.value}
                          </span>
                        </div>
                      ))}
                      {submission.responses.filter(r => r.field_name === 'uni' || r.field_name === 'other--uni').length === 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          No university field
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {canAllocateDirectly() ? (
                        <select
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          onChange={(e) => {
                            const entityId = Number(e.target.value);
                            if (entityId) {
                              handleAllocate(submission.id, entityId);
                            }
                          }}
                          disabled={allocating === submission.id}
                        >
                          <option value="">Select entity...</option>
                          {getEntityOptions().map((entity) => (
                            <option key={entity.entity_id} value={entity.entity_id}>
                              {entity.name}
                            </option>
                          ))}
                        </select>
                      ) : canRequestAllocate() ? (
                        pendingRequests.has(submission.id) ? (
                          <button
                            onClick={() => handleCancelRequest(submission.id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                          >
                            Cancel Request
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const entityId = user?.entity_id;
                              if (entityId) {
                                handleRequestAllocate(submission.id, entityId);
                              }
                            }}
                            disabled={requesting === submission.id}
                            className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {requesting === submission.id ? 'Requesting...' : 'Request Allocate'}
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          No permission
                        </span>
                      )}
                      
                      {(allocating === submission.id || requesting === submission.id) && (
                        <div className="flex items-center">
                          <Image
                            src="/giphy.gif"
                            alt="Loading"
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentSubmissions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No submissions found matching your search.' : 'No submissions available for allocation.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'my-requests' && (
        <div className="space-y-4">
          {loadingRequests ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Submission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {myRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          #{request.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          #{request.submission_id}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {request.form_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {request.requested_entity_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : request.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(request.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(request.submission_id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                          >
                            Cancel
                          </button>
                        )}
                        {request.admin_notes && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Note: {request.admin_notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {myRequests.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No requests found.</p>
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
