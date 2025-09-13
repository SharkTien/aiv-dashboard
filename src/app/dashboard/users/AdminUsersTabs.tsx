"use client";
import { useState } from "react";
import EntityManager from "./EntityManager";
import UsersManager from "./UsersManager";
import UsersList from "./UsersList";
import GoalsManager from "./GoalsManager";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function AdminUsersTabs() {
  const [tab, setTab] = useState<"entities" | "createUser" | "goals">("entities");
  const [goalTab, setGoalTab] = useState<"sus" | "msus">("sus");
  const [tabLoading, setTabLoading] = useState(false);

  const handleTabChange = (newTab: "entities" | "createUser" | "goals") => {
    if (newTab !== tab) {
      setTabLoading(true);
      setTab(newTab);
      // Simulate a brief loading delay for better UX
      setTimeout(() => setTabLoading(false), 300);
    }
  };

  const handleGoalTabChange = (newGoalTab: "sus" | "msus") => {
    if (newGoalTab !== goalTab) {
      setTabLoading(true);
      setGoalTab(newGoalTab);
      setTimeout(() => setTabLoading(false), 300);
    }
  };
  
  return (
    <div className="mt-4">
      <div className="inline-flex rounded-xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
        <button onClick={() => handleTabChange("entities")} className={`px-4 py-2 text-sm transition-colors ${tab === "entities" ? "bg-sky-600 text-white" : "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/70"}`}>Entities</button>
        <button onClick={() => handleTabChange("createUser")} className={`px-4 py-2 text-sm transition-colors ${tab === "createUser" ? "bg-sky-600 text-white" : "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/70"}`}>Create user</button>
        <button onClick={() => handleTabChange("goals")} className={`px-4 py-2 text-sm transition-colors ${tab === "goals" ? "bg-sky-600 text-white" : "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/70"}`}>Goals</button>
      </div>

      <div className="mt-4 grid gap-8 relative">
        {tabLoading && <LoadingOverlay isVisible={true} message="Switching tabs..." />}
        {tab === "entities" ? (
          <EntityManager />
        ) : tab === "createUser" ? (
          <>
            <UsersManager />
            <UsersList />
          </>
        ) : (
          <div className="space-y-4">
            {/* Goal Type Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => handleGoalTabChange('sus')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    goalTab === 'sus'
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Goal SUs
                </button>
                <button
                  onClick={() => handleGoalTabChange('msus')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    goalTab === 'msus'
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Goal MSUs
                </button>
              </nav>
            </div>
            
            {/* Goal Content */}
            <GoalsManager goalType={goalTab} />
          </div>
        )}
      </div>
    </div>
  );
}


