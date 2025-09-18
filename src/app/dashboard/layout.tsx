import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/components/SidebarContext";
import ResponsiveMain from "@/components/ResponsiveMain";
import fs from 'fs';
import path from 'path';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  const isAdmin = user?.role === "admin";
  
  // Check if maintenance mode is active
  const maintenanceFlagPath = path.join(process.cwd(), 'maintenance.flag');
  const isMaintenanceMode = fs.existsSync(maintenanceFlagPath);
  
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white dark:bg-gray-900 grid grid-cols-1 lg:grid-cols-[auto_1fr]">
        <Sidebar user={user} isAdmin={isAdmin} />
        <ResponsiveMain>
          {isMaintenanceMode && isAdmin && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Maintenance Mode Active:</strong> The website is currently in maintenance mode. 
                    Only administrators can access the dashboard. 
                    <a href="/admin/maintenance" className="underline ml-1">Manage maintenance mode</a>
                  </p>
                </div>
              </div>
            </div>
          )}
          {children}
        </ResponsiveMain>
      </div>
    </SidebarProvider>
  );
}


