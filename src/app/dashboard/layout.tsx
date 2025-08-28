import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HomeIcon, DatabaseIcon, ChartIcon, HandshakeIcon, UsersIcon, SettingsIcon, LogoutIcon } from "@/components/icons";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  const isAdmin = user?.role === "admin";
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-white dark:bg-gray-900">
      <aside className="border-r border-black/10 dark:border-white/10 p-4 flex flex-col gap-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <Image src="/aiesec_logo_black.svg" alt="AIESEC" width={120} height={20} />
          </Link>
        </div>
        {/* Main Navigation */}
        <div className="mb-4">
          <NavItem href="/dashboard" icon={<HomeIcon className="h-4 w-4" />}>HOME</NavItem>
        </div>

        {/* Separator */}
        <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

        {/* oGV Hub Section */}
        <div className="mb-4">
          <div className="mb-2 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">oGV Hub</div>
          <div className="space-y-1">
            <NavItem href="/dashboard/ogv/data" icon={<DatabaseIcon className="h-4 w-4" />}>Data</NavItem>
            <NavItem href="/dashboard/ogv/analytics" icon={<ChartIcon className="h-4 w-4" />}>Analytics</NavItem>
            <NavItem href="/dashboard/ogv/crm" icon={<HandshakeIcon className="h-4 w-4" />}>CRM</NavItem>
          </div>
        </div>

        {/* Separator */}
        <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

        {/* Administration Section */}
                       {isAdmin && (
                 <div className="mb-4">
                   <div className="mb-2 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Administration</div>
                   <div className="space-y-1">
                     <NavItem href="/dashboard/users" icon={<UsersIcon className="h-4 w-4" />}>User Management</NavItem>
                     <NavItem href="/dashboard/uni-mapping" icon={<DatabaseIcon className="h-4 w-4" />}>University Mapping</NavItem>
                     <NavItem href="/dashboard/forms" icon={<DatabaseIcon className="h-4 w-4" />}>Form Management</NavItem>
                   </div>
                 </div>
               )}

        {/* Separator */}
        <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

        {/* Settings Section */}
        <div className="mb-4">
          <div className="mb-2 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">System</div>
          <div className="space-y-1">
            <NavItem href="/dashboard/settings" icon={<SettingsIcon className="h-4 w-4" />}>Settings</NavItem>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-auto">
          <button className="w-full text-left rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors">
            <LogoutIcon className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </form>
      </aside>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</main>
    </div>
  );
}

function NavItem({ href, children, icon }: { href: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Link href={href} className="rounded-lg w-full px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors">
      {icon}
      <span>{children}</span>
    </Link>
  );
}


