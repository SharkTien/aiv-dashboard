import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminUsersTabs from "./AdminUsersTabs";

export default async function Page() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    redirect("/dashboard");
  }
  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Admin</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Customize entities and manage users.</p>
      </header>

      <section>
        <AdminUsersTabs />
      </section>
    </div>
  );
}

// (Client EntityManager moved to ./EntityManager.tsx)
