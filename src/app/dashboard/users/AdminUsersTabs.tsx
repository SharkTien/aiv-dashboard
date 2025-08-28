"use client";
import { useState } from "react";
import EntityManager from "./EntityManager";
import UsersManager from "./UsersManager";
import UsersList from "./UsersList";

export default function AdminUsersTabs() {
  const [tab, setTab] = useState<"entities" | "createUser">("entities");
  return (
    <div className="mt-4">
      <div className="inline-flex rounded-xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
        <button onClick={() => setTab("entities")} className={`px-4 py-2 text-sm transition-colors ${tab === "entities" ? "bg-sky-600 text-white" : "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/70"}`}>Entities</button>
        <button onClick={() => setTab("createUser")} className={`px-4 py-2 text-sm transition-colors ${tab === "createUser" ? "bg-sky-600 text-white" : "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/70"}`}>Create user</button>
      </div>

      <div className="mt-4 grid gap-8">
        {tab === "entities" ? (
          <EntityManager />
        ) : (
          <>
            <UsersManager />
            <UsersList />
          </>
        )}
      </div>
    </div>
  );
}


