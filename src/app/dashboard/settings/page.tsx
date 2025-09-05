"use client";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useMemo, useState } from "react";

type Me = { sub: number; name: string; email: string; role: "admin" | "lead" | "member"; entity_id: number };

export default function Page() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Me["role"]>("member");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [entities, setEntities] = useState<Array<{ entity_id: number; name: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, entRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/entities')
        ]);
        if (entRes.ok) {
          const ents = await entRes.json();
          setEntities(Array.isArray(ents.items) ? ents.items : []);
        }
        if (meRes.ok) {
          const data = await meRes.json();
          const user = data.user as Me;
          setMe(user);
          setName(user.name);
          setEmail(user.email as any);
          setRole(user.role);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const entityName = useMemo(() => {
    if (!me) return "";
    const found = entities.find(e => e.entity_id === Number(me.entity_id));
    return found ? found.name : String(me.entity_id);
  }, [entities, me]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setSaving(true);
    try {
      // update basic fields (name only; email/role managed by admin)
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Update failed');
      alert('Profile updated');
    } catch { alert('Update failed'); } finally { setSaving(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) return alert('Please fill password fields');
    if (newPassword !== confirmPassword) return alert('New passwords do not match');
    setSavingPw(true);
    try {
      const r2 = await fetch('/api/profile/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) });
      const d2 = await r2.json();
      if (!r2.ok) return alert(d2.error || 'Password change failed');
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      alert('Password updated');
    } catch { alert('Password change failed'); } finally { setSavingPw(false); }
  }
  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Manage your preferences and account profile.</p>
      </div>

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

        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-gray-800/80 backdrop-blur p-6">
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Account information</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Update your display name</div>
              </div>
              {loading ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">Loading...</div>
              ) : !me ? (
                <div className="text-sm text-red-600">Unauthorized</div>
              ) : (
                <form onSubmit={saveProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                      <input type="email" value={email} disabled className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-gray-100 dark:bg-gray-700/50 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Role</label>
                      <input value={role.charAt(0).toUpperCase() + role.slice(1)} disabled className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-gray-100 dark:bg-gray-700/50 text-slate-900 dark:text-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Entity</label>
                      <input value={entityName} disabled className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-gray-100 dark:bg-gray-700/50 text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={saving} className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-medium transition-colors">{saving ? 'Saving…' : 'Save profile'}</button>
                  </div>
                </form>
              )}
            </div>
            <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-gray-800/80 backdrop-blur p-6">
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">Security</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Change your account password</div>
              </div>
              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current password</label>
                  <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">New password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Confirm new password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" />
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={savingPw} className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-medium transition-colors">{savingPw ? 'Saving…' : 'Update password'}</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


