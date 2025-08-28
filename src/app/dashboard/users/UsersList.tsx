"use client";
import { useEffect, useRef, useState } from "react";

type User = { user_id: number; email: string; name: string; role: string; status: number; entity_id: number; created_at: string };

export default function UsersList() {
  const [items, setItems] = useState<User[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function load(reset = false) {
    if (loading) return;
    setLoading(true);
    // cancel any in-flight request to avoid race/empty responses
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const params = new URLSearchParams();
    params.set("limit", "20");
    if (!reset && cursor) params.set("cursor", String(cursor));
    if (q.trim()) params.set("q", q.trim());
    let data: any = { items: [], nextCursor: null };
    try {
      const res = await fetch(`/api/users?${params.toString()}`, { cache: "no-store", signal: controller.signal });
      const text = await res.text();
      if (text) data = JSON.parse(text);
    } catch (err) {
      // swallow abort/parse errors to prevent UI crash
      data = { items: [], nextCursor: null };
    }
    const list = reset ? data.items : [...items, ...data.items];
    setItems(list);
    setCursor(data.nextCursor);
    setHasMore(Boolean(data.nextCursor));
    setLoading(false);
  }

  useEffect(() => { load(true); /* initial */ }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setCursor(null);
    load(true);
  }

  return (
    <div className="mt-8">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Users</h2>
      <form onSubmit={onSearch} className="mt-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="h-10 flex-1 rounded-lg ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white" />
        <button className="h-10 px-4 rounded-lg bg-black/5 dark:bg-white/10">Search</button>
      </form>

      <div className="mt-3 rounded-xl ring-1 ring-black/15 dark:ring-white/10 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10">Name</th>
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10">Email</th>
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10">Role</th>
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10">Status</th>
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.user_id} className="border-t border-black/10 dark:border-white/10">
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.name}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.email}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.role}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.status ? "active" : "inactive"}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr><td className="px-4 py-6 text-gray-600 dark:text-gray-300" colSpan={5}>No users</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-center">
        <button disabled={!hasMore || loading} onClick={() => load(false)} className="h-10 px-4 rounded-lg bg-black/5 dark:bg-white/10 disabled:opacity-50">
          {loading ? "Loading…" : hasMore ? "Load more" : "No more"}
        </button>
      </div>
    </div>
  );
}


