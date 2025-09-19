"use client";

import { useState, useEffect } from "react";
import UTMAnalytics from "@/components/UTMAnalytics";
import AccessDenied from "@/components/AccessDenied";
import { checkProgramAccess } from "@/hooks/useProgramAccess";
import FormTrackingTable from "@/components/FormTrackingTable";

interface Form {
  id: number;
  name: string;
  code: string;
}

interface AnalyticsData {
  totalSignUps: number;
  userSignUps: number;
  dailySignUps: Array<{
    date: string;
    local: string;
    signUps: number;
  }>;
  channelBreakdown: Array<{
    channel: string;
    signUps: number;
    percentage: number;
  }>;
  utmBreakdown: Array<{
    utm_campaign: string;
    utm_source: string;
    utm_medium: string;
    signUps: number;
  }>;
  uniDistribution: Array<{
    uni_name: string;
    signUps: number;
    percentage: number;
  }>;
  ageGroupDistribution: Array<{
    ageGroup: string;
    signUps: number;
    percentage: number;
  }>;
  majorDistribution: Array<{
    major: string;
    signUps: number;
    percentage: number;
  }>;
  universityYearDistribution: Array<{
    entity_name: string;
    entity_id: number;
    totalSignUps: number;
    yearDistribution: Array<{
      universityYear: string;
      signUps: number;
      percentage: number;
    }>;
  }>;
}

