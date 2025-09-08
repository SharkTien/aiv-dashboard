"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

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
  clicks: number;
  uniqueClicks: number;
  clicksByDate: Array<{ date: string; clicks: number }>;
  shortened_url: string;
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
  averageClicksPerLink: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function UTMAnalytics({ formType, selectedFormId }: UTMAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ links: UTMLink[]; insights: UTMInsights } | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entities, setEntities] = useState<Array<{ entity_id: number; name: string }>>([]);

  useEffect(() => {
    loadEntities();
    loadAnalytics();
  }, [startDate, endDate, selectedEntity, selectedFormId]);

  const loadEntities = async () => {
    try {
      const response = await fetch('/api/entities');
      const result = await response.json();
      if (result.success) {
        setEntities(result.items || []);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  };


  const loadAnalytics = async () => {
    setLoading(true);
    // Clear previous data to avoid showing stale charts/metrics
    setData(null);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      
      if (selectedEntity) {
        params.append('entity_id', selectedEntity);
      }
      
      if (selectedFormId) {
        params.append('form_id', selectedFormId.toString());
      } else if (formType) {
        // If no specific form selected, filter by form type (oGV/TMR/EWA)
        params.append('form_type', formType);
      }

      const response = await fetch(`/api/utm/analytics?${params.toString()}`, { cache: 'no-store' });
      const result = await response.json();
      
      // Debug form-specific analytics data
      if (selectedFormId) {
        console.log('Form-specific analytics result:', {
          selectedFormId,
          success: result.success,
          totalLinks: result.data?.links?.length || 0,
          totalClicks: result.data?.insights?.totalClicks || 0,
          params: params.toString()
        });
      }
      
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

  // Prepare chart data
  const dailyClicksData = links.length > 0 
    ? links[0].clicksByDate?.map(day => ({
        date: new Date(day.date).toLocaleDateString(),
        clicks: links.reduce((sum, link) => {
          const dayData = link.clicksByDate?.find(d => d.date === day.date);
          return sum + (dayData?.clicks || 0);
        }, 0)
      })) || []
    : [];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
          />
        </div>

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
            {entities.map((entity) => (
              <option key={entity.entity_id} value={entity.entity_id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
        

        <button
          onClick={loadAnalytics}
          className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Links</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{insights.totalLinks}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clicks</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{insights.totalClicks}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unique Clicks</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{insights.totalUniqueClicks}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Clicks/Link</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{insights.averageClicksPerLink}</p>
        </div>
      </div>

      {/* Daily Clicks Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Daily Clicks</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyClicksData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="clicks" stroke="#0088FE" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Medium Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Medium Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={insights.mediumPerformance.slice(0, 5)}>
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
                data={insights.sourcePerformance.slice(0, 5)}
                dataKey="totalClicks"
                nameKey="source_name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {insights.sourcePerformance.slice(0, 5).map((entry, index) => (
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
            {insights.campaignPerformance.slice(0, 5).map((campaign, index) => (
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
      </div>

      {/* Detailed Links Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">UTM Links Performance Analytics</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Comprehensive tracking and effectiveness analysis</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">UTM Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Campaign/Source/Medium</th>
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
              {links.map((link) => (
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
                      <div className="font-medium">{link.campaign_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {link.source_name} • {link.medium_name}
                      </div>
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
