"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ChartIcon as ChartBarIcon, 
  TrendingUpIcon,
  SettingsIcon
} from "@/components/icons";
import LoadingOverlay from "@/components/LoadingOverlay";
import SignupSummary from "@/components/SignupSummary";

type Form = {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type EntityStats = {
  entity_id: number;
  entity_name: string;
  goal: number;
  sus: number;
  msus: number;
  sus_utm_source: number;
  emt_plus_organic: number;
  progress: number;
  msu_percentage: number;
  msu_utm_percentage: number;
};

type OGVStats = {
  form: {
    id: number;
    name: string;
    code: string;
  };
  entityStats: EntityStats[];
  totalDeduplicatedSubmissions: number;
};

export default function OGVHubDashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [stats, setStats] = useState<OGVStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [preset, setPreset] = useState<'full_submissions' | 'this_week' | 'last_week' | 'last_7_days' | 'custom'>('full_submissions');

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    if (selectedFormId) {
      loadStats(selectedFormId);
    }
  }, [selectedFormId, startDate, endDate, preset]);

  const loadForms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/ogv-forms');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setForms(result.data);
          // Select the default form if available, otherwise the first form
          if (result.data.length > 0) {
            const defaultForm = result.data.find((form: Form) => form.is_default);
            setSelectedFormId(defaultForm ? defaultForm.id : result.data[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (formId: number) => {
    try {
      setLoadingStats(true);
      const params = new URLSearchParams({ formId: String(formId) });
      // Only add date filters if not using full_submissions preset
      if (preset !== 'full_submissions' && startDate && endDate) {
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      }
      const response = await fetch(`/api/dashboard/ogv-stats?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    const setWeekRange = (offsetWeeks: number) => {
      const now = new Date();
      const day = now.getDay();
      const mondayOffset = ((day + 6) % 7);
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset - 7 * offsetWeeks);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(sunday.toISOString().split('T')[0]);
    };
    if (preset === 'this_week') setWeekRange(0);
    else if (preset === 'last_week') setWeekRange(1);
    else if (preset === 'last_7_days') {
      const d = new Date();
      const s = new Date();
      s.setDate(d.getDate() - 6);
      setStartDate(s.toISOString().split('T')[0]);
      setEndDate(d.toISOString().split('T')[0]);
    }
  }, [preset]);

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <LoadingOverlay isVisible={loading} message="Loading dashboard..." showProgress={true} />
      
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Image src="/gv.png" alt="oGV Hub Logo" width={150} height={32} />
              </div>
              <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                <span>Dashboard</span>
                <span>•</span>
                <span>Global Volunteer Management</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"> 
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Submissions */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Submissions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loadingStats ? "Loading..." : stats ? formatNumber(stats.totalDeduplicatedSubmissions || 0) : "0"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedFormId ? (forms.find(f => f.id === selectedFormId)?.name || "Loading...") : "No form selected"}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Average Progress */}
          {/* <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
            
          </div> */}
        </div>

        
        
        {/* Form + Date Filters */}
        <div className="mb-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex flex-wrap items-end gap-4">              
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Selected Phase</label>
                <select
                value={selectedFormId || ''}
                onChange={(e) => setSelectedFormId(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              >
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name.replace("oGV ", "").replace("Submissions", "")}
                  </option>
                ))}
              </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Preset</label>
                <select value={preset} onChange={(e) => setPreset(e.target.value as any)} className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="full_submissions">All of this phase</option>
                  <option value="this_week">This week (Mon-Sun)</option>
                  <option value="last_week">Last week</option>
                  <option value="last_7_days">Last 7 days</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Start date</label>
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); }} disabled={preset === 'full_submissions'} className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">End date</label>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); }} disabled={preset === 'full_submissions'} className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <button onClick={() => selectedFormId && loadStats(selectedFormId)} className="h-10 px-4 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm">Apply</button>
            </div>
          </div>
        </div>
        
        {/* Signup Summary */}
        <div className="mb-8">
          <SignupSummary formId={selectedFormId} formType="oGV" startDate={startDate} endDate={endDate} />
        </div>

        {/* No Form Selected */}
        {!selectedFormId && !loading && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <p className="text-gray-600 dark:text-gray-400">Please select a form to view statistics</p>
          </div>
        )}
      </div>
    </div>
  );
}