export default function AnalyticsPage() {
  const [selectedForm, setSelectedForm] = useState<number | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedUni, setSelectedUni] = useState<string>('');
  const [entities, setEntities] = useState<string[]>([]);
  const [universities, setUniversities] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [filteredUniversities, setFilteredUniversities] = useState<string[]>([]);
  const [uniSearch, setUniSearch] = useState<string>("");
  const [filteredUniDistribution, setFilteredUniDistribution] = useState<AnalyticsData['uniDistribution']>([]);
  const [loadingUniDistribution, setLoadingUniDistribution] = useState(false);
  const [activeTab, setActiveTab] = useState<'clicks' | 'forms'>('clicks');
  const [myEntityName, setMyEntityName] = useState<string>("");
  const [userSignUps, setUserSignUps] = useState<number>(0);
  // Form Tracking (UTM submissions) state
  const [ftLoading, setFtLoading] = useState(false);
  const [ftData, setFtData] = useState<{ links: any[]; allDates: string[]; dayTotalSubmissions: Record<string, number>; meta?: { page: number; pageSize: number; totalPages: number; totalCombos: number } } | null>(null);
  const [ftPage, setFtPage] = useState(1);
  const [ftPageSize, setFtPageSize] = useState(80);
  const [ftDatePage, setFtDatePage] = useState(1);
  const [ftDatePageSize, setFtDatePageSize] = useState(30);
  const [ftRollup, setFtRollup] = useState<'day'|'week'>('day');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ftError, setFtError] = useState<string | null>(null);
  const [ftStartDate, setFtStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0,10);
  });
  const [ftEndDate, setFtEndDate] = useState(() => new Date().toISOString().slice(0,10));

  useEffect(() => {
    loadForms();
    loadUser();
  }, []);

  useEffect(() => {
    if (!selectedForm || !user) return;
    if (user.role !== 'admin' && !myEntityName) return;
    loadUserSignUps();
    if (user.role !== 'admin' && myEntityName) {
      setSelectedEntity(myEntityName);
      loadFilteredUniversities();
    }
  }, [selectedForm, user, myEntityName]);

  useEffect(() => {
    if (!selectedForm) return;
    if (user && user.role !== 'admin' && !myEntityName) return;
    loadAnalyticsData();
    loadFilters();
  }, [selectedForm, user, myEntityName]);

  useEffect(() => {
    if (!selectedForm) return;
    if (user && user.role !== 'admin' && !myEntityName) return;
    loadFilteredUniDistribution();
  }, [selectedEntity, selectedUni, user, myEntityName]);

  // Non-admin: ensure first load fetches filtered data immediately when entity is ready
  useEffect(() => {
    if (!selectedForm) return;
    if (!user || user.role === 'admin') return;
    if (!myEntityName) return;
    loadFilteredUniversities();
    loadFilteredUniDistribution();
  }, [selectedForm, user, myEntityName]);

  useEffect(() => {
    if (selectedEntity) {
      loadFilteredUniversities();
      setSelectedUni(''); // Reset university selection when entity changes
    } else {
      setFilteredUniversities(universities);
    }
  }, [selectedEntity, universities, user]);

  const displayedUniversities = (uniSearch.trim()
    ? filteredUniversities.filter(u => String(u || '').toLowerCase().includes(uniSearch.toLowerCase()))
    : filteredUniversities);

    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();
        
        if (result.user) {
          setUser(result.user);
          try {
            if (result.user.role !== 'admin' && result.user.entity_id) {
              const entsRes = await fetch('/api/entities', { cache: 'no-store' });
              if (entsRes.ok) {
                const ents = await entsRes.json();
                const items = Array.isArray(ents.items) ? ents.items : [];
                const match = items.find((e: any) => e?.entity_id === result.user.entity_id);
                if (match?.name) {
                  setMyEntityName(match.name);
                  setSelectedEntity(match.name);
                }
              }
            }
          } catch {}
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
  
  const loadUserSignUps = async () => {
    if (!selectedForm || !user) return;
    
    try {
      const response = await fetch(`/api/dashboard/tmr-analytics?formId=${selectedForm}&entity=${user.entity_id}`);
      const result = await response.json();
      
      if (result.success) {
        setUserSignUps(result.data.totalSignUps);
      }
    } catch (error) {
      console.error('Error loading user sign ups:', error);
    }
  };

  const loadForms = async () => {
    try {
      const response = await fetch('/api/dashboard/tmr-forms');
      const result = await response.json();
 
      if (result.success) {
        setForms(result.data);
        if (result.data.length > 0) {
          setSelectedForm(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    }
  };

  const loadFilters = async () => {
    if (!selectedForm) return;

    try {
      const baseUrl = `/api/dashboard/tmr-analytics/filters?formId=${selectedForm}`;
      const url = user && user.role !== 'admin' && myEntityName
        ? `${baseUrl}&entity=${encodeURIComponent(myEntityName)}`
        : baseUrl;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setEntities(result.data.entities || []);
        setUniversities(result.data.universities || []);
        setFilteredUniversities(result.data.universities || []);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const loadFilteredUniversities = async () => {
    if (!selectedForm) return;

    try {
      // For non-admin users, force use their entity name regardless of selectedEntity UI
      const entityParam = user && user.role !== 'admin' ? (myEntityName || '') : selectedEntity;
      if (!entityParam) {
        setFilteredUniversities(universities);
        return;
      }
      const response = await fetch(`/api/dashboard/tmr-analytics/filters?formId=${selectedForm}&entity=${encodeURIComponent(entityParam)}`);
      const result = await response.json();

      if (result.success) {
        setFilteredUniversities(result.data.universities || []);
      }
    } catch (error) {
      console.error('Error loading filtered universities:', error);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedForm) return;

    try {
      setLoading(true);
      setLoadError(null);
      const response = await fetch(`/api/dashboard/tmr-analytics?formId=${selectedForm}`);
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
        if (!user || user.role === 'admin') {
          setFilteredUniDistribution(result.data.uniDistribution);
        } else {
          setFilteredUniDistribution([]);
        }
      } else {
        setLoadError('Kết nối bị gián đoạn hoặc quá tải. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setLoadError('Kết nối bị gián đoạn hoặc quá tải. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredUniDistribution = async () => {
    if (!selectedForm) return;

    try {
      setLoadingUniDistribution(true);
      const params = new URLSearchParams({ formId: selectedForm.toString() });
      if (user && user.role !== 'admin' && myEntityName) {
        params.append('entity', myEntityName);
      } else if (selectedEntity) {
        params.append('entity', selectedEntity);
      }
      if (selectedUni) params.append('uni', selectedUni);

      const response = await fetch(`/api/dashboard/tmr-analytics/uni-distribution?${params}`);
      const result = await response.json();

      if (result.success) {
        setFilteredUniDistribution(result.data);
      }
    } catch (error) {
      console.error('Error loading filtered university distribution:', error);
    } finally {
      setLoadingUniDistribution(false);
    }
  };

  const loadFormTracking = async () => {
    try {
      setFtLoading(true);
      setFtError(null);
      const params = new URLSearchParams({ start_date: ftStartDate, end_date: ftEndDate });
      if (selectedForm) params.append('form_id', String(selectedForm));
      params.append('page', String(ftPage));
      params.append('page_size', String(ftPageSize));
      params.append('date_page', String(ftDatePage));
      params.append('date_page_size', String(ftDatePageSize));
      if (ftRollup === 'week') params.append('rollup', 'week');
      const res = await fetch(`/api/utm/form-tracking?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json?.success) {
        setFtData({
          links: json.data?.links || [],
          allDates: json.data?.allDates || [],
          dayTotalSubmissions: json.data?.dayTotalSubmissions || {},
          meta: json.data?.meta
        });
      } else {
        setFtData({ links: [], allDates: [], dayTotalSubmissions: {}, meta: { page: ftPage, pageSize: ftPageSize, totalPages: 1, totalCombos: 0 } });
        setFtError(String(json?.details || json?.error || 'Không tải được dữ liệu.')); // show server detail
      }
    } catch (e) {
      setFtData({ links: [], allDates: [], dayTotalSubmissions: {}, meta: { page: ftPage, pageSize: ftPageSize, totalPages: 1, totalCombos: 0 } });
      setFtError('Không tải được dữ liệu Form Tracking. Thử lại.');
    } finally {
      setFtLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'forms') return;
    if (!user) return;
    loadFormTracking();
  }, [activeTab, user, selectedForm, ftPage, ftPageSize, ftStartDate, ftEndDate, ftDatePage, ftDatePageSize, ftRollup]);

  const selectedFormName = forms.find(f => f.id === selectedForm)?.name || '';

  // Check program access
  const { hasAccess, userProgram } = checkProgramAccess(user, 'TMR');
  
  if (user && !hasAccess) {
    return (
      <AccessDenied 
        userProgram={userProgram}
        requiredProgram="TMR"
        title="TMR Analytics Access Denied"
        message="This page is for TMR users only. Your account is associated with oGV."
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TMR Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive analytics and insights for TMR campaigns</p>
        </div>
      </div>

      {/* Form Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        {loadError && (
          <div className="mb-3 rounded-md bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 px-3 py-2 text-sm flex items-center justify-between">
            <span>{loadError}</span>
            <button
              onClick={() => {
                setLoadError(null);
                loadAnalyticsData();
              }}
              className="px-2 py-1 text-xs rounded-md bg-sky-600 hover:bg-sky-700 text-white"
            >
              Thử lại
            </button>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Phase
          </label>
          <select
            value={selectedForm || ''}
            onChange={(e) => setSelectedForm(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a form...</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.name.replace('TMR', '').replace('Submissions', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('clicks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clicks'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Click Tracking
            </button>
            <button
              onClick={() => setActiveTab('forms')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'forms'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Form Tracking
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'clicks' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">UTM Clicks</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Click tracking and UTM effectiveness</p>
              <UTMAnalytics formType="TMR" selectedFormId={selectedForm} />
            </div>
          )}

          {activeTab === 'forms' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Form Submissions Analytics</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Form submissions tracking and analysis</p>

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {analyticsData && !loading && (
                <div className="space-y-6">
                  {/* UTM Form Tracking Matrix */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Form Tracking by UTM</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Daily submissions by UTM link và bảng mật độ theo Campaign/Medium/Source.</p>
                      {/* Date range controls for Form Tracking */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                          <input type="date" value={ftStartDate} onChange={(e)=>setFtStartDate(e.target.value)} className="w-full h-9 rounded ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                          <input type="date" value={ftEndDate} onChange={(e)=>setFtEndDate(e.target.value)} className="w-full h-9 rounded ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div className="flex items-end">
                          <button onClick={loadFormTracking} className="h-9 w-full sm:w-auto px-4 rounded bg-sky-600 hover:bg-sky-700 text-white">Refresh</button>
                        </div>
                      </div>
                    </div>
                    {ftError && (
                      <div className="px-6 py-3 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 text-sm flex items-center justify-between">
                        <span>{ftError}</span>
                        <button onClick={loadFormTracking} className="px-2 py-1 text-xs rounded-md bg-sky-600 hover:bg-sky-700 text-white">Thử lại</button>
                      </div>
                    )}
                    {ftLoading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {!ftLoading && ftError && (!ftData || (ftData?.links || []).length === 0) && (
                      <div className="p-8 text-center text-sm text-gray-600 dark:text-gray-400">
                        <div className="mb-2">Không tải được dữ liệu Form Tracking. Có thể do quá tải kết nối.</div>
                        <button onClick={loadFormTracking} className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white">Thử lại</button>
                      </div>
                    )}
                    {ftData && ftData.allDates?.length > 0 && (
                      <div className="p-4 space-y-6">
                        {ftData.meta && (
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>Page {ftData.meta.page} / {ftData.meta.totalPages}</span>
                            <span>•</span>
                            <span>{ftData.meta.totalCombos} UTM combinations</span>
                            <span>•</span>
                            <label className="inline-flex items-center gap-1">Page size
                              <select value={ftPageSize} onChange={(e)=>{ setFtPageSize(Number(e.target.value)); setFtPage(1); }} className="ml-1 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-2">
                                {[40,80,120,160].map(n=> <option key={n} value={n}>{n}</option>)}
                              </select>
                            </label>
                            <span>•</span>
                            <label className="inline-flex items-center gap-1">Date page
                              <select value={ftDatePageSize} onChange={(e)=>{ setFtDatePageSize(Number(e.target.value)); setFtDatePage(1); }} className="ml-1 h-7 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-2">
                                {[14,30,60,90].map(n=> <option key={n} value={n}>{n}d</option>)}
                              </select>
                            </label>
                            <div className="ml-auto flex items-center gap-2">
                              <button onClick={()=> setFtDatePage(p=> Math.max(1, p-1))} disabled={(ftData.meta as any)?.datePage <= 1} className="h-7 px-2 rounded bg-gray-100 dark:bg-gray-700 disabled:opacity-50">Prev dates</button>
                              <button onClick={()=> setFtDatePage(p=> Math.min((ftData.meta as any)?.totalDatePages || 1, p+1))} disabled={(ftData.meta as any)?.datePage >= (ftData.meta as any)?.totalDatePages} className="h-7 px-2 rounded bg-gray-100 dark:bg-gray-700 disabled:opacity-50">Next dates</button>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="inline-flex items-center gap-1">
                                <input type="checkbox" checked={ftRollup==='week'} onChange={(e)=>{ setFtRollup(e.target.checked ? 'week' : 'day'); setFtDatePage(1); }} /> Weekly rollup
                              </label>
                            </div>
                            <div className="ml-2 flex items-center gap-2">
                              <button onClick={()=> setFtPage(p=> Math.max(1, p-1))} disabled={(ftData.meta?.page||1) <= 1} className="h-7 px-2 rounded bg-gray-100 dark:bg-gray-700 disabled:opacity-50">Prev</button>
                              <button onClick={()=> setFtPage(p=> Math.min(ftData.meta!.totalPages, p+1))} disabled={(ftData.meta?.page||1) >= (ftData.meta?.totalPages||1)} className="h-7 px-2 rounded bg-gray-100 dark:bg-gray-700 disabled:opacity-50">Next</button>
                              <button onClick={loadFormTracking} className="h-7 px-2 rounded bg-sky-600 text-white">Thử lại</button>
                            </div>
                          </div>
                        )}
                        {/* User Performance-style matrix but for submissions */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white">User Performance by UTM Link (Submissions)</h3>
                          </div>
                          <SubmissionPerformanceTable links={ftData.links} dates={ftData.allDates} />
                        </div>

                        {/* Detailed tracking + density */}
                        <FormTrackingTable 
                          links={ftData.links}
                          allDates={ftData.allDates}
                          dayTotalSubmissions={ftData.dayTotalSubmissions}
                          selectedEntity={selectedEntity}
                          isAdmin={!!user && user.role === 'admin'}
                          entities={[]}
                        />
                      </div>
                    )}
                  </div>
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sign Ups</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                            {analyticsData.totalSignUps.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Total submissions for this campaign
                          </p>
                        </div>
                      </div>
                    </div>


                       {/* Your Sign Ups Card - Only show for non-admin users */}
                       {user && user?.role !== 'admin' && (
                         <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                         <div className="flex items-center">
                           <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                             <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                             </svg>
                           </div>
                           <div className="ml-4 flex-1 min-w-0">
                             <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Your Total Sign Ups</p>
                             <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                               {userSignUps.toLocaleString()}
                             </p>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                               Your entity's submissions for this form
                             </p>
                           </div>
                         </div>
                       </div>
                       )}
                   </div>
 
                   {/* Daily Sign Ups Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Daily Sign Ups by Local ({selectedFormName.replace('TMR', '').replace('Submissions', '')})
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Daily sign ups by local for all submissions. Green cells indicate days with sign ups.
                      </p>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto thin-scrollbar">
                      <DailySignUpsTable data={analyticsData.dailySignUps} />
                    </div>
                  </div>

                  {/* Channel Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Local ranking
                      </h3>
                      <ChannelBreakdownChart data={analyticsData.channelBreakdown} />
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        UTM Campaign Performance
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Top 10 most effective UTM campaigns. Shows campaign, source, medium and corresponding sign ups.
                      </p>
                      <UTMBreakdownTable data={analyticsData.utmBreakdown} />
                    </div>
                  </div>

                  {/* University Distribution */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      University Distribution
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Distribution of sign ups by university. Shows percentage breakdown of submissions from each university.
                    </p>

                    {/* Filters for University Distribution */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      {/* Only show entity filter for admin users */}
                      {user && user.role === 'admin' && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Entity:
                          </label>
                          <select
                            value={selectedEntity}
                            onChange={(e) => setSelectedEntity(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">All</option>
                            {entities.map((entity) => (
                              <option key={entity} value={entity}>
                                {entity}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          University:
                        </label>
                        <select
                          value={selectedUni}
                          onChange={(e) => setSelectedUni(e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All</option>
                          {displayedUniversities.map((uni) => (
                            <option key={uni} value={uni}>
                              {uni}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {loadingUniDistribution ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading university data...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <PieChart data={filteredUniDistribution} />
                        </div>
                        <div>
                          <UniversityList data={filteredUniDistribution} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Academic Analytics */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Academic Analytics
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Analysis of academic background including major distribution and university year breakdown.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Major Distribution</h4>
                        <MajorChart data={analyticsData.majorDistribution} />
                      </div>
                      <div>
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">University Year Distribution</h4>
                        <UniversityYearChart data={analyticsData.universityYearDistribution} />
                      </div>
                    </div>
                  </div>
                </div>  
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Daily Sign Ups Table Component
function DailySignUpsTable({ data }: { data: AnalyticsData['dailySignUps'] }) {
  // Get actual dates from data and create full range
  const actualDates = [...new Set(data.map(d => d.date))].sort();
  const locals = [...new Set(data.map(d => d.local))].sort();
  
  // If we have data, use the actual date range from data
  // Otherwise, generate last 30 days
  let dates = actualDates;
  if (actualDates.length === 0) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const fullDateRange = [];
    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      fullDateRange.push(d.toISOString().split('T')[0]);
    }
    dates = fullDateRange;
  }
  
  const dataMatrix = locals.map(local => ({
    local,
    signUps: dates.map(date => {
      const item = data.find(d => d.date === date && d.local === local);
      return item ? item.signUps : 0;
    })
  }));

  // Calculate max value for color intensity
  let maxValue = 0;
  dataMatrix.forEach(row => {
    row.signUps.forEach(value => {
      if (value > maxValue) maxValue = value;
    });
  });

  // Color intensity function for daily signups
  const getDailyColorIntensity = (value: number) => {
    if (value === 0) return 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500';
    if (value === 1) return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 font-semibold';
    if (value <= 3) return 'bg-green-200 dark:bg-green-800/50 text-green-900 dark:text-green-100 font-semibold';
    if (value <= 5) return 'bg-green-300 dark:bg-green-700/60 text-green-900 dark:text-green-100 font-bold';
    if (value <= 10) return 'bg-green-400 dark:bg-green-600/70 text-white font-bold';
    return 'bg-green-500 dark:bg-green-500/80 text-white font-bold';
  };

  return (
    <div>
      
      <table className="w-full">
      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Local
          </th>
          {dates.map(date => (
            <th key={date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </th>
          ))}
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {dataMatrix.map((row, index) => (
          <tr key={row.local} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
              {row.local}
            </td>
            {row.signUps.map((signUps, dateIndex) => (
              <td key={dateIndex} className={`px-2 py-3 text-center text-sm transition-colors duration-200 ${getDailyColorIntensity(signUps)}`}>
                {signUps}
              </td>
            ))}
            <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
              {row.signUps.reduce((sum, val) => sum + val, 0)}
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}

// Channel Breakdown Chart Component
function ChannelBreakdownChart({ data }: { data: AnalyticsData['channelBreakdown'] }) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.channel} className="flex items-center">
          <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">
            {item.channel}
          </div>
          <div className="flex-1 mx-3">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${item.percentage}%` }}
              ></div>
            </div>
          </div>
          <div className="w-16 text-sm text-gray-900 dark:text-white text-right">
            {item.signUps.toLocaleString()}
          </div>
          <div className="w-12 text-sm text-gray-500 dark:text-gray-400 text-right">
            {Number(item.percentage || 0).toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

// UTM Breakdown Table Component
function UTMBreakdownTable({ data }: { data: AnalyticsData['utmBreakdown'] }) {
  return (
    <div className="overflow-x-auto max-h-96 overflow-y-auto thin-scrollbar">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white dark:bg-gray-800">
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 text-gray-600 dark:text-gray-400">Campaign</th>
            <th className="text-left py-2 text-gray-600 dark:text-gray-400">Source</th>
            <th className="text-left py-2 text-gray-600 dark:text-gray-400">Medium</th>
            <th className="text-right py-2 text-gray-600 dark:text-gray-400">Sign Ups</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).filter(item => item.utm_campaign !== "No campaign").map((item, index) => (
            <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td 
                className="py-2 text-gray-900 dark:text-white truncate max-w-32 cursor-help"
                title={item.utm_campaign}
              >
                {item.utm_campaign}
              </td>
              <td 
                className="py-2 text-gray-600 dark:text-gray-400 truncate max-w-32 cursor-help"
                title={item.utm_source}
              >
                {item.utm_source}
              </td>
              <td 
                className="py-2 text-gray-600 dark:text-gray-400 truncate max-w-32 cursor-help"
                title={item.utm_medium}
              >
                {item.utm_medium}
              </td>
              <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                {item.signUps.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pie Chart Component
function PieChart({ data }: { data: AnalyticsData['uniDistribution'] }) {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  let cumulativePercentage = 0;

  return (
    <div className="h-80 sm:h-96 flex items-center justify-center relative overflow-hidden">
      <svg width="280" height="280" className="transform -rotate-90">
        <circle
          cx="140"
          cy="140"
          r="110"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="2"
          className="dark:stroke-gray-600"
        />
        {data.map((item, index) => {
          const percentage = Number(item.percentage || 0);
          const strokeDasharray = `${(percentage / 100) * 691} 691`;
          const strokeDashoffset = -cumulativePercentage * 6.91;
          cumulativePercentage += percentage;

          return (
            <circle
              key={item.uni_name}
              cx="140"
              cy="140"
              r="110"
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth="20"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out hover:stroke-width-24 animate-pulse"
              style={{
                animationDelay: `${index * 200}ms`,
                animationDuration: '1.5s',
                animationIterationCount: '1',
                animationFillMode: 'forwards',
                strokeDasharray: '0 691',
                strokeDashoffset: '0'
              }}
              onAnimationEnd={(e) => {
                e.currentTarget.style.strokeDasharray = strokeDasharray;
                e.currentTarget.style.strokeDashoffset = strokeDashoffset.toString();
              }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        <div className="px-3 py-2 animate-bounce" style={{ animationDelay: '1s', animationDuration: '2s' }}>
          <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
          {Number(data.reduce((sum, item) => sum + (item?.signUps || 0), 0)).toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Sign Ups</div>
        </div>
      </div>
    </div>
  );
}

// University List Component
function UniversityList({ data }: { data: AnalyticsData['uniDistribution'] }) {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto thin-scrollbar">
      {data.map((item, index) => (
        <div 
          key={item.uni_name} 
          className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transform transition-all duration-500 ease-out hover:scale-105 hover:shadow-md"
          style={{
            animationDelay: `${index * 100}ms`,
            animationName: 'slideInFromRight',
            animationDuration: '0.6s',
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
            opacity: 0,
            transform: 'translateX(20px)'
          }}
        >
          <div 
            className="w-4 h-4 rounded-full mr-3 flex-shrink-0 animate-pulse"
            style={{ 
              backgroundColor: colors[index % colors.length],
              animationDelay: `${index * 100}ms`,
              animationDuration: '2s'
            }}
          ></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.uni_name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {Number(item.percentage || 0).toFixed(1)}% • {item.signUps.toLocaleString()} sign ups
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Major Chart Component
function MajorChart({ data }: { data: AnalyticsData['majorDistribution'] }) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];
  
  if (!data || !Array.isArray(data)) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No major data available
      </div>
    );
  }
  
  return (
    <div className="space-y-2 max-h-120 overflow-y-auto thin-scrollbar">
      {data.map((item, index) => (
        <div 
          key={item?.major || index}
          className="flex items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg transform transition-all duration-500 ease-out hover:scale-105 hover:shadow-md"
          style={{
            animationDelay: `${index * 100}ms`,
            animationName: 'slideInFromRight',
            animationDuration: '0.6s',
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
            opacity: 0,
            transform: 'translateX(20px)'
          }}
        >
          <div 
            className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
            style={{ backgroundColor: colors[index % colors.length] }}
          ></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item?.major || 'Unknown Major'}
            </div>
          </div>
          <div className="text-right ml-2">
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {(item?.signUps || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {Number(item?.percentage || 0).toFixed(1)}%
            </div>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No major data available
        </div>
      )}
    </div>
  );
}

// University Year Chart Component
function UniversityYearChart({ data }: { data: AnalyticsData['universityYearDistribution'] }) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  
  if (!data || !Array.isArray(data)) {
  return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No university year data available
    </div>
  );
}

  // Get all unique university years and sort them
  const allYears = new Set<string>();
  data.forEach(entity => {
    entity?.yearDistribution?.forEach(item => {
      if (item?.universityYear) {
        allYears.add(item.universityYear);
      }
    });
  });
  
  const sortedYears = Array.from(allYears).sort((a, b) => {
    const yearOrder: { [key: string]: number } = {
      '1st year': 1,
      '2nd year': 2,
      '3rd year': 3,
      '4th year': 4,
      '5th year': 5,
      'Graduate': 6
    };
    return (yearOrder[a] || 7) - (yearOrder[b] || 7);
  });

  // Create a map for quick lookup
  const entityYearMap: { [key: string]: { [key: string]: number } } = {};
  data.forEach(entity => {
    if (entity?.entity_name) {
      entityYearMap[entity.entity_name] = {};
      entity?.yearDistribution?.forEach(item => {
        if (item?.universityYear && item?.signUps) {
          entityYearMap[entity.entity_name][item.universityYear] = item.signUps;
        }
      });
    }
  });

  // Calculate max value for color intensity
  let maxValue = 0;
  Object.values(entityYearMap).forEach(entityData => {
    Object.values(entityData).forEach(value => {
      if (value > maxValue) maxValue = value;
    });
  });

  // Color intensity function
  const getColorIntensity = (value: number) => {
    if (value === 0) return 'bg-gray-50 dark:bg-gray-800';
    const intensity = Math.min(value / maxValue, 1);
    if (intensity <= 0.2) return 'bg-blue-100 dark:bg-blue-900/30';
    if (intensity <= 0.4) return 'bg-blue-200 dark:bg-blue-900/50';
    if (intensity <= 0.6) return 'bg-blue-300 dark:bg-blue-800/60';
    if (intensity <= 0.8) return 'bg-blue-400 dark:bg-blue-700/70';
    return 'bg-blue-500 dark:bg-blue-600/80';
  };

  return (
    <div>
      {/* Color Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-gray-600 dark:text-gray-400 font-medium">Intensity:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded"></div>
          <span className="text-gray-500 dark:text-gray-400">0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 border border-gray-200 dark:border-gray-600 rounded"></div>
          <span className="text-gray-500 dark:text-gray-400">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-300 dark:bg-blue-800/60 border border-gray-200 dark:border-gray-600 rounded"></div>
          <span className="text-gray-500 dark:text-gray-400">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600/80 border border-gray-200 dark:border-gray-600 rounded"></div>
          <span className="text-gray-500 dark:text-gray-400">High</span>
        </div>
        <span className="text-gray-500 dark:text-gray-400">Max: {maxValue.toLocaleString()}</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
              Entity
            </th>
            {sortedYears.map((year, index) => (
              <th 
                key={year}
                className="text-center py-2 px-3 font-medium text-gray-900 dark:text-white min-w-[80px]"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationName: 'slideInFromRight',
                  animationDuration: '0.4s',
                  animationTimingFunction: 'ease-out',
                  animationFillMode: 'forwards',
                  opacity: 0,
                  transform: 'translateX(20px)'
                }}
              >
                {year}
              </th>
            ))}
            <th className="text-center py-2 px-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((entity, entityIndex) => {
            const entityTotal = entity?.totalSignUps || 0;
            return (
              <tr 
                key={entity?.entity_name || entityIndex}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                style={{
                  animationDelay: `${entityIndex * 100}ms`,
                  animationName: 'slideInFromRight',
                  animationDuration: '0.4s',
                  animationTimingFunction: 'ease-out',
                  animationFillMode: 'forwards',
                  opacity: 0,
                  transform: 'translateX(20px)'
                }}
              >
                <td className="py-2 px-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
                  {entity?.entity_name || 'Unknown Entity'}
                </td>
                {sortedYears.map((year, yearIndex) => {
                  const count = entityYearMap[entity?.entity_name || '']?.[year] || 0;
                  return (
                    <td 
                      key={`${entity?.entity_name}-${year}`}
                      className={`text-center py-2 px-3 text-gray-700 dark:text-gray-300 transition-colors duration-200 ${getColorIntensity(count)}`}
                    >
                      {count > 0 ? count.toLocaleString() : '-'}
                    </td>
                  );
                })}
                <td className="text-center py-2 px-3 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700">
                  {entityTotal.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}

function SubmissionPerformanceTable({ links, dates }: { links: Array<any>; dates: string[] }) {
  const [showPercent, setShowPercent] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  const perLink = links.map((l: any) => {
    const byDate: Record<string, { total: number; unique: number }> = {};
    dates.forEach(d => {
      const v = l?.dailySubmissions?.[d] || { total: 0, unique: 0 };
      byDate[d] = { total: Number(v.total || 0), unique: Number(v.unique || 0) };
    });
    return { link: l, byDate };
  });

  // Totals per day
  const dayTotals: Record<string, { total: number; unique: number }> = {};
  dates.forEach(d => { dayTotals[d] = { total: 0, unique: 0 }; });
  perLink.forEach(({ byDate }) => {
    dates.forEach(d => {
      dayTotals[d].total += byDate[d].total;
      dayTotals[d].unique += byDate[d].unique;
    });
  });

  // Max per-day to color
  const perDateMax: Record<string, number> = {};
  dates.forEach(d => {
    let m = 1;
    perLink.forEach(({ byDate }) => { if (byDate[d].total > m) m = byDate[d].total; });
    perDateMax[d] = m;
  });
  const bgFor = (d: string, val: number, share: number) => {
    const ratio = showPercent ? Math.min(1, share / 100) : Math.min(1, val / (perDateMax[d] || 1));
    const alpha = ratio === 0 ? 0 : 0.12 + 0.68 * ratio;
    return { backgroundColor: `rgba(59, 130, 246, ${alpha.toFixed(3)})` };
  };

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-xs">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showPercent} onChange={(e)=>setShowPercent(e.target.checked)} /> <span>Show % share</span></label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={compactMode} onChange={(e)=>setCompactMode(e.target.checked)} /> <span>Compact (hide unique)</span></label>
      </div>
      <div className="overflow-x-auto w-full pb-1">
        <table className="min-w-max text-xs md:text-sm border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left w-[200px] min-w-[200px]">UTM</th>
              <th className="sticky left-[200px] z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left w-[180px] min-w-[180px]">Campaign</th>
              <th className="sticky left-[380px] z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left w-[140px] min-w-[140px]">Medium</th>
              <th className="sticky left-[520px] z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left w-[160px] min-w-[160px]">Source</th>
              {dates.map(d => (
                <th key={d} className="px-2 py-2 text-center whitespace-nowrap">
                  <div className="text-[11px] text-gray-700 dark:text-gray-200">
                    {new Date(d).toLocaleDateString(undefined,{month:'short', day:'numeric'})}
                  </div>
                  <div className="text-[10px] text-amber-600">{showPercent ? 'share | uniq%' : 'total | uniq'}</div>
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {/* Totals row */}
            <tr className="border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40">
              <td className="sticky left-0 bg-gray-50 dark:bg-gray-700/40 px-3 py-2 font-semibold" colSpan={4}>TOTALS</td>
              {dates.map(d => (
                <td key={`tot-${d}`} className="px-2 py-1 text-center">
                  <div className="text-[12px] font-semibold">{dayTotals[d].total}</div>
                  {!compactMode && <div className="text-[10px] text-gray-600">{dayTotals[d].unique}</div>}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-semibold">
                {Object.values(dayTotals).reduce((s, v) => s + v.total, 0)}
              </td>
            </tr>
            {perLink.map(({ link, byDate }) => (
              <tr key={link.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="sticky left-0 z-0 bg-white dark:bg-gray-800 px-3 py-2 w-[200px] min-w-[200px] truncate" title={link.utm_name}>{link.custom_name || link.utm_name || 'Unnamed'}</td>
                <td className="sticky left-[200px] z-0 bg-white dark:bg-gray-800 px-3 py-2 w-[180px] min-w-[180px] truncate" title={link.campaign_name}>{link.campaign_name}</td>
                <td className="sticky left-[380px] z-0 bg-white dark:bg-gray-800 px-3 py-2 w-[140px] min-w-[140px] truncate" title={link.medium_name}>{link.medium_name}</td>
                <td className="sticky left-[520px] z-0 bg-white dark:bg-gray-800 px-3 py-2 w-[160px] min-w-[160px] truncate" title={link.source_name}>{link.source_name}</td>
                {dates.map(d => {
                  const v = byDate[d] || { total: 0, unique: 0 };
                  const totalDay = dayTotals[d].total || 0;
                  const share = totalDay > 0 ? (v.total / totalDay) * 100 : 0;
                  const uniqShare = totalDay > 0 ? (v.unique / totalDay) * 100 : 0;
                  return (
                    <td key={`${link.id}-${d}`} className="px-2 py-1 text-center" style={bgFor(d, v.total, share)}>
                      <div className="text-[12px] font-medium text-gray-900 dark:text-white">{showPercent ? `${share.toFixed(1)}%` : v.total}</div>
                      {!compactMode && (
                        <div className="text-[10px] text-gray-500">{showPercent ? `${uniqShare.toFixed(1)}%` : v.unique}</div>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-semibold">
                  {Object.values(byDate).reduce((s, it) => s + (it?.total || 0), 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
