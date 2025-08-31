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
};

export default function OGVHubDashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [stats, setStats] = useState<OGVStats | null>(null);
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
      const response = await fetch('/api/dashboard/ogv-forms');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setForms(result.data);
          // Select the newest form by default
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            oGV Hub Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your global volunteer programs and track engagement across all initiatives
          </p>
        </div>

        {/* Form Filter */}
        <div className="mb-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <SettingsIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter Form:</span>
              </div>
              <select
                value={selectedFormId || ''}
                onChange={(e) => setSelectedFormId(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              >
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name} ({form.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Submissions */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Submissions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loadingStats ? "Loading..." : stats ? formatNumber(stats.entityStats.reduce((sum, entity) => sum + entity.sus, 0)) : "0"}
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
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Progress</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loadingStats ? "Loading..." : stats ? formatPercentage(stats.entityStats.reduce((sum, entity) => sum + entity.progress, 0) / Math.max(stats.entityStats.length, 1)) : "0.0%"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Across all entities
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <TrendingUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Signup Summary */}
        <div className="mb-8">
          <SignupSummary formId={selectedFormId} />
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
