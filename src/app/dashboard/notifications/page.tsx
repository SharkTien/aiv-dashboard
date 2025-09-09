"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";

type TabType = 'notifications' | 'allocation-requests';
type AllocationTabType = 'ogv' | 'tmr';

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

type AllocationRequest = {
  id: number;
  submission_id: number;
  requested_by: number;
  requested_entity_id: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  requester_name: string;
  requester_email: string;
  requested_entity_name: string;
  submission_timestamp: string;
  form_name: string;
  form_code: string;
  form_type: string;
  responses: Array<{
    field_name: string;
    value: string;
    value_label?: string;
  }>;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [allocationTab, setAllocationTab] = useState<AllocationTabType>('ogv');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allocationRequests, setAllocationRequests] = useState<AllocationRequest[]>([]);
  const [allAllocationRequests, setAllAllocationRequests] = useState<AllocationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab, allocationTab]);

  async function loadUser() {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'notifications') {
        await loadNotifications();
      } else if (activeTab === 'allocation-requests' && user?.role === 'admin') {
        await loadAllAllocationRequests(); // Load all requests for count
        await loadAllocationRequests(); // Load filtered requests
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=50', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async function loadAllocationRequests() {
    try {
      const formType = allocationTab === 'ogv' ? 'oGV' : 'TMR';
      const res = await fetch(`/api/allocation-requests?limit=50&form_type=${formType}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAllocationRequests(data.items || []);
      }
    } catch (error) {
      console.error('Error loading allocation requests:', error);
    }
  }

  async function loadAllAllocationRequests() {
    try {
      const res = await fetch('/api/allocation-requests?limit=100', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAllAllocationRequests(data.items || []);
      }
    } catch (error) {
      console.error('Error loading all allocation requests:', error);
    }
  }

  async function markAsRead(notificationId: number) {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        cache: 'no-store'
      });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      
      // Refresh notification count in sidebar
      if ((window as any).refreshNotificationCount) {
        (window as any).refreshNotificationCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function processAllocationRequest(requestId: number, action: 'approve' | 'reject', adminNotes?: string) {
    try {
      const res = await fetch(`/api/allocation-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: adminNotes }),
        cache: 'no-store'
      });

      if (res.ok) {
        await loadAllAllocationRequests(); // Refresh all requests for count
        await loadAllocationRequests(); // Refresh filtered requests
        await loadNotifications(); // Refresh notifications
        
        // Refresh notification count in sidebar
        if ((window as any).refreshNotificationCount) {
          (window as any).refreshNotificationCount();
        }
      }
    } catch (error) {
      console.error('Error processing allocation request:', error);
    }
  }

  if (!user) {
    return <LoadingOverlay isVisible={true} />;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Manage your notifications and allocation requests.
          </p>
        </div>
      </div>

      <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-gray-800/80 backdrop-blur p-6 space-y-4">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'notifications'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Notifications
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setActiveTab('allocation-requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'allocation-requests'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Allocation Requests
              </button>
            )}
          </nav>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <img
              src="/giphy.gif"
              alt="Loading"
              width={40}
              height={40}
              className="rounded"
            />
          </div>
        ) : (
          <>
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No notifications found.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border ${
                        notification.is_read
                          ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                          : 'bg-white dark:bg-gray-800 border-sky-200 dark:border-sky-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'allocation-requests' && user.role === 'admin' && (
              <div className="space-y-4">
                {/* Allocation Requests Sub-tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setAllocationTab('ogv')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        allocationTab === 'ogv'
                          ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      oGV ({allAllocationRequests.filter(r => r.form_type === 'oGV').length})
                    </button>
                    <button
                      onClick={() => setAllocationTab('tmr')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        allocationTab === 'tmr'
                          ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      TMR ({allAllocationRequests.filter(r => r.form_type === 'TMR').length})
                    </button>
                  </nav>
                </div>

                {allocationRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No {allocationTab === 'ogv' ? 'oGV' : 'TMR'} allocation requests found.
                    </p>
                  </div>
                ) : (
                  allocationRequests.map((request) => (
                    <AllocationRequestCard
                      key={request.id}
                      request={request}
                      onProcess={processAllocationRequest}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AllocationRequestCard({ 
  request, 
  onProcess 
}: { 
  request: AllocationRequest; 
  onProcess: (id: number, action: 'approve' | 'reject', notes?: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleProcess = async (action: 'approve' | 'reject') => {
    setProcessing(true);
    try {
      await onProcess(request.id, action, adminNotes);
      setAdminNotes('');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Allocation Request
            </h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              request.status === 'pending' 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : request.status === 'approved'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {request.status}
            </span>
          </div>
          
          <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <p><strong>Requester:</strong> {request.requester_name} ({request.requester_email})</p>
            <p><strong>Submission & Phases:</strong> {request.responses.find(r => r.field_name === 'form-code')?.value} {request.form_name.replace('Submissions','')}</p>
            <p><strong>Requested LC to be allocated:</strong> {request.requested_entity_name}</p>
            <p>{new Date(request.created_at).toLocaleString()}</p>
          </div>

          {request.admin_notes && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
              <strong>Admin Notes:</strong> {request.admin_notes}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              {showDetails ? 'Hide Details' : 'View Details'}
            </button>
          </div>

          {showDetails && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <strong>Submission Timestamp:</strong> {new Date(request.submission_timestamp).toLocaleString()}
              </p>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Form Responses:</p>
                {request.responses
                  .filter(response => 
                    response.field_name !== 'uni' && 
                    response.field_name !== 'other--uni' &&
                    response.field_name !== 'otheruni' &&
                    !response.field_name.toLowerCase().includes('long')
                  )
                  .map((response, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>{response.field_name}:</strong> {response.value_label || response.value}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {request.status === 'pending' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  rows={2}
                  placeholder="Add notes for the requester..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleProcess('approve')}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleProcess('reject')}
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
