"use client";
import ThemeToggle from "@/components/ThemeToggle";

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Personal and workspace preferences.</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Preferences</h2>
          <div className="mt-3 rounded-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-4">
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">General</div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Theme</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Choose Light or Dark</div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


