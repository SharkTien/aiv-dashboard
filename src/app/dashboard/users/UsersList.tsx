"use client";
import { useEffect, useRef, useState } from "react";

type User = { user_id: number; email: string; name: string; role: string; status: number; entity_id: number; program?: string; created_at: string };

export default function UsersList() {
  const [items, setItems] = useState<User[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [entities, setEntities] = useState<Array<{ id: number; name: string }>>([]);
  const [editing, setEditing] = useState<User | null>(null);

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
  useEffect(() => {
    fetch('/api/entities').then(r => r.json()).then(data => {
      // Filter out national entities and organic (only show local entities)
      const localEntities = Array.isArray(data.items) ? data.items.filter((e: any) => e.type === 'local' && e.name.toLowerCase() !== 'organic') : [];
      setEntities(localEntities);
    }).catch(() => setEntities([]));
  }, []);

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
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10">Program</th>
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10">Status</th>
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10">Created</th>
              <th className="px-4 py-2 border-b border-black/10 dark:border-white/10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.user_id} className="border-t border-black/10 dark:border-white/10">
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.name}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.email}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.role}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.program || '-'}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{u.status ? "active" : "inactive"}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <UserActions user={u} onEdit={() => setEditing(u)} onChanged={() => { setCursor(null); load(true); }} />
                </td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr><td className="px-4 py-6 text-gray-600 dark:text-gray-300" colSpan={6}>No users</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          entities={entities}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setCursor(null); load(true); }}
        />
      )}

      <div className="mt-3 flex justify-center">
        <button disabled={!hasMore || loading} onClick={() => load(false)} className="h-10 px-4 rounded-lg bg-black/5 dark:bg-white/10 disabled:opacity-50">
          {loading ? "Loading…" : hasMore ? "Load more" : "No more"}
        </button>
      </div>
    </div>
  );
}

function UserActions({ user, onChanged, onEdit }: { user: User; onChanged: () => void; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    if (!confirm(`Delete user ${user.email}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users?id=${user.user_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      alert('Delete failed');
    } finally { setBusy(false); setOpen(false); }
  }

  async function resetPassword() {
    setBusy(true);
    try {
      const res = await fetch('/api/users/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.user_id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      alert(`New password: ${data.password}`);
    } catch {
      alert('Reset failed');
    } finally { setBusy(false); setOpen(false); }
  }

  function openEdit() { onEdit(); }

  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen((v) => !v)} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">⋯</button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black/10 dark:ring-white/10 z-10">
          <button disabled={busy} onClick={openEdit} className="w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50">Edit</button>
          <button disabled={busy} onClick={resetPassword} className="w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50">Reset password</button>
          <button disabled={busy} onClick={doDelete} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50">Delete</button>
        </div>
      )}
    </div>
  );
}

function EditUserModal({ user, entities, onClose, onSaved }: { user: User; entities: Array<{ id: number; name: string }>; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<User['role']>(user.role);
  const [status, setStatus] = useState<number>(user.status);
  const [entityId, setEntityId] = useState<number>(user.entity_id);
  const [program, setProgram] = useState<string>(user.program || "");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.user_id, name, role, status, entity_id: entityId, program }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onSaved();
    } catch (e) {
      alert('Update failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-20 w-full max-w-4xl rounded-2xl bg-white text-slate-900 dark:bg-[#0b1220] dark:text-white shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Edit user</h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Entity</label>
                <select value={entityId} onChange={(e) => setEntityId(Number(e.target.value))} className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all">
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                <input value={user.email} disabled className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-gray-100 dark:bg-gray-700/50 text-slate-900 dark:text-white" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as any)} className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all">
                  <option key="member" value="member">Member</option>
                  <option key="lead" value="lead">Lead</option>
                  <option key="admin" value="admin">Admin</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Program</label>
                <select value={program} onChange={(e) => setProgram(e.target.value)} className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all">
                  <option value="">Select program…</option>
                  <option value="oGV">oGV</option>
                  <option value="TMR">TMR</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Status</label>
                <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all">
                  <option key="1" value={1}>Active</option>
                  <option key="0" value={0}>Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={saving} className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-medium transition-colors">Save changes</button>
                <button type="button" onClick={onClose} className="h-11 px-6 rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors">Cancel</button>
              </div>
            </form>
          </div>
          <div className="hidden md:block relative bg-gradient-to-br from-sky-50 to-white dark:from-[#0b1220] dark:to-[#0a0a0a]">
            <img src="/giphy2.gif" alt="gif" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          </div>
        </div>
      </div>
    </div>
  );
}



