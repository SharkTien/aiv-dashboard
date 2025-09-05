"use client";

import { useState, useEffect } from "react";

interface Form {
  id: number;
  name: string;
  code: string;
}

interface AnalyticsData {
  totalSignUps: number;
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
}

export default function AnalyticsPage() {
  const [selectedForm, setSelectedForm] = useState<number | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    if (selectedForm) {
      loadAnalyticsData();
    }
  }, [selectedForm]);

  const loadForms = async () => {
    try {
      const response = await fetch('/api/dashboard/ogv-forms');
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

  const loadAnalyticsData = async () => {
    if (!selectedForm) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/ogv-analytics?formId=${selectedForm}`);
      const result = await response.json();
      
      if (result.success) {
        setAnalyticsData(result.data);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedFormName = forms.find(f => f.id === selectedForm)?.name || '';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">oGV Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive analytics and insights for oGV campaigns</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Form
            </label>
            <select
              value={selectedForm || ''}
              onChange={(e) => setSelectedForm(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a form...</option>
              {forms.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.name} ({form.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {analyticsData && !loading && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sign Ups</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.totalSignUps.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total submissions excluding duplicates
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Channels</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.channelBreakdown.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Number of locals with sign ups
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">UTM Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.utmBreakdown.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Number of active UTM campaigns
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Sign Ups Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Daily Sign Ups by Local ({selectedFormName})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Daily sign ups by local for all submissions. Green cells indicate days with sign ups.
              </p>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto thin-scrollbar">
              <DailySignUpsTable data={analyticsData.dailySignUps} />
            </div>
          </div>

          {/* Channel Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Channel Breakdown
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sign ups analysis by local/channel. Blue bars show percentage distribution for each channel.
              </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <PieChart data={analyticsData.uniDistribution} />
              </div>
              <div>
                <UniversityList data={analyticsData.uniDistribution} />
              </div>
            </div>
          </div>
        </div>
      )}
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

  return (
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
              <td key={dateIndex} className={`px-2 py-3 text-center text-sm ${
                signUps > 0 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
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
            {item.percentage.toFixed(1)}%
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
          {data.slice(0, 10).map((item, index) => (
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
    <div className="h-96 flex items-center justify-center">
      <svg width="300" height="300" className="transform -rotate-90">
        <circle
          cx="150"
          cy="150"
          r="120"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="2"
          className="dark:stroke-gray-600"
        />
        {data.map((item, index) => {
          const percentage = item.percentage;
          const strokeDasharray = `${(percentage / 100) * 754} 754`;
          const strokeDashoffset = -cumulativePercentage * 7.54;
          cumulativePercentage += percentage;

          return (
            <circle
              key={item.uni_name}
              cx="150"
              cy="150"
              r="120"
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth="24"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 hover:stroke-width-32"
            />
          );
        })}
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {data.reduce((sum, item) => sum + item.signUps, 0).toLocaleString()}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Sign Ups</div>
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
        <div key={item.uni_name} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div 
            className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
            style={{ backgroundColor: colors[index % colors.length] }}
          ></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.uni_name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {item.percentage.toFixed(1)}% • {item.signUps.toLocaleString()} sign ups
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}