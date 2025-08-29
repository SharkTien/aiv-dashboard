"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ChartIcon as ChartBarIcon, 
  UsersIcon, 
  DocumentTextIcon, 
  TrendingUpIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LinkIcon
} from "@/components/icons";
import LoadingOverlay from "@/components/LoadingOverlay";

type DashboardStats = {
  totalSubmissions: number;
  totalForms: number;
  totalUsers: number;
  activeProjects: number;
  submissionsThisMonth: number;
  submissionsGrowth: number;
  formsGrowth: number;
  usersGrowth: number;
};

type RecentSubmission = {
  id: number;
  formName: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'error';
  user: string;
};

type TopForm = {
  id: number;
  name: string;
  submissions: number;
  growth: number;
  type: 'oGV' | 'TMR' | 'EWA';
};

export default function OGVHubDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSubmissions: 0,
    totalForms: 0,
    totalUsers: 0,
    activeProjects: 0,
    submissionsThisMonth: 0,
    submissionsGrowth: 12.5,
    formsGrowth: 8.2,
    usersGrowth: 15.7
  });
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [topForms, setTopForms] = useState<TopForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load recent submissions
      const submissionsResponse = await fetch('/api/dashboard/recent-submissions');
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setRecentSubmissions(submissionsData);
      }

      // Load top forms
      const formsResponse = await fetch('/api/dashboard/top-forms');
      if (formsResponse.ok) {
        const formsData = await formsResponse.json();
        setTopForms(formsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'oGV':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'TMR':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'EWA':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  <LoadingOverlay isVisible={loading} message="Loading dashboard data..." showProgress={true} />

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <ClockIcon className="w-5 h-5" />
              </button>
                             <Link
                 href="/dashboard/forms?type=oGV"
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
               >
                 Manage Forms
               </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back to oGV Hub
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your global volunteer programs and track engagement across all initiatives
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Submissions */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Submissions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSubmissions.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUpIcon className={`w-4 h-4 ${stats.submissionsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-sm font-medium ml-1 ${stats.submissionsGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.submissionsGrowth >= 0 ? '+' : ''}{stats.submissionsGrowth}%
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Forms */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Forms</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalForms}</p>
                <div className="flex items-center mt-2">
                  <TrendingUpIcon className={`w-4 h-4 ${stats.formsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-sm font-medium ml-1 ${stats.formsGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.formsGrowth >= 0 ? '+' : ''}{stats.formsGrowth}%
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Submissions */}
          <div className="lg:col-span-2">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                             <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Submissions</h3>
                 <Link
                   href="/dashboard/forms?type=oGV"
                   className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                 >
                   View all →
                 </Link>
               </div>
              <div className="space-y-4">
                {recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-600/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{submission.formName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{submission.user}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(submission.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Forms */}
          <div className="lg:col-span-1">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                             <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Top Forms</h3>
                 <Link
                   href="/dashboard/forms?type=oGV"
                   className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                 >
                   View all →
                 </Link>
               </div>
              <div className="space-y-4">
                {topForms.map((form, index) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-600/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{form.name}</p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(form.type)}`}>
                          {form.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">{form.submissions}</p>
                      <div className="flex items-center text-sm">
                        {form.growth >= 0 ? (
                          <ArrowUpIcon className="w-3 h-3 text-green-500" />
                        ) : (
                          <ArrowDownIcon className="w-3 h-3 text-red-500" />
                        )}
                        <span className={`ml-1 ${form.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {Math.abs(form.growth)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/dashboard/forms?type=oGV"
                className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Create Form</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Build new form</p>
                </div>
              </Link>

              <Link
                href="/dashboard/utm-generator"
                className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">UTM Generator</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create tracking links</p>
                </div>
              </Link>

              <Link
                href="/dashboard/users"
                className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Manage Users</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User administration</p>
                </div>
              </Link>

              <Link
                href="/dashboard/settings"
                className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  <AcademicCapIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Settings</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Configure system</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
