"use client";

import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import DateFilter, { DatePreset } from "./DateFilter";

interface UTMAnalyticsProps {
  formType?: "oGV" | "TMR";
  selectedFormId?: number | null;
}

interface UTMLink {
  id: number;
  entity_name: string;
  campaign_name: string;
  campaign_code: string;
  source_name: string;
  source_code: string;
  source_platform: string;
  medium_name: string;
  medium_code: string;
  utm_name: string;
  custom_name: string | null;
  clicks: number;
  uniqueClicks: number;
  clicksByDate: Array<{ date: string; clicks: number; unique?: number }>;
  shortened_url: string;
  tracking_short_url?: string;
  created_at: string;
  conversionRate?: number;
  effectivenessScore?: number;
  trendDirection?: 'up' | 'down' | 'stable';
  peakDay?: string;
  avgDailyClicks?: number;
}

interface UTMInsights {
  mediumPerformance: Array<{
    medium_name: string;    
    medium_code: string;
    totalClicks: number;
    uniqueClicks: number;
    linkCount: number;
  }>;
  sourcePerformance: Array<{
    source_name: string;
    source_code: string;
    source_platform: string;
    totalClicks: number;
    uniqueClicks: number;
    linkCount: number;
  }>;
  campaignPerformance: Array<{
    campaign_name: string;
    campaign_code: string;
    totalClicks: number;
    uniqueClicks: number;
    linkCount: number;
  }>;
  totalLinks: number;
  totalClicks: number;
  totalUniqueClicks: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

type HeatmapResponse = {
  dates: string[];
  byMedium: Array<{ medium_name: string; medium_code: string; totals: number; byDate: Record<string, number> }>;
  bySource: Array<{ source_name: string; source_code: string; totals: number; byDate: Record<string, number> }>;
  timeOfDay?: { hours: number[]; rows: Array<{ hour: number; totals: number; byDate: Record<string, number> }> };
};

export default function UTMAnalytics({ formType, selectedFormId }: UTMAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ links: UTMLink[]; insights: UTMInsights; heatmaps?: HeatmapResponse; emtTopLinks?: Array<{ id: number; utm_name: string; entity_name: string; campaign_name: string; source_name: string; medium_name: string; clicks: number }> } | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [preset, setPreset] = useState<DatePreset>('custom');
  // Admin-only entity filter
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entities, setEntities] = useState<Array<{ entity_id: number; name: string }>>([]);
  // Pagination state (must be declared before any conditional returns)
  const [page, setPage] = useState(1);
  // Search state for custom_name
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'overview' | 'user_performance'>('overview');

  // Load entities for admin filter
  const loadEntities = async () => {
    try {
      const response = await fetch('/api/entities', { cache: 'no-store' });
      const result = await response.json();
      if (result?.success) {
        setEntities(Array.isArray(result.items) ? result.items : []);
      }
    } catch {}
  };

  useEffect(() => {
    // fetch role to know if admin
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const json = await res.json();
        setIsAdmin(json?.user?.role === 'admin');
      } catch {}
    })();
  }, []);

  useEffect(() => {
    loadEntities();
  }, [isAdmin]);

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate, selectedFormId, selectedEntity, isAdmin, activeTab]);

  



  const loadAnalytics = async () => {
    setLoading(true);
    // Clear previous data to avoid showing stale charts/metrics
    setData(null);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      
      if (selectedFormId) {
        params.append('form_id', selectedFormId.toString());
      } else if (formType) {
        // If no specific form selected, filter by form type (oGV/TMR/EWA)
        params.append('form_type', formType);
      }
      // Filter by entity for User Performance, and for Overview when admin
      if ((activeTab === 'user_performance' || (activeTab === 'overview' && isAdmin)) && selectedEntity) {
        params.append('entity_id', selectedEntity);
      }

      let endpoint = '/api/utm/analytics';
      // Use analytics2 which supports all_entities for non-admin in User Performance
      if (activeTab === 'user_performance') {
        endpoint = '/api/utm/analytics2';
        if (!selectedEntity) params.append('all_entities', 'true');
      }
      const response = await fetch(`${endpoint}?${params.toString()}`, { cache: 'no-store' });
      const result = await response.json();
      
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading UTM analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No UTM analytics data available</p>
      </div>
    );
  }

  const { links, insights } = data;
  const heatmaps: HeatmapResponse | undefined = (data as any).heatmaps;
  const emtTopLinks = (data as any).emtTopLinks as Array<any> | undefined;

  // Prepare chart data (union of all normalized dates across links). Normalize to YYYY-MM-DD to avoid duplicate labels.
  const normalizeDate = (v: string): string => {
    if (!v) return v;
    if (v.includes('T')) return new Date(v).toISOString().slice(0, 10);
    return v.slice(0, 10);
  };

  let dailyClicksData: Array<{ date: string; clicks: number; unique: number }> = [];
  if (links.length > 0) {
    // Build per-link maps with normalized dates
    const perLink = links.map((l) => {
      const rows = (l.clicksByDate || []).map((d) => ({ date: normalizeDate(d.date), clicks: d.clicks, unique: (d as any).unique as number | undefined }));
      const totalClicks = rows.reduce((s, r) => s + r.clicks, 0) || 1;
      return { rows, totalClicks, uniqueTotal: l.uniqueClicks || 0 };
    });

    // Build full date range to avoid missing the last day when total=0 on some links
    const rangeDates: string[] = (() => {
      const out: string[] = [];
      const start = new Date(startDate + 'T00:00:00Z');
      const end = new Date(endDate + 'T00:00:00Z');
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        out.push(d.toISOString().slice(0, 10));
      }
      return out;
    })();

    dailyClicksData = rangeDates.map((dStr) => {
      let clicks = 0;
      let unique = 0;
      perLink.forEach((p) => {
        const row = p.rows.find((r) => r.date === dStr);
        if (row) {
          clicks += row.clicks || 0;
          // Prefer provided unique; otherwise estimate proportionally from link's unique total
          if (typeof row.unique === 'number') {
            unique += row.unique;
          } else if (p.uniqueTotal > 0 && p.totalClicks > 0) {
            unique += Math.round((row.clicks / p.totalClicks) * p.uniqueTotal);
          }
        }
      });
      return { date: dStr, clicks, unique };
    });
  }

  // Filter links based on search term
  const filteredLinks = links.filter(link => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (link.custom_name && link.custom_name.toLowerCase().includes(searchLower)) ||
      (link.utm_name && link.utm_name.toLowerCase().includes(searchLower))
    );
  });

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLinks = filteredLinks.slice(startIndex, startIndex + pageSize);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <DateFilter
          preset={preset}
          setPreset={setPreset}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onApply={loadAnalytics}
          showFullSubmissions={false}
          showApplyButton={false}
          className="gap-4"
        />

        {/* Entity filter: always for admin in Overview; and User Performance for all */}
        {((isAdmin && activeTab === 'overview') || activeTab === 'user_performance') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Entity
          </label>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
          >
            <option value="">All Entities</option>
            {entities
              .filter((e) => isAdmin ? true : (e.name || '').toLowerCase() !== 'organic')
              .map((entity) => (
                <option key={entity.entity_id} value={entity.entity_id}>
                  {entity.name}
                </option>
              ))}
          </select>
        </div>
        )}

        <button
          onClick={() => {
            loadAnalytics();
          }}
          className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <button onClick={()=>setActiveTab('overview')} className={`h-9 px-3 rounded-md text-sm ${activeTab==='overview' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>Overview</button>
        <button onClick={()=>setActiveTab('user_performance')} className={`h-9 px-3 rounded-md text-sm ${activeTab==='user_performance' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>User Performance</button>
      </div>

      {activeTab === 'overview' && (
        <>
      {/* Overview Stats - UTM Clicks Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">UTM Click Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Clicks</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{insights?.totalClicks ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Unique Clicks</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{insights?.totalUniqueClicks ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Click Rate</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {insights && insights.totalClicks > 0 ? ((insights.totalUniqueClicks / insights.totalClicks) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Daily Clicks Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Daily Clicks</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyClicksData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(v) => new Date(v + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
            <YAxis />
            <Tooltip labelFormatter={(v) => new Date(String(v) + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
            <Legend />
            <Line type="monotone" dataKey="clicks" stroke="#0088FE" strokeWidth={2} />
            <Line type="monotone" dataKey="unique" stroke="#00C49F" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Click Heatmaps by Medium and Source */}
      {heatmaps && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Medium Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Daily Clicks by Medium</h3>
            <HeatmapTable
              rows={heatmaps.byMedium.map(r => ({ label: r.medium_name || r.medium_code, code: r.medium_code, totals: r.totals, byDate: r.byDate }))}
              dates={heatmaps.dates}
            />
          </div>

          {/* Source Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Daily Clicks by Source</h3>
            <HeatmapTable
              rows={heatmaps.bySource.map(r => ({ label: r.source_name || r.source_code, code: r.source_code, totals: r.totals, byDate: r.byDate }))}
              dates={heatmaps.dates}
            />
          </div>
        </div>
      )}

      {/* Time-of-Day Heatmap */}
      {heatmaps?.timeOfDay && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Clicks by Hour of Day</h3>
          <TimeOfDayHeatmap rows={heatmaps.timeOfDay.rows} dates={heatmaps.dates} />
        </div>
      )}

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Medium Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Medium Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={(insights?.mediumPerformance || []).slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="medium_code" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalClicks" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Source Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={(insights?.sourcePerformance || []).slice(0, 5)}
                dataKey="totalClicks"
                nameKey="source_name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {(insights?.sourcePerformance || []).slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Campaign Performance</h3>
          <div className="space-y-3">
            {(insights?.campaignPerformance || []).slice(0, 5).map((campaign, index) => (
              <div key={campaign.campaign_code} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {campaign.campaign_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {campaign.linkCount} links
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {campaign.totalClicks}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {campaign.uniqueClicks} unique
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EMT National Top 5 (visible to all) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 lg:col-span-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top 5 EMT National UTM Links</h3>
          {emtTopLinks && emtTopLinks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">UTM Name</th>
                    <th className="px-4 py-3 text-left">Campaign</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Medium</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {emtTopLinks.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.utm_name || 'Unnamed'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{row.campaign_name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{row.source_name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{row.medium_name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{row.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No national EMT data in selected period.</p>
          )}
        </div>
      </div>

      {/* Detailed Links Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">UTM Links Performance Analytics</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Comprehensive tracking and effectiveness analysis</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1); // Reset to first page when searching
                  }}
                  placeholder="Search custom name or UTM name..."
                  className="w-64 px-3 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">UTM Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Custom Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Campaign/Source/Medium</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Tracking Short URL</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Total Clicks</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Unique Clicks</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Conversion Rate</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Effectiveness</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Trend</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Peak Day</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Avg Daily</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedLinks.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                      {link.utm_name || 'Unnamed Link'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(link.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {link.custom_name || (
                        <span className="text-gray-400 italic">No custom name</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{link.campaign_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {link.source_name} • {link.medium_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {link.tracking_short_url ? (
                        <a href={link.tracking_short_url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline break-all">
                          {link.tracking_short_url}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {link.clicks || 0}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {link.uniqueClicks || 0}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {link.conversionRate || 0}%
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className={`text-xs font-medium px-2 py-1 rounded-full ${getEffectivenessColor(link.effectivenessScore || 0)}`}>
                        {link.effectivenessScore || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center">
                      {getTrendIcon(link.trendDirection || 'stable')}
                      <span className={`text-xs ml-1 ${getTrendColor(link.trendDirection || 'stable')}`}>
                        {link.trendDirection || 'stable'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {link.peakDay ? new Date(link.peakDay).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {link.avgDailyClicks || 0}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Showing {filteredLinks.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, filteredLinks.length)} of {filteredLinks.length}
            {searchTerm && links.length !== filteredLinks.length && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                (filtered from {links.length} total)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} disabled={currentPage === 1} className="h-9 px-3 rounded-md bg-gray-100 dark:bg-gray-700 disabled:opacity-50 text-sm">Previous</button>
            <span className="text-sm text-gray-700 dark:text-gray-200">Page {currentPage} / {totalPages}</span>
            <button onClick={goNext} disabled={currentPage === totalPages} className="h-9 px-3 rounded-md bg-gray-100 dark:bg-gray-700 disabled:opacity-50 text-sm">Next</button>
          </div>
        </div>
        
        {/* Performance Legend */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Performance Metrics Guide:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-300">
            <div>
              <strong className="text-gray-900 dark:text-white">Conversion Rate:</strong> Unique clicks / Total clicks ratio (higher is better)
            </div>
            <div>
              <strong className="text-gray-900 dark:text-white">Effectiveness Score:</strong> Combined metric (0-100) based on volume, uniqueness & consistency
            </div>
            <div>
              <strong className="text-gray-900 dark:text-white">Trend Direction:</strong> Click pattern over the selected period (↗ up, ↘ down, → stable)
            </div>
            <div>
              <strong className="text-gray-900 dark:text-white">Peak Day:</strong> Date with highest click count for this UTM link
            </div>
          </div>
          
          {/* Effectiveness Score Legend */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-4 text-xs">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Effectiveness Levels:</span>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">0-30 Poor</span>
                <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">31-60 Fair</span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">61-80 Good</span>
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">81-100 Excellent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'user_performance' && (
        <UserPerformanceTable
          links={(links || []).filter((l:any) => {
            // Non-admins can view all except Organic
            if (!isAdmin && String(l.entity_name || '').toLowerCase() === 'organic') return false;
            // If an entity is selected, enforce it client-side as well
            if (selectedEntity) {
              const id = Number(selectedEntity);
              if (!isNaN(id) && Number((l as any).entity_id) !== id) return false;
            }
            return true;
          })}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      
    </div>
  );
}

// Helper functions for enhanced display
function getEffectivenessColor(score: number): string {
  if (score >= 81) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (score >= 61) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  if (score >= 31) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}

function getTrendIcon(trend: string): React.ReactNode {
  switch (trend) {
    case 'up':
      return <span className="text-green-500">↗</span>;
    case 'down':
      return <span className="text-red-500">↘</span>;
    default:
      return <span className="text-gray-500">→</span>;
  }
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'up':
      return 'text-green-600 dark:text-green-400';
    case 'down':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

// User Performance Table: frozen columns (utm, campaign, medium, source), dynamic date columns with clicks/new (unique)
function UserPerformanceTable({ links, startDate, endDate }: { links: UTMLink[]; startDate: string; endDate: string }) {
  const [sortDate, setSortDate] = useState<string | null>(null);
  const [sortMetric, setSortMetric] = useState<'total' | 'new'>('total');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [anchorDate, setAnchorDate] = useState<string | null>(null);
  const [showPercent, setShowPercent] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Normalize dates across all links
  const normalizeDate = (v: string): string => {
    if (!v) return v as any;
    if (v.includes('T')) return new Date(v).toISOString().slice(0,10);
    return v.slice(0,10);
  };
  const perLink = links.map(l => ({
    link: l,
    rows: (l.clicksByDate || []).map(d => ({ date: normalizeDate(d.date), clicks: d.clicks, unique: (d as any).unique as number | undefined }))
  }));
  // Build a full date range from startDate to endDate to ensure all days show, even with zero clicks
  const daysBetween = (s: string, e: string): string[] => {
    const out: string[] = [];
    const start = new Date(s + 'T00:00:00Z');
    const end = new Date(e + 'T00:00:00Z');
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      out.push(d.toISOString().slice(0,10));
    }
    return out;
  };
  const allDates = daysBetween(startDate, endDate);
  // Precompute total clicks per day across all links (for percentage share)
  const dayTotalClicks: Record<string, number> = {};
  allDates.forEach(d => { dayTotalClicks[d] = 0; });
  perLink.forEach(({ rows }) => rows.forEach(r => { dayTotalClicks[r.date] = (dayTotalClicks[r.date] || 0) + (r.clicks || 0); }));

  // Auto-set latest day as default sort and scroll to right
  useEffect(() => {
    if (allDates.length && !sortDate) {
      setSortDate(allDates[allDates.length - 1]);
      setAnchorDate(allDates[allDates.length - 1]);
    }
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [allDates, sortDate]);

  // Sort logic when a date is selected
  const activeDates = selectedDates.length ? selectedDates : (sortDate ? [sortDate] : []);
  let sortedPerLink = perLink;
  if (activeDates.length) {
    sortedPerLink = [...perLink].sort((a, b) => {
      const sum = (rows: { date: string; clicks: number; unique?: number }[]) => {
        let total = 0; let nu = 0; let hasNew = false;
        activeDates.forEach(d => {
          const v = rows.find(r => r.date === d);
          total += v?.clicks || 0;
          if (typeof v?.unique === 'number') { nu += v!.unique!; hasNew = true; }
        });
        return { total, nu: hasNew ? nu : -1 };
      };
      const aAgg = sum(a.rows);
      const bAgg = sum(b.rows);
      if (sortMetric === 'total') {
        if (bAgg.total !== aAgg.total) return bAgg.total - aAgg.total;
        return bAgg.nu - aAgg.nu;
      } else {
        if (bAgg.nu !== aAgg.nu) return bAgg.nu - aAgg.nu;
        return bAgg.total - aAgg.total;
      }
    });
  }

  // Apply non-zero filter if enabled
  let visiblePerLink = sortedPerLink;
  // Note: onlyNonZero may come from state defined earlier
  // @ts-ignore
  if (typeof onlyNonZero !== 'undefined' && onlyNonZero && activeDates.length) {
    // @ts-ignore
    visiblePerLink = sortedPerLink.filter(item =>
      activeDates.some(d => (item.rows.find(r => r.date === d)?.clicks || 0) > 0)
    );
  }

  // Precompute per-date max for heatmap background
  const perDateMax: Record<string, number> = {};
  allDates.forEach(d => {
    let max = 0;
    visiblePerLink.forEach(({ rows }) => {
      const v = rows.find(r => r.date === d);
      const clicks = v?.clicks || 0;
      if (clicks > max) max = clicks;
    });
    perDateMax[d] = Math.max(1, max);
  });

  const bgFor = (d: string, clicks: number, share: number | undefined) => {
    const ratio = showPercent ? Math.min(1, (share || 0) / 100) : Math.min(1, clicks / (perDateMax[d] || 1));
    const alpha = ratio === 0 ? 0 : 0.12 + 0.68 * ratio; // softer scale for readability
    return { backgroundColor: `rgba(59, 130, 246, ${alpha.toFixed(3)})` }; // blue tone
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-md font-medium text-gray-900 dark:text-white">User Performance by UTM Link</h3>
      </div>
      <div ref={scrollRef} className="overflow-x-auto w-full pb-1">
        <table className="min-w-max text-xs md:text-sm border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left w-[200px] min-w-[200px]">UTM</th>
              <th className="sticky left-[200px] z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left w-[180px] min-w-[180px]">Campaign</th>
              <th className="sticky left-[380px] z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left w-[140px] min-w-[140px]">Medium</th>
              <th className="sticky left-[520px] z-10 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left w-[160px] min-w-[160px]">Source</th>
              {allDates.map(d => (
                <th key={d} className="px-2 py-2 text-center whitespace-nowrap cursor-pointer select-none"
                    onClick={(e) => {
                      const isShift = (e as any).shiftKey;
                      const isCtrl = (e as any).ctrlKey || (e as any).metaKey;
                      if (isShift && anchorDate) {
                        const a = allDates.indexOf(anchorDate);
                        const b = allDates.indexOf(d);
                        if (a >= 0 && b >= 0) {
                          const [s, eidx] = a < b ? [a, b] : [b, a];
                          const range = allDates.slice(s, eidx + 1);
                          setSelectedDates(range);
                          setSortDate(d);
                          return;
                        }
                      }
                      if (isCtrl) {
                        setSelectedDates(prev => {
                          const exists = prev.includes(d);
                          const next = exists ? prev.filter(x => x !== d) : [...prev, d];
                          setSortDate(d);
                          setAnchorDate(d);
                          return next;
                        });
                        return;
                      }
                      setSelectedDates([d]);
                      setSortDate(d);
                      setAnchorDate(d);
                      setSortMetric(prev => (sortDate === d ? (prev === 'total' ? 'new' : 'total') : 'total'));
                    }}
                >
                  <div className={`text-[11px] inline-flex items-center gap-1 ${selectedDates.includes(d) ? 'text-sky-700 dark:text-sky-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {new Date(d).toLocaleDateString(undefined,{month:'short', day:'numeric'})}
                    {sortDate === d && (
                      <span className="text-[10px] text-sky-600">{sortMetric==='total' ? '↓ total' : '↓ new'}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-600">{showPercent ? 'share | new%' : 'total | new'}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Totals row across all UTMs for selected dates */}
            {activeDates.length > 0 && (
              <tr className="border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40">
                <td className="sticky left-0 bg-gray-50 dark:bg-gray-700/40 px-3 py-2 font-semibold" colSpan={4}>TOTALS</td>
                {allDates.map(d => {
                  const sum = sortedPerLink.reduce((acc, { rows }) => {
                    const v = rows.find(r => r.date === d);
                    if (activeDates.includes(d)) {
                      acc.total += v?.clicks || 0;
                      if (typeof v?.unique === 'number') acc.new += v!.unique!;
                    }
                    return acc;
                  }, { total: 0, new: 0 });
                  return (
                    <td key={`total-${d}`} className="px-2 py-1 text-center">
                      <div className="text-[12px] font-semibold">{sum.total}</div>
                      <div className="text-[10px] text-gray-600">{sum.new}</div>
                    </td>
                  );
                })}
              </tr>
            )}
            {visiblePerLink.map(({ link, rows }) => {
              const byDate: Record<string, { clicks: number; unique?: number }> = {};
              rows.forEach(r => { byDate[r.date] = { clicks: r.clicks, unique: r.unique }; });
              return (
                <tr key={link.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="sticky left-0 z-0 bg-white dark:bg-gray-800 px-3 py-2 w-[200px] min-w-[200px] truncate" title={link.utm_name}>{link.utm_name || 'Unnamed'}</td>
                  <td className="sticky left-[200px] z-0 bg-white dark:bg-gray-800 px-3 py-2 w-[180px] min-w-[180px] truncate" title={link.campaign_name}>{link.campaign_name}</td>
                  <td className="sticky left-[380px] z-0 bg-white dark:bg-gray-800 px-3 py-2 w-[140px] min-w-[140px] truncate" title={link.medium_name}>{link.medium_name}</td>
                  <td className="sticky left-[520px] z-0 bg-white dark:bg-gray-800 px-3 py-2 w-[160px] min-w-[160px] truncate" title={link.source_name}>{link.source_name}</td>
                  {allDates.map(d => {
                    const v = byDate[d];
                    const clicks = v?.clicks || 0;
                    const unique = typeof v?.unique === 'number' ? v!.unique! : undefined;
                    const totalDay = dayTotalClicks[d] || 0;
                    const share = totalDay > 0 ? (clicks / totalDay) * 100 : 0;
                    const newShare = totalDay > 0 && typeof unique === 'number' ? (unique / totalDay) * 100 : undefined;
                    return (
                      <td key={`${link.id}-${d}`} className="px-2 py-1 text-center" style={bgFor(d, clicks, share)}>
                        <div className="text-[12px] font-medium text-gray-900 dark:text-white">{showPercent ? `${share.toFixed(1)}%` : clicks}</div>
                        {!compactMode && (
                          <div className="text-[10px] text-gray-500">{showPercent ? (newShare != null ? `${newShare.toFixed(1)}%` : '—') : (unique ?? '—')}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs">
        <span className="text-gray-600 dark:text-gray-300">Sorted by: {activeDates.length ? `${activeDates.length} day(s)` : (sortDate || '—')} • {sortMetric}</span>
        <button onClick={() => { setSelectedDates([]); setSortDate(allDates[allDates.length-1] || null); setSortMetric('total'); }} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Reset</button>
        <button onClick={() => { const last = allDates.slice(-7); setSelectedDates(last); setSortDate(last[last.length-1]||null); setAnchorDate(last[last.length-1]||null); }} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Last 7</button>
        <button onClick={() => { const last = allDates.slice(-14); setSelectedDates(last); setSortDate(last[last.length-1]||null); setAnchorDate(last[last.length-1]||null); }} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Last 14</button>
        <button onClick={() => { const last = allDates.slice(-30); setSelectedDates(last); setSortDate(last[last.length-1]||null); setAnchorDate(last[last.length-1]||null); }} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">Last 30</button>
        <label className="ml-2 inline-flex items-center gap-2"><input type="checkbox" checked={showPercent} onChange={(e)=>setShowPercent(e.target.checked)} /> <span>Show % share</span></label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={compactMode} onChange={(e)=>setCompactMode(e.target.checked)} /> <span>Compact (hide new)</span></label>
        <button onClick={() => exportCsv(sortedPerLink, allDates)} className="ml-auto px-2 py-1 rounded bg-sky-600 text-white">Export CSV</button>
      </div>
    </div>
  );
}

function exportCsv(rows: Array<{ link: UTMLink; rows: Array<{ date: string; clicks: number; unique?: number }> }>, dates: string[]) {
  const headers = ['utm_name','campaign','medium','source', ...dates.flatMap(d => [`${d}_total`, `${d}_new`])];
  const lines = [headers.join(',')];
  rows.forEach(r => {
    const map: Record<string,{ clicks:number; unique?:number}> = {};
    r.rows.forEach(x => { map[x.date] = { clicks: x.clicks, unique: x.unique }; });
    const row = [
      escapeCsv(r.link.utm_name || ''),
      escapeCsv(r.link.campaign_name || ''),
      escapeCsv(r.link.medium_name || ''),
      escapeCsv(r.link.source_name || '')
    ];
    dates.forEach(d => { row.push(String(map[d]?.clicks || 0), String(typeof map[d]?.unique === 'number' ? map[d]!.unique! : '')); });
    lines.push(row.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `utm_user_performance_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(v: string) {
  if (v == null) return '';
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

// Generic heatmap table used for Medium/Source daily click matrices
function HeatmapTable({
  rows,
  dates
}: {
  rows: Array<{ label: string; code: string; totals: number; byDate: Record<string, number> }>;
  dates: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Determine global max for color scaling
  const maxVal = Math.max(
    1,
    ...rows.flatMap(r => dates.map(d => r.byDate[d] || 0))
  );

  const bgFor = (value: number) => {
    const ratio = Math.min(1, value / maxVal);
    const alpha = ratio === 0 ? 0 : 0.15 + 0.75 * ratio; // keep low values visible
    return { backgroundColor: `rgba(16, 185, 129, ${alpha.toFixed(3)})` }; // emerald-500-ish
  };

  // Auto-scroll to the right when component mounts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [dates]);

  return (
    <div ref={scrollRef} className="overflow-x-auto heatmap-scroll-container">
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-left font-semibold">{`TYPE`}</th>
            {dates.map(d => (
              <th key={d} className="px-2 py-2 text-center text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-semibold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.code} className="border-t border-gray-200 dark:border-gray-700">
              <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 font-medium">{r.label}</td>
              {dates.map(date => {
                const v = r.byDate[date] || 0;
                return (
                  <td key={`${r.code}-${date}`} className="text-center px-2 py-1" style={bgFor(v)}>
                    {v}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-semibold">{r.totals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimeOfDayHeatmap({
  rows,
  dates
}: {
  rows: Array<{ hour: number; totals: number; byDate: Record<string, number> }>;
  dates: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const maxVal = Math.max(1, ...rows.flatMap(r => dates.map(d => r.byDate[d] || 0)));
  const bgFor = (v: number) => {
    const ratio = Math.min(1, v / maxVal);
    const alpha = ratio === 0 ? 0 : 0.12 + 0.78 * ratio;
    return { backgroundColor: `rgba(59, 130, 246, ${alpha.toFixed(3)})` }; // blue scale
  };
  const fmtHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  // Auto-scroll to the right when component mounts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [dates]);

  return (
    <div ref={scrollRef} className="overflow-x-auto time-heatmap-scroll-container">
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-left font-semibold">HOUR</th>
            {dates.map(d => (
              <th key={d} className="px-2 py-2 text-center text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-semibold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.hour} className="border-t border-gray-200 dark:border-gray-700">
              <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 font-medium">{fmtHour(r.hour)}</td>
              {dates.map(date => {
                const v = r.byDate[date] || 0;
                return (
                  <td key={`${r.hour}-${date}`} className="text-center px-2 py-1" style={bgFor(v)}>
                    {v}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-semibold">{r.totals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
