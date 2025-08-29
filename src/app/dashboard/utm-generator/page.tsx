"use client";
import { useEffect, useState, useMemo } from "react";
import LoadingOverlay from "@/components/LoadingOverlay";

type Entity = {
  id: number;
  name: string;
};

type CampaignBlock = { type: "text"; value: string } | { type: "entity_id" };

type ActiveCampaign = {
  id: number;
  name: string;
  code: string;
  format_blocks: CampaignBlock[] | null;
};

type UTMSource = {
  id: number;
  code: string;
  name: string;
  description: string;
  platform: string;
};

type UTMMedium = {
  id: number;
  code: string;
  name: string;
  description: string;
  name_required: boolean;
};

type UTMLink = {
  id: number;
  entity_id: number;
  campaign_id: number;
  source_id: number;
  medium_id: number;
  utm_name: string | null;
  base_url: string;
  created_at: string;
  entity_name: string;
  campaign_code: string;
  campaign_name: string;
  source_code: string;
  source_name: string;
  medium_code: string;
  medium_name: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export default function UTMGeneratorPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);
  const [sources, setSources] = useState<UTMSource[]>([]);
  const [mediums, setMediums] = useState<UTMMedium[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState<UTMLink | null>(null);
  const [role, setRole] = useState<'admin' | 'lead' | 'member' | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'links'>('create');
  const [links, setLinks] = useState<UTMLink[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [activeLoading, setActiveLoading] = useState(true);

  // Form state
  const [selectedEntity, setSelectedEntity] = useState<number | "">("");
  const [selectedSource, setSelectedSource] = useState<number | "">("");
  const [selectedMedium, setSelectedMedium] = useState<number | "">("");
  const [utmName, setUtmName] = useState("");
  const [selectedMediumData, setSelectedMediumData] = useState<UTMMedium | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMedium) {
      const medium = mediums.find(m => m.id === selectedMedium);
      setSelectedMediumData(medium || null);
      if (!medium?.name_required) setUtmName("");
    } else {
      setSelectedMediumData(null);
      setUtmName("");
    }
  }, [selectedMedium, mediums]);

  // Load active campaign for the selected entity
  useEffect(() => {
    const loadActiveForEntity = async () => {
      if (!selectedEntity) { return; }
      try {
        setActiveLoading(true);
        const res = await fetch(`/api/utm/campaigns/active?entity_id=${selectedEntity}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.active) ? data.active : [];
          setActiveCampaign(list.length > 0 ? list[0] : null);
        }
      } catch (e) {
        console.error('Failed to load active campaign for entity', e);
      } finally { setActiveLoading(false); }
    };
    loadActiveForEntity();
  }, [selectedEntity]);

  useEffect(() => {
    if (activeTab === 'links') {
      void loadLinks(1);
    }
  }, [activeTab]);

  const buildCampaignString = (blocks: CampaignBlock[] | null, entityId: number | ""): string => {
    if (!blocks || blocks.length === 0) return activeCampaign?.code || "";
    const entity = typeof entityId === "number" ? entities.find(e => e.id === entityId) : null;
    return blocks
      .map(b => (b.type === "text" ? b.value : (entity ? entity.name : String(entityId || ""))))
      .join("");
  };

  const activeCampaignString = useMemo(() => buildCampaignString(activeCampaign?.format_blocks || null, selectedEntity), [activeCampaign, entities, selectedEntity]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [meRes, entitiesRes, sourcesRes, mediumsRes, activeRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/entities'),
        fetch('/api/utm/sources'),
        fetch('/api/utm/mediums'),
        fetch('/api/utm/campaigns/active')
      ]);

      if (meRes.ok) {
        const { user } = await meRes.json();
        setRole(user.role);
        // Non-admin: default entity to user's entity_id and lock it
        if (user.role !== 'admin' && user.entity_id) {
          setSelectedEntity(Number(user.entity_id));
        }
      }

      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json();
        setEntities(Array.isArray(entitiesData.items) ? entitiesData.items : []);
      }
      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        setSources(Array.isArray(sourcesData) ? sourcesData : []);
      }
      if (mediumsRes.ok) {
        const mediumsData = await mediumsRes.json();
        setMediums(Array.isArray(mediumsData) ? mediumsData : []);
      }
      if (activeRes.ok) {
        const { active } = await activeRes.json();
        setActiveCampaign(active || null);
      }

      setActiveLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async (page: number) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const res = await fetch(`/api/utm/links?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLinks(Array.isArray(data.items) ? data.items : []);
        setPagination(data.pagination || null);
      }
    } catch (e) {
      console.error('Failed to load links', e);
    }
  };

  const handleCreateUTM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !selectedSource || !selectedMedium) {
      alert('Please fill in all required fields');
      return;
    }
    if (selectedMediumData?.name_required && !utmName.trim()) {
      alert('UTM name is required for this medium');
      return;
    }
    if (!activeCampaign) {
      alert('No active campaign for the selected entity. Please activate a campaign.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/utm/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedEntity,
          campaign_id: activeCampaign.id,
          source_id: selectedSource,
          medium_id: selectedMedium,
          utm_name: utmName.trim() || null,
          base_url: 'https://www.aiesec.vn/globalvolunteer/home'
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert('UTM link created successfully!');
        if (data && data.link) {
          setLastCreated(data.link as UTMLink);
        }
        setSelectedEntity("");
        setSelectedSource("");
        setSelectedMedium("");
        setUtmName("");
        setSelectedMediumData(null);
        // Do not reload list; show only the newly created link panel
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to create UTM link');
      }
    } catch (error) {
      console.error('Error creating UTM link:', error);
      alert('Failed to create UTM link');
    } finally {
      setCreating(false);
    }
  };

  const generateUTMUrl = (link: UTMLink) => {
    const url = new URL(link.base_url);
    url.searchParams.set('utm_source', link.source_code);
    url.searchParams.set('utm_medium', link.medium_code);
    const campaignParam = buildCampaignString(activeCampaign?.format_blocks || null, link.entity_id) || link.campaign_code;
    url.searchParams.set('utm_campaign', campaignParam);
    if (link.utm_name) url.searchParams.set('utm_name', link.utm_name);
    return url.toString();
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); alert('URL copied to clipboard!'); } catch {}
  };

  const handlePageChange = (page: number) => { if (pagination) loadLinks(page); };
  const handleDeleteLink = async (id: number) => {
    if (!confirm('Delete this UTM link?')) return;
    try {
      const res = await fetch(`/api/utm/links?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Deleted');
        if (pagination) loadLinks(pagination.page);
      } else {
        const err = await res.json();
        alert(err.error || 'Delete failed');
      }
    } catch (e) {
      alert('Delete failed');
    }
  };

  if (loading) return <LoadingOverlay isVisible={true} message="Loading UTM Generator..." />;

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UTM Link Generator</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Create and manage UTM tracking links for Global Volunteer campaigns.</p>
      </div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'create', label: 'Create' },
            { id: 'links', label: 'Available Links' }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === t.id ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}>{t.label}</button>
          ))}
        </nav>
      </div>

      {activeTab === 'create' && (
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Create New UTM Link</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Active campaign format: <span className="font-mono text-gray-800 dark:text-gray-200">{activeLoading ? 'loading…' : (activeCampaignString || '(no active format)')}</span></p>
        <form onSubmit={handleCreateUTM} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Entity Name *</label>
              <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value ? Number(e.target.value) : "")} disabled={role !== 'admin'} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all disabled:opacity-60" required>
                <option value="">Select Entity</option>
                {entities.map((entity) => (<option key={entity.id} value={entity.id}>{entity.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">UTM Source *</label>
              <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value ? Number(e.target.value) : "")} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" required>
                <option value="">Select Source</option>
                {sources.map((source) => (<option key={source.id} value={source.id}>{source.name} ({source.platform})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">UTM Medium *</label>
              <select value={selectedMedium} onChange={(e) => setSelectedMedium(e.target.value ? Number(e.target.value) : "")} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" required>
                <option value="">Select Medium</option>
                {mediums.map((medium) => (<option key={medium.id} value={medium.id}>{medium.name} {medium.name_required ? '(Name Required)' : ''}</option>))}
              </select>
            </div>
          </div>

          {selectedMediumData?.name_required ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">UTM Name *</label>
              <input type="text" value={utmName} onChange={(e) => setUtmName(e.target.value)} placeholder="Enter UTM name (required for this medium)" className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" required />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedMediumData.description}</p>
            </div>
          ) : (<div></div>)}

          <div className="flex items-center justify-between">
            <button type="submit" disabled={creating} className="h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-medium transition-colors">{creating ? 'Creating...' : 'Create UTM Link'}</button>
          </div>
        </form>
      </div>
      )}

      {/* Generated UTM Link (only show right after create) */}
      {activeTab === 'create' && lastCreated && (
        <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generated UTM Link</h2>
          </div>
          {(() => {
            const link = lastCreated as UTMLink;
            const utmUrl = generateUTMUrl(link);
            return (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200/50 dark:border-gray-600/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Entity</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Campaign</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Source</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Medium</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Generated URL</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-50/50 dark:hover:bg-gray-600/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.entity_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.campaign_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.source_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.medium_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.utm_name || '-'}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="max-w-xs truncate text-blue-600 dark:text-blue-400">{utmUrl}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <button onClick={() => copyToClipboard(utmUrl)} className="px-3 py-1 text-xs rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium transition-colors">Copy URL</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'links' && (
        <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Available UTM Links</h2>
            {pagination && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
            )}
          </div>
          {links.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No links found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200/50 dark:border-gray-600/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Entity</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Campaign</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Source</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Medium</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Generated URL</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Created</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map(link => {
                      const utmUrl = generateUTMUrl(link);
                      return (
                        <tr key={link.id} className="border-b border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-50/50 dark:hover:bg-gray-600/50">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.entity_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.campaign_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.source_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.medium_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.utm_name || '-'}</td>
                          <td className="py-3 px-4 text-sm"><div className="max-w-xs truncate text-blue-600 dark:text-blue-400">{utmUrl}</div></td>
                          <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{new Date(link.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button onClick={() => copyToClipboard(utmUrl)} className="px-3 py-1 text-xs rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium transition-colors">Copy URL</button>
                              <button onClick={() => handleDeleteLink(link.id)} className="px-3 py-1 text-xs rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium transition-colors">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={!pagination.hasPrev} className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Previous</button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={!pagination.hasNext} className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* No historical links table */}

      {/* Sources & Mediums Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sources Reference */}
        <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">UTM Sources Reference</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/50 dark:border-gray-600/50">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200">Code</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200">Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200">Platform</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200">Description</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-b border-gray-200/50 dark:border-gray-600/50">
                    <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">{s.code}</td>
                    <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">{s.name}</td>
                    <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-300">{s.platform}</td>
                    <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-300">{s.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mediums Reference + My Links (non-admin) */}
        <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">UTM Mediums Reference</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/50 dark:border-gray-600/50">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200">Code</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200">Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200">Name Required</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200">Description</th>
                </tr>
              </thead>
              <tbody>
                {mediums.map((m) => (
                  <tr key={m.id} className="border-b border-gray-200/50 dark:border-gray-600/50">
                    <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">{m.code}</td>
                    <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">{m.name}</td>
                    <td className="py-2 px-3 text-sm">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${m.name_required ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}>
                        {m.name_required ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-300">{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {role !== 'admin' && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My UTM Links</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Go to UTM Management to view and manage all links for your LC.</p>
              <a href="/dashboard/utm-manage" className="inline-block mt-3 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm">Open UTM Management</a>
            </div>
          )}
        </div>
      </div>

      <LoadingOverlay isVisible={creating} message="Creating UTM link..." />
    </div>
  );
}
