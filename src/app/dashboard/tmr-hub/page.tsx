"use client";
import { useEffect, useState } from "react";
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
  other_source: number;
  progress: number;
  msu_percentage: number;
  msu_utm_percentage: number;
};

type TMRStats = {
  form: {
    id: number;
    name: string;
    code: string;
  };
  entityStats: EntityStats[];
  totalDeduplicatedSubmissions: number;
};

export default function TMRHubDashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [stats, setStats] = useState<TMRStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    if (selectedFormId) {
      loadStats(selectedFormId);
    }
  }, [selectedFormId]);

  const loadForms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/tmr-forms');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setForms(result.data);
          if (result.data.length > 0) {
            setSelectedFormId(result.data[0].id);
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
      const response = await fetch(`/api/dashboard/ogv-stats?formId=${formId}`);
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

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <LoadingOverlay isVisible={loading} message="Loading dashboard..." showProgress={true} />
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Image src="/tmr.webp" alt="TMR Hub Logo" width={150} height={32} />
              </div>
              <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                <span>Dashboard</span>
                <span>•</span>
                <span>TMR Management</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            TMR Hub Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor TMR programs and track engagement
          </p>
        </div>

        <div className="mb-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <SettingsIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phase:</span>
              </div>
              <select
                value={selectedFormId || ''}
                onChange={(e) => setSelectedFormId(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              >
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Submissions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loadingStats ? "Loading..." : stats ? formatNumber(stats.totalDeduplicatedSubmissions || 0) : "0"}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Progress</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loadingStats ? "Loading..." : stats ? `${(stats.entityStats.reduce((sum, entity) => sum + entity.progress, 0) / Math.max(stats.entityStats.length, 1)).toFixed(1)}%` : "0.0%"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <TrendingUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/dashboard/utm-generator?type=TMR"
                className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">UTM Generator</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Create tracking links for TMR campaigns</p>
                </div>
              </a>
              
              <a
                href="/dashboard/tmr/data"
                className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-800/50 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">Data Management</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">Manage and clean TMR data</p>
                </div>
              </a>
              
              <a
                href="/dashboard/utm-manage"
                className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800/50 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-purple-900 dark:text-purple-100">UTM Management</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">View and manage all UTM links</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <SignupSummary formId={selectedFormId} />
        </div>
      </div>
    </div>
  );
}


