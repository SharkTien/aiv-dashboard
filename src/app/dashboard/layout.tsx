import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/components/SidebarContext";
import ResponsiveMain from "@/components/ResponsiveMain";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  const isAdmin = user?.role === "admin";
  
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white dark:bg-gray-900 grid grid-cols-1 lg:grid-cols-[auto_1fr]">
        <Sidebar user={user} isAdmin={isAdmin} />
        <ResponsiveMain>
          {children}
        </ResponsiveMain>
      </div>
    </SidebarProvider>
  );
}


