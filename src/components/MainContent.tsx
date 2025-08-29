"use client";
import { ReactNode } from "react";
import { useSidebar } from "./SidebarContext";

export default function MainContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <main className={`flex-1 min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden transition-all duration-300 pt-16 lg:pt-0 ${
      isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
    }`}>
      <div className="p-6">
        {children}
      </div>
    </main>
  );
}
