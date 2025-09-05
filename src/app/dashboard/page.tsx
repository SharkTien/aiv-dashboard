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

  useEffect(() => {
    loadUser();
    loadStats();
  }, []);

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const result = await response.json();
      if (result.success) {
        setUser(result.data);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/dashboard/home-stats');
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

        {/* Stats Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
        </div>



        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card 
            title="oGV Hub Dashboard" 
            subtitle="Modern dashboard for global volunteer management" 
            href="/dashboard/ogv-hub"
            featured={true}
          />
          <Card title="TMR Hub Dashboard" subtitle="Manage TMR programs and data" href="/dashboard/tmr-hub" />
          
          {/* Admin-only cards */}
          {user?.role === 'admin' && (
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
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-2xl p-6 ring-1 ring-black/10 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
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


