"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Login failed");
        return;
      }
      window.location.href = "/dashboard";
    } finally {
      setIsLoading(false);
    }
  }

  // If already logged in, redirect to dashboard (client-side safeguard)
  if (typeof window !== "undefined") {
    // presence of session cookie is HttpOnly; we rely on server redirects elsewhere.
  }

  return (
    <div className="min-h-screen relative bg-[var(--background)] text-[var(--foreground)]">
      {/* Logo top-left */}
      <div className="absolute left-6 top-6 z-20 flex items-center gap-4">
        <Link href="/">
          <Image
            src="/aiesec_logo_black.svg"
            alt="AIESEC"
            width={140}
            height={24}
            priority
          />
        </Link>
        <ThemeToggle />
      </div>

      {/* Background visual (optional) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#eef5ff] to-white dark:from-[#0b0f19] dark:to-[#0a0a0a]" />

      <div className="mx-auto w-full max-w-6xl h-screen px-6 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left hero copy (like EXPA) */}
        <div className="hidden lg:block">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            Empower youth leadership
          </h1>
          <p className="mt-4 text-base/7 text-gray-600 dark:text-gray-300 max-w-xl">
            Sign in to access your AIESEC experience management dashboard.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 opacity-90 max-w-2xl">
            <div className="rounded-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Opportunities</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">Create and manage</p>
            </div>
            <div className="rounded-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Analytics</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">Track performance</p>
            </div>
            <div className="rounded-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Contacts</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">Engage stakeholders</p>
            </div>
          </div>
        </div>

        {/* Right auth card */}
        <div className="w-full max-w-md justify-self-center">
          <div className="rounded-3xl ring-1 ring-black/10 dark:ring-white/10 bg-white/85 dark:bg-gray-800/85 backdrop-blur px-6 py-8 md:px-8 md:py-10 shadow-[0_10px_30px_rgba(2,6,23,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 px-3 py-1 text-xs font-medium ring-1 ring-sky-200 dark:ring-sky-800">
              AIESEC Tracking System
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Sign in with your Tracking System account - Provided by EMT
            </p>
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">  
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 rounded-xl ring-1 ring-black/10 dark:ring-white/15 bg-white dark:bg-gray-800/50 px-3 outline-none focus:ring-2 focus:ring-sky-500/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-xl ring-1 ring-black/10 dark:ring-white/15 bg-white dark:bg-gray-800/50 px-3 pr-24 outline-none focus:ring-2 focus:ring-sky-500/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded-md px-2 py-1 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-sky-600"
                  />
                  Remember me on this device
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">Need help? contact your LC</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 h-12 rounded-xl bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} AIESEC. All rights reserved. Product by H.V.Tien.
          </p>
        </div>
      </div>
    </div>
  );
}


