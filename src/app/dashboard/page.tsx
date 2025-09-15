'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';

interface HomeStatsData {
  ogv: {
    totalForms: number;
    totalSubmissions: number;
    highestPhase: {
      id: number;
      name: string;
      code: string;
      submission_count: number;
    } | null;
  };
  tmr: {
    totalForms: number;
    totalSubmissions: number;
    highestPhase: {
      id: number;
      name: string;
      code: string;
      submission_count: number;
    } | null;
  };
}

export default function DashboardHome() {
  const [stats, setStats] = useState<HomeStatsData>({
    ogv: {
      totalForms: 0,
      totalSubmissions: 0,
      highestPhase: null
    },
    tmr: {
      totalForms: 0,
      totalSubmissions: 0,
      highestPhase: null
    }
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // last 7 days default
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [preset, setPreset] = useState<'this_week' | 'last_week' | 'last_7_days' | 'custom'>('last_7_days');

  // Determine user's program access based on role - same logic as Sidebar
  const getUserPrograms = () => {
    if (!user) return [];
    const isAdmin = user?.role === "admin";
    if (isAdmin) return ["oGV", "TMR"]; // Admins see both

    // Prefer explicit program on user, normalized
    const rawProgram = (user?.program ?? "").toString().trim().toUpperCase();
    if (rawProgram.includes("TMR")) return ["TMR"];
    if (rawProgram.includes("OGV")) return ["oGV"];

    // If program is not specified, don't guess incorrectly
    return [];
  };

  const userPrograms = getUserPrograms();
  const canSeeOGV = userPrograms.includes("oGV");
  const canSeeTMR = userPrograms.includes("TMR");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadUser();
    loadStats();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const result = await response.json();
      if (result.user) {
        setUser(result.user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadStats = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      }
      const response = await fetch(`/api/dashboard/home-stats?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update date range when preset changes
  useEffect(() => {
    const setWeekRange = (offsetWeeks: number) => {
      const now = new Date();
      const day = now.getDay();
      const mondayOffset = ((day + 6) % 7); // 0=Mon ... 6=Sun mapping
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

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const [resPersonal, resGeneral] = await Promise.all([
        fetch('/api/notifications?limit=5'),
        fetch('/api/general-notifications?limit=5', { cache: 'no-store' })
      ]);
      const personal = resPersonal.ok ? await resPersonal.json() : { items: [] };
      const general = resGeneral.ok ? await resGeneral.json() : { items: [] };

      const generalMapped = Array.isArray(general.items) ? general.items.map((g: any) => ({
        id: `general-${g.id}`,
        title: g.title,
        message: (g.content_html || '').replace(/<[^>]+>/g, '').slice(0, 200),
        created_at: g.created_at,
        is_read: false
      })) : [];

      const personalItems = Array.isArray(personal.items) ? personal.items : [];
      const merged = [...personalItems, ...generalMapped]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setNotifications(merged);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Loading-like intro layer */}
      <div className="absolute inset-0 -z-10">
        <Image src="/bg.png" alt="bg" fill className="object-cover opacity-70" />
      </div>
      <div className="relative p-10">
        <div className="inline-flex items-center gap-3 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur px-4 py-3 ring-1 ring-black/10 dark:ring-white/10">
          <Image src="/giphy.gif" alt="loading" width={96} height={96} />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome, AIESECer</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Empowering leadership through impactful experiences</p>
          </div>
        </div>

        {/* Filters + Stats Cards with Notifications - Role-based filtering */}
        <div className="mt-8 mb-8">
          {/* Date filters */}
          <div className="mb-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-4 ring-1 ring-black/10 dark:ring-white/10">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Preset</label>
                <select value={preset} onChange={(e) => setPreset(e.target.value as any)} className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="this_week">This week (Mon-Sun)</option>
                  <option value="last_week">Last week</option>
                  <option value="last_7_days">Last 7 days</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Start date</label>
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); }} className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">End date</label>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); }} className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
              <button onClick={loadStats} className="h-10 px-4 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm">Apply</button>
            </div>
          </div>
          {/* Case 1: Both oGV and TMR visible - 3 column layout */}
          {canSeeOGV && canSeeTMR && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FormTypeCard 
                title="oGV Forms" 
                totalForms={loading ? "..." : stats.ogv.totalForms.toLocaleString()}
                totalSubmissions={loading ? "..." : stats.ogv.totalSubmissions.toLocaleString()}
                highestPhase={stats.ogv.highestPhase}
                logo="/gv.png"
                href="/dashboard/ogv-hub"
              />
              <FormTypeCard 
                title="TMR Forms" 
                totalForms={loading ? "..." : stats.tmr.totalForms.toLocaleString()}
                totalSubmissions={loading ? "..." : stats.tmr.totalSubmissions.toLocaleString()}
                highestPhase={stats.tmr.highestPhase}
                logo="/tmr.webp"
                href="/dashboard/tmr-hub"
              />
              <NotificationsCard 
                notifications={notifications} 
                loading={notificationsLoading}
              />
            </div>
          )}
          
          {/* Case 2: Only oGV visible - 2 column layout */}
          {canSeeOGV && !canSeeTMR && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormTypeCard 
                title="oGV Forms" 
                totalForms={loading ? "..." : stats.ogv.totalForms.toLocaleString()}
                totalSubmissions={loading ? "..." : stats.ogv.totalSubmissions.toLocaleString()}
                highestPhase={stats.ogv.highestPhase}
                logo="/gv.png"
                href="/dashboard/ogv-hub"
              />
              <NotificationsCard 
                notifications={notifications} 
                loading={notificationsLoading}
              />
            </div>
          )}
          
          {/* Case 3: Only TMR visible - 2 column layout */}
          {!canSeeOGV && canSeeTMR && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormTypeCard 
                title="TMR Forms" 
                totalForms={loading ? "..." : stats.tmr.totalForms.toLocaleString()}
                totalSubmissions={loading ? "..." : stats.tmr.totalSubmissions.toLocaleString()}
                highestPhase={stats.tmr.highestPhase}
                logo="/tmr.webp"
                href="/dashboard/tmr-hub"
              />
              <NotificationsCard 
                notifications={notifications} 
                loading={notificationsLoading}
              />
            </div>
          )}
          
          {/* Case 4: No forms visible (edge case) - Just notifications */}
          {!canSeeOGV && !canSeeTMR && (
            <div className="grid grid-cols-1 gap-6">
              <NotificationsCard 
                notifications={notifications} 
                loading={notificationsLoading}
              />
            </div>
          )}
        </div>



        {/* Quick Actions - Role-based filtering */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {canSeeOGV && (
            <Card 
              title="oGV Hub Dashboard" 
              subtitle="Modern dashboard for global volunteer management" 
              href="/dashboard/ogv-hub"
              featured={true}
            />
          )}
          {canSeeTMR && (
            <Card title="TMR Hub Dashboard" subtitle="Manage TMR programs and data" href="/dashboard/tmr-hub" />
          )}
          
          {/* Admin-only cards */}
          {isAdmin && (
            <>
              <Card title="Forms Manager" subtitle="Create and manage forms" href="/dashboard/forms" />
              <Card title="Users" subtitle="Manage users and permissions" href="/dashboard/users" />
              <Card title="Settings" subtitle="Configure system settings" href="/dashboard/settings" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

function Card({ title, subtitle, href, featured }: { title: string; subtitle: string; href?: string; featured?: boolean }) {
  const cardContent = (
    <div className={`rounded-2xl backdrop-blur p-6 ring-1 ring-black/10 dark:ring-white/10 transition-all duration-300 ${
      featured 
        ? 'bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20 hover:from-blue-100/80 hover:to-purple-100/80 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30' 
        : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80'
    }`}>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
      {featured && (
        <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400">
          <span>Explore Dashboard →</span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:scale-105 transition-transform duration-300">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

function NotificationsCard({ notifications, loading }: { notifications: any[]; loading: boolean }) {
  const cardContent = (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur h-full rounded-2xl p-6 ring-1 ring-black/10 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Notifications</h3>
        </div>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.map((notification, index) => (
              <div key={notification.id} className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="inline-block w-2 h-2 bg-sky-500 rounded-full flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
        <div className="text-center">
          <span className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
            View All Notifications →
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Link href="/dashboard/notifications" className="block hover:scale-105 transition-transform duration-300">
      {cardContent}
    </Link>
  );
}

function FormTypeCard({ 
  title, 
  totalForms, 
  totalSubmissions, 
  highestPhase, 
  logo, 
  href 
}: { 
  title: string; 
  totalForms: string; 
  totalSubmissions: string; 
  highestPhase: {
    id: number;
    name: string;
    code: string;
    submission_count: number;
  } | null;
  logo: string;
  href: string;
}) {
  const cardContent = (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur h-full rounded-2xl p-6 ring-1 ring-black/10 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Image src={logo} alt={title} width={96} height={96} className="rounded-lg" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">Total Forms</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">{totalForms}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">Clean Submissions</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">{totalSubmissions}</span>
        </div>
        
        {highestPhase && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Highest Phase</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={highestPhase.name}>
              {highestPhase.name}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {highestPhase.submission_count.toLocaleString()} submissions
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Link href={href} className="block hover:scale-105 transition-transform duration-300">
      {cardContent}
    </Link>
  );
}


