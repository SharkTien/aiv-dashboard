"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, DatabaseIcon, ChartIcon, HandshakeIcon, UsersIcon, SettingsIcon, LogoutIcon, MenuIcon, XIcon, LinkIcon, BellIcon } from "@/components/icons";
import { useSidebar } from "./SidebarContext";

type NavItemProps = {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isCollapsed: boolean;
};

function NavItem({ href, children, icon, isCollapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link 
      href={href} 
      title={isCollapsed ? String(children) : undefined}
      aria-label={isCollapsed ? String(children) : undefined}
      className={`rounded-lg w-full ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors ${
        isActive ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' : ''
      }`}
    >
      {icon}
      {!isCollapsed && <span>{children}</span>}
    </Link>
  );
}

export default function Sidebar({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const { isCollapsed, setIsCollapsed, toggleSidebar } = useSidebar();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        router.push("/auth/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => setIsCollapsed(true)}
      />

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 h-screen bg-white/70 dark:bg-gray-800/70 backdrop-blur border-r border-black/10 dark:border-white/10 transition-all duration-300 ${
          isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-64'
        }`}
      >
        <div className={`flex flex-col h-full ${isCollapsed ? 'p-2' : 'p-4'}`}>
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <Image src="/aiesec_logo_black.svg" alt="AIESEC" width={isCollapsed ? 40 : 120} height={20} />
            </Link>
            <div className="flex items-center gap-2">
              {/* Desktop toggle button */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:block p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              >
                <MenuIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </button>
              {/* Mobile close button */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="lg:hidden p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              >
                <XIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 space-y-4">
            {/* Main Navigation */}
            <div>
              <NavItem href="/dashboard" icon={<HomeIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                HOME
              </NavItem>
              <NavItem href="/dashboard/notifications" icon={<BellIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                Notifications
              </NavItem>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* oGV Hub Section */}
            <div>
              {!isCollapsed && (
                <div className="mb-2 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">
                  oGV Hub
                </div>
              )}
              <div className="space-y-1">
                <NavItem href="/dashboard/ogv-hub" icon={<HomeIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                  Dashboard
                </NavItem>
                <NavItem href="/dashboard/ogv/analytics" icon={<ChartIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                  Analytics
                </NavItem>
                <NavItem href="/dashboard/utm-generator?type=oGV" icon={<LinkIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                  UTM Generator
                </NavItem>
                <NavItem href="/dashboard/ogv/data" icon={<DatabaseIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                  Data
                </NavItem>
               </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* TMR Hub Section */}
            <div>
              {!isCollapsed && (
                <div className="mb-2 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">
                  TMR Hub
                </div>
              )}
              <div className="space-y-1">
                <NavItem href="/dashboard/tmr-hub" icon={<HomeIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                  Dashboard
                </NavItem>
                <NavItem href="/dashboard/utm-generator?type=TMR" icon={<LinkIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                  UTM Generator
                </NavItem>
                <NavItem href="/dashboard/tmr/data" icon={<DatabaseIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                  Data
                </NavItem>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Administration Section */}
            {isAdmin && (
              <div>
                {!isCollapsed && (
                  <div className="mb-2 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">
                    Administration
                  </div>
                )}
                                 <div className="space-y-1">
                   <NavItem href="/dashboard/users" icon={<UsersIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                     User Management
                   </NavItem>
                   <NavItem href="/dashboard/uni-mapping" icon={<DatabaseIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                     University Mapping
                   </NavItem>
                   <NavItem href="/dashboard/forms" icon={<DatabaseIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                     Form Management
                   </NavItem>
                   <NavItem href="/dashboard/utm-manage" icon={<LinkIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                     UTM Management
                   </NavItem>
                 </div>
              </div>
            )}

            {/* Separator */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Settings Section */}
            <div>
              {!isCollapsed && (
                <div className="mb-2 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">
                  System
                </div>
              )}
                             <div className="space-y-1">
                 <NavItem href="/dashboard/settings" icon={<SettingsIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                   Settings
                 </NavItem>
               </div>
            </div>
          </div>

                     {/* Logout */}
           <button 
             onClick={handleLogout}
             title={isCollapsed ? 'Sign Out' : undefined} 
             aria-label={isCollapsed ? 'Sign Out' : undefined} 
             className={`w-full text-left rounded-lg ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors`}
           >
             <LogoutIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
             {!isCollapsed && <span>Sign Out</span>}
           </button>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed top-4 left-4 z-30 lg:hidden p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <MenuIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>
    </>
  );
}
