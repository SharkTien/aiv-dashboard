"use client";
import { useEffect, useRef, useState } from "react";

export default function EntityManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<"national" | "local">("local");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"national" | "local">("local");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/entities", { cache: "no-store", signal: controller.signal });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      const itemsArray = Array.isArray(data.items) ? data.items : [];
      setItems(itemsArray);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Ignore abort errors
        return;
      }
      console.error("Error loading entities:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { 
    load(); 
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  async function addEntity(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult(data);
      setName("");
      setType("local");
      load();
    } else {
      alert(data.error || "Create failed");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this entity?")) return;
    const res = await fetch(`/api/entities?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  function startEdit(e: any) {
    setEditingId(e.id ?? e.entity_id);
    setEditName(e.name);
    setEditType(e.type);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditType("local");
  }

  async function saveEdit() {
    if (editingId == null) return;
    const res = await fetch("/api/entities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: editingId, name: editName, type: editType }),
    });
    if (res.ok) {
      cancelEdit();
      load();
    }
  }

  return (
    <div className="space-y-8">
      {/* Modal for creating entity */}
      {open && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="relative z-20 w-full max-w-4xl rounded-2xl bg-white text-slate-900 dark:bg-[#0b1220] dark:text-white shadow-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 md:p-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Create a new entity</h3>
                  <form onSubmit={addEntity} className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Entity Name</label>
                      <input 
                        placeholder="Enter entity name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Entity Type</label>
                      <select 
                        value={type} 
                        onChange={(e) => setType(e.target.value as any)} 
                        className="h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                      >
                        <option key="national" value="national">National</option>
                        <option key="local" value="local">Local</option>
                      </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="submit" className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors">
                        Create Entity
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
                      <div className="font-medium text-sky-900 dark:text-sky-100">✅ Entity created successfully</div>
                      <div className="text-sm mt-2 space-y-1">
                        <div>Name: <span className="font-semibold">{result.name}</span></div>
                        <div>Type: <span className="font-semibold capitalize">{result.type}</span></div>
                      </div>
                      <div className="text-xs mt-2 text-sky-700 dark:text-sky-300">
                        The entity has been added to the system and is now available for user assignment.
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
      {/* Create Entity Section */}
      <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur">
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Entity</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add new national or local entities to the system</p>
          </div>
          <button 
            onClick={() => setOpen(true)} 
            className="h-10 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
          >
            New Entity
          </button>
        </div>

        
      </div>

      {/* Entities List Section */}
      <div className="rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur">
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Entities</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View and manage all entities in the system</p>
        </div>
        
        <div className="p-6">
          
          {loading ? (
            <div className="py-12 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-300">Loading entities...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-300">No entities created yet.</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create your first entity using the form above.</div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* National Entities Section */}
              {items.filter(e => e.type === 'national').length > 0 && (
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">National Entities</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                      {items.filter(e => e.type === 'national').length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.filter(e => e.type === 'national').map((e) => {
                      const isOrganic = e.name.toLowerCase() === 'organic';
                      return (
                        <div key={e.id ?? e.entity_id} className={`flex items-center justify-between gap-3 p-3 rounded-lg transition-all bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50 ${isOrganic ? 'opacity-60' : 'hover:bg-white/80 dark:hover:bg-gray-700/80'}`}>
                          {editingId === (e.id ?? e.entity_id) ? (
                            <div className="flex flex-wrap items-end gap-3">
                              <input 
                                value={editName} 
                                onChange={(ev) => setEditName(ev.target.value)} 
                                className="h-10 rounded-lg ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" 
                              />
                              <select 
                                value={editType} 
                                onChange={(ev) => setEditType(ev.target.value as any)} 
                                className="h-10 rounded-lg ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                              >
                                <option key="national" value="national">National</option>
                                <option key="local" value="local">Local</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                  {e.name}
                                  {isOrganic && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(System)</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 ring-1 ring-blue-200 dark:ring-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-xs">
                                    National
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="ml-auto flex items-center gap-1">
                            {editingId === (e.id ?? e.entity_id) ? (
                              <>
                                <button onClick={saveEdit} className="h-7 px-3 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors">
                                  Save
                                </button>
                                <button onClick={cancelEdit} className="h-7 px-3 rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors">
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                {!isOrganic && (
                                  <button onClick={() => startEdit(e)} className="h-7 px-3 rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors">
                                    Edit
                                  </button>
                                )}
                                {!isOrganic && (
                                  <button onClick={() => remove(e.id ?? e.entity_id)} className="h-7 px-3 rounded-md bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium transition-colors">
                                    Delete
                                  </button>
                                )}
                                {isOrganic && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                                    Protected
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Local Entities Section */}
              {items.filter(e => e.type === 'local').length > 0 && (
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Local Entities</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      {items.filter(e => e.type === 'local').length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.filter(e => e.type === 'local').map((e) => (
                      <div key={e.id ?? e.entity_id} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50">
                        {editingId === (e.id ?? e.entity_id) ? (
                          <div className="flex flex-wrap items-end gap-3">
                            <input 
                              value={editName} 
                              onChange={(ev) => setEditName(ev.target.value)} 
                              className="h-10 rounded-lg ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" 
                            />
                            <select 
                              value={editType} 
                              onChange={(ev) => setEditType(ev.target.value as any)} 
                              className="h-10 rounded-lg ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                            >
                              <option key="national" value="national">National</option>
                              <option key="local" value="local">Local</option>
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white text-sm">{e.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 ring-1 ring-green-200 dark:ring-green-800 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium text-xs">
                                  Local
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          {editingId === (e.id ?? e.entity_id) ? (
                            <>
                              <button onClick={saveEdit} className="h-7 px-3 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors">
                                Save
                              </button>
                              <button onClick={cancelEdit} className="h-7 px-3 rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(e)} className="h-7 px-3 rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors">
                                Edit
                              </button>
                              <button onClick={() => remove(e.id ?? e.entity_id)} className="h-7 px-3 rounded-md bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium transition-colors">
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


