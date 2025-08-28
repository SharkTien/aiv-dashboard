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
          <Card title="Opportunities" subtitle="Create and track oGV opportunities" />
          <Card title="Analytics" subtitle="See pipelines and conversion" />
          <Card title="Contacts" subtitle="Manage EPs and partners" />
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 ring-1 ring-black/10 dark:ring-white/10">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
    </div>
  );
}


