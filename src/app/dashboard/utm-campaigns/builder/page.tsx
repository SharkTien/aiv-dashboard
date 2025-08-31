"use client";
import { useEffect, useState } from "react";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function UTMCampaignBuilderPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  type Campaign = { id: number; entity_id: number | null; entity_name?: string | null; code: string; name: string; description: string | null; form_id: number; form_name?: string };
  type CampaignBlock = { type: "text"; value: string } | { type: "entity_id" };
  type Entity = { entity_id: number; name: string };
  type Form = { id: number; name: string; code: string };
  const [blocks, setBlocks] = useState<CampaignBlock[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [selectedForm, setSelectedForm] = useState<number | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<number | "">("");
  const [formFilter, setFormFilter] = useState<number | "">("");

  const loadActiveCampaigns = async () => {
    try {
      const [campRes, entRes, formsRes] = await Promise.all([
        fetch('/api/utm/campaigns'),
        fetch('/api/entities'),
        fetch('/api/forms')
      ]);
      if (entRes.ok) {
        const entData = await entRes.json();
        console.log('UTM Campaign Builder - Entities data:', entData);
        console.log('UTM Campaign Builder - Entities items:', entData.items);
        // Filter out national entities and organic (only show local entities)
        const localEntities = Array.isArray(entData.items) ? entData.items.filter((e: any) => e.type === 'local' && e.name.toLowerCase() !== 'organic') : [];
        setEntities(localEntities);
      }
      if (formsRes.ok) {
        const formsData = await formsRes.json();
        console.log('UTM Campaign Builder - Forms data:', formsData);
        setForms(Array.isArray(formsData.items) ? formsData.items : []);
      }
      if (campRes.ok) {
        const data: Campaign[] = await campRes.json();
        console.log('UTM Campaign Builder - Campaigns data:', data);
        setActiveCampaigns(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load campaigns/entities/forms', e);
    }
  };

  useEffect(() => {
    loadActiveCampaigns();
  }, []);

  const addTextBlock = () => { setBlocks(prev => [...prev, { type: "text", value: "" }]); };
  const addEntityBlock = () => { setBlocks(prev => [...prev, { type: "entity_id" }]); };
  const updateText = (idx: number, value: string) => { setBlocks(prev => prev.map((b, i) => i === idx ? { type: "text", value } as CampaignBlock : b)); };
  const removeBlock = (idx: number) => { setBlocks(prev => prev.filter((_, i) => i !== idx)); };
  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setDragOverIndex(null); return; }
    setBlocks(prev => { const copy = [...prev]; const [moved] = copy.splice(dragIndex, 1); copy.splice(idx, 0, moved); return copy; });
    setDragIndex(null); setDragOverIndex(null);
  };

  const createFromFormat = async () => {
    if (blocks.length === 0) { alert('Add at least one block'); return; }
    if (!selectedForm) { alert('Please select a form first'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/utm/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format_blocks: blocks, description: description || null, form_id: selectedForm })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Create failed');
      } else {
        alert(`Created ${data.created}/${data.total} campaigns`);
        setBlocks([]);
        setDescription("");
        setSelectedForm(null);
        await loadActiveCampaigns();
      }
    } catch (e) {
      console.error(e);
      alert('Create failed');
    } finally { setSaving(false); }
  };

  const entityNameById = (id: number | null) => {
    if (!id) return '-';
    const found = entities.find(e => e.entity_id === id);
    return found ? found.name : '-';
  };

  // Get all entities that should be displayed
  const displayEntities = entities.filter(e => {
    const matchesEntity = entityFilter ? e.entity_id === Number(entityFilter) : true;
    return matchesEntity;
  });

  // Get campaigns filtered by form
  const filteredCampaigns = activeCampaigns.filter(c => {
    const matchesForm = formFilter ? c.form_id === Number(formFilter) : true;
    const q = search.trim().toLowerCase();
    const matchesSearch = q
      ? (c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q))
      : true;
    return matchesForm && matchesSearch;
  });

  // Create a map of campaigns by entity_id for quick lookup
  const campaignsByEntity = new Map();
  filteredCampaigns.forEach(c => {
    campaignsByEntity.set(c.entity_id, c);
  });

  // Create display data: show all entities, with campaign if exists
  const displayData = displayEntities.map(entity => {
    const campaign = campaignsByEntity.get(entity.entity_id);
    return {
      entity,
      campaign,
      hasCampaign: !!campaign
    };
  });

  if (loading) return <LoadingOverlay isVisible={true} message="Loading Campaign Builder..." />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UTM Campaign Builder</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Compose a format (e.g. [Entity_id]-oGV2025). Select a phase first, then click Create to generate one campaign per entity for that phase.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-end gap-2">
          <button onClick={addTextBlock} className="h-11 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white">+ Text</button>
          <button onClick={addEntityBlock} className="h-11 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">[Entity_id]</button>
          <div className="ml-auto flex items-center gap-4">
            <select
              value={selectedForm || ""}
              onChange={(e) => setSelectedForm(e.target.value ? Number(e.target.value) : null)}
              className="h-11 px-3 rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white"
            >
              <option value="">Select Phase *</option>
              {forms.map(form => (
                <option key={form.id} value={form.id}>{form.name} ({form.code})</option>
              ))}
            </select>
            <button onClick={createFromFormat} disabled={saving || !selectedForm} className="h-11 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white">Create</button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description (applies to all generated campaigns)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className="w-full h-10 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white" placeholder="Optional" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Format Blocks</label>
          <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
            {blocks.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">No blocks yet. Add a Text or [Entity_id] block.</div>
            )}
            {blocks.map((b, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== idx) setDragOverIndex(idx); }}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                className={`flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 cursor-grab ${idx === dragIndex ? 'opacity-70' : ''} ${dragOverIndex === idx ? 'ring-2 ring-sky-400' : ''}`}
                title="Drag to reorder"
              >
                {b.type === "text" ? (
                  <input value={(b as any).value} onChange={e => updateText(idx, e.target.value)} className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-40" placeholder="text..." />
                ) : (
                  <span className="text-xs font-mono text-gray-700 dark:text-gray-300">[Entity_id]</span>
                )}
                <button onClick={() => removeBlock(idx)} className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaigns by Entity</h3>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or name"
              className="h-9 px-3 rounded-md ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white"
            />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value ? Number(e.target.value) : "")}
              className="h-9 px-3 rounded-md ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white"
            >
              <option value="">All LC</option>
              {entities.map(ent => (
                <option key={ent.entity_id} value={ent.entity_id}>{ent.name}</option>
              ))}
            </select>
            <select
              value={formFilter}
              onChange={(e) => setFormFilter(e.target.value ? Number(e.target.value) : "")}
              className="h-9 px-3 rounded-md ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white"
            >
              <option value="">All Phases</option>
              {forms.map(form => (
                <option key={form.id} value={form.id}>{form.name}</option>
              ))}
            </select>
          </div>
        </div>
        {displayData.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No entities found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Entity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">UTM Campaign</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayData.map(({ entity, campaign, hasCampaign }) => (
                  <tr key={entity.entity_id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-mono">{entity.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {hasCampaign ? campaign.name : 'không có'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LoadingOverlay isVisible={saving} message="Creating..." />
    </div>
  );
}
