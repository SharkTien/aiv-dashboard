"use client";
import { ReactNode } from "react";
import { useSidebar } from "./SidebarContext";

export default function ResponsiveMain({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <main 
      className="flex-1 h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden overflow-y-auto transition-all duration-300 pt-16 lg:pt-0"
    >
      <div className="p-6">
        {children}
      </div>
    </main>
  );
}
