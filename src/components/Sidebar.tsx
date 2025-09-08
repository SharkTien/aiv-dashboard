"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { HomeIcon, DatabaseIcon, ChartIcon, HandshakeIcon, UsersIcon, SettingsIcon, LogoutIcon, MenuIcon, XIcon, LinkIcon, BellIcon, UserIcon, ChevronDownIcon } from "@/components/icons";
import { useSidebar } from "./SidebarContext";

type NavItemProps = {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isCollapsed: boolean;
  badge?: number;
};

function NavItem({ href, children, icon, isCollapsed, badge }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link 
      href={href} 
      title={isCollapsed ? String(children) : undefined}
      aria-label={isCollapsed ? String(children) : undefined}
      className={`rounded-lg w-full ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors relative ${
        isActive ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' : ''
      }`}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 && (
          <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 z-10 ${
            isCollapsed ? 'text-[10px] min-w-[14px] h-[14px]' : 'text-[10px]'
          }`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      {!isCollapsed && <span>{children}</span>}
    </Link>
  );
}

export default function Sidebar({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const { isCollapsed, setIsCollapsed, toggleSidebar } = useSidebar();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine user's program access based on role
  const getUserPrograms = () => {
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

  // Load unread notifications count
  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications?unread_only=true&limit=1');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.pagination?.total || 0);
        }
      }
    } catch (error) {
      console.error('Error loading unread notifications count:', error);
    }
  };

  // Load unread count on mount and set up polling
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      // Poll every 30 seconds for new notifications
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Expose loadUnreadCount to global scope for other components to use
  useEffect(() => {
    (window as any).refreshNotificationCount = loadUnreadCount;
    return () => {
      delete (window as any).refreshNotificationCount;
    };
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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
          <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1">{/* Added scroll functionality */}
            {/* Main Navigation */}
            <div>
              <NavItem href="/dashboard" icon={<HomeIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                HOME
              </NavItem>
              <NotificationNavItem 
                isCollapsed={isCollapsed} 
                unreadCount={unreadCount}
                onRefreshCount={loadUnreadCount}
              />
            </div>

            {/* Hub Sections with conditional separators */}
            {(canSeeOGV || canSeeTMR) && (
              <>
                {/* Separator */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* oGV Hub Section */}
                {canSeeOGV && (
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
                )}

                {/* Separator between hubs if both are visible */}
                {canSeeOGV && canSeeTMR && (
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>
                )}

                {/* TMR Hub Section */}
                {canSeeTMR && (
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
                      <NavItem href="/dashboard/tmr/analytics" icon={<ChartIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                        Analytics
                      </NavItem>
                      <NavItem href="/dashboard/utm-generator?type=TMR" icon={<LinkIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                        UTM Generator
                      </NavItem>
                      <NavItem href="/dashboard/tmr/data" icon={<DatabaseIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />} isCollapsed={isCollapsed}>
                        Data
                      </NavItem>
                    </div>
                  </div>
                )}
              </>
            )}

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
                     Link Management
                   </NavItem>
                 </div>
              </div>
            )}

            {/* Separator */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title={isCollapsed ? 'Profile' : undefined} 
              aria-label={isCollapsed ? 'Profile' : undefined} 
              className={`w-full text-left rounded-lg ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors ${isDropdownOpen ? 'bg-black/5 dark:bg-white/10' : ''}`}
            >
              <UserIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
              {!isCollapsed && (
                <>
                  <span className="flex-1">Profile</span>
                  <ChevronDownIcon className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className={`absolute bottom-full mb-2 ${isCollapsed ? 'left-0 w-48' : 'left-0 right-0'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50`}>
                <Link 
                  href="/dashboard/settings" 
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200 text-sm"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200 text-sm"
                >
                  <LogoutIcon className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
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

// Professional Notification NavItem with preview
function NotificationNavItem({ 
  isCollapsed, 
  unreadCount, 
  onRefreshCount 
}: { 
  isCollapsed: boolean; 
  unreadCount: number;
  onRefreshCount: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === '/dashboard/notifications';
  const [showPreview, setShowPreview] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadRecentNotifications = async () => {
    if (previewLoading) return;
    
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=3');
      const result = await response.json();
      if (result.success) {
        setRecentNotifications(result.items || []);
      }
    } catch (error) {
      console.error('Error loading recent notifications:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleMouseEnter = () => {};

  const handleMouseLeave = () => {};

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
        setShowPreview(false);
      }
    };

    if (showPreview) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPreview]);

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'PUT' });
      onRefreshCount();
      loadRecentNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="relative" ref={previewRef}>
      <Link 
        href="/dashboard/notifications"
        className={`rounded-lg w-full ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors relative ${
          isActive ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' : ''
        }`}
      >
        <div className="relative">
          <BellIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
          {unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 z-10 ${
              isCollapsed ? 'text-[10px] min-w-[14px] h-[14px]' : 'text-[10px]'
            }`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {!isCollapsed && <span>Notifications</span>}
      </Link>

      {/* Notification Preview Popup */}
      {/* Notification preview disabled per request */}
    </div>
  );
}
