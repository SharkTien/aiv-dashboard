import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardHome() {
  const user = await getCurrentUser();
  return (
    <div className="relative min-h-screen">
      {/* Loading-like intro layer */}
      <div className="absolute inset-0 -z-10">
        <Image src="/bg.png" alt="bg" fill className="object-cover opacity-70" />
      </div>
      <div className="relative p-10">
        <div className="inline-flex items-center gap-3 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur px-4 py-3 ring-1 ring-black/10 dark:ring-white/10">
          <Image src="/giphy.gif" alt="loading" width={40} height={40} />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome, {user?.name || "AIESECer"}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Empowering leadership through impactful experiences</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card 
            title="oGV Hub Dashboard" 
            subtitle="Modern dashboard for global volunteer management" 
            href="/dashboard/ogv-hub"
            featured={true}
          />
          <Card title="Opportunities" subtitle="Create and track oGV opportunities" />
          <Card title="Analytics" subtitle="See pipelines and conversion" />
          <Card title="Contacts" subtitle="Manage EPs and partners" />
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


