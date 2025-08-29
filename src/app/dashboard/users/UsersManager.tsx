"use client";
import { useEffect, useState } from "react";

type Entity = { entity_id: number; name: string };

export default function UsersManager() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState<number | "">("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "lead" | "member">("member");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/entities").then((r) => r.json()).then((data) => {
      console.log('UsersManager - Entities data:', data);
      console.log('UsersManager - Entities items:', data.items);
      setEntities(Array.isArray(data.items) ? data.items : []);
    });
  }, []);

  function genPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let out = "";
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setPassword(out);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId) return alert("Select entity");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entityId, email, name, password, role }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Create failed");
    setResult(data);
    setEmail(""); setName(""); setPassword(""); setRole("member"); setEntityId("");
  }

  return (
    <div className="space-y-8">
      
        {/* Modal for creating user */}
        {open && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="relative z-20 w-full max-w-4xl rounded-2xl bg-white text-slate-900 dark:bg-[#0b1220] dark:text-white shadow-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 md:p-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Create a new user</h3>
                  <form onSubmit={createUser} className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Entity</label>
                      <select 
                        value={entityId || ""} 
                        onChange={(e) => setEntityId(e.target.value ? Number(e.target.value) : "")} 
                        className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                      >
                        <option value="">Select entity…</option>
                        {entities.map((e) => (
                          <option key={e.entity_id} value={e.entity_id}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="name@aiesec.org" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Full Name</label>
                      <input 
                        placeholder="Enter full name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Role</label>
                      <select 
                        value={role} 
                        onChange={(e) => setRole(e.target.value as any)} 
                        className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                      >
                        <option value="member">Member</option>
                        <option value="lead">Lead</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
                      <div className="flex gap-3">
                        <input 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className="h-11 flex-1 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" 
                          placeholder="Leave blank to auto-generate" 
                        />
                        <button 
                          type="button" 
                          onClick={genPassword} 
                          className="h-11 px-4 rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="submit" className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors">
                        Create User
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setOpen(false)} 
                        className="h-11 px-6 rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>

                  {result && (
                    <div className="mt-6 rounded-xl ring-1 ring-sky-200 dark:ring-sky-800 bg-sky-50 dark:bg-sky-900/30 p-4 text-slate-900 dark:text-sky-100">
                      <div className="font-medium text-sky-900 dark:text-sky-100">✅ User created successfully</div>
                      <div className="text-sm mt-2 space-y-1">
                        <div>Email: <span className="font-semibold">{result.email}</span></div>
                        <div>Name: <span className="font-semibold">{result.name}</span></div>
                        <div>Role: <span className="font-semibold capitalize">{result.role}</span></div>
                        <div>Entity: <span className="font-semibold">{result.entity_id}</span></div>
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-800">
                          <div className="font-medium text-yellow-800 dark:text-yellow-200">Temporary Password:</div>
                          <div className="font-mono text-sm text-yellow-700 dark:text-yellow-300">{result.password}</div>
                        </div>
                      </div>
                      <div className="text-xs mt-2 text-sky-700 dark:text-sky-300">
                        Please copy and share this password securely with the user. They should change it on first login.
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden md:block relative bg-gradient-to-br from-sky-50 to-white dark:from-[#0b1220] dark:to-[#0a0a0a]">
                  <img src="/giphy2.gif" alt="gif" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                </div>
              </div>
            </div>
          </div>
        )}
      {/* Create User Section */}
      <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur">
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create User</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add new users to the system and assign them to entities</p>
          </div>
          <button 
            onClick={() => setOpen(true)} 
            className="h-10 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
          >
            New User
          </button>
        </div>
      </div>
    </div>
  );
}
