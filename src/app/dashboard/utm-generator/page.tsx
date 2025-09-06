"use client";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";

type Entity = {
  entity_id: number;
  name: string;
  type: string;
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
  shortened_url: string | null;
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
  const searchParams = useSearchParams();
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
  const [selectedForm, setSelectedForm] = useState<number | "all">("all");
  const [utmName, setUtmName] = useState("");
  const [selectedMediumData, setSelectedMediumData] = useState<UTMMedium | null>(null);
  const [availableForms, setAvailableForms] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [shorteningUrls, setShorteningUrls] = useState<Set<number>>(new Set());
  const [editingAlias, setEditingAlias] = useState<number | null>(null);
  const [aliasInput, setAliasInput] = useState<string>('');
  const [updatingAlias, setUpdatingAlias] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Toast function
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadData(); 
  }, [searchParams]);

  // Debug: Log state changes
  useEffect(() => {
    // If sources become empty unexpectedly, try to reload
    if (sources.length === 0 && !loading) {
      setTimeout(() => loadSourcesAndMediums(), 1000);
    }
  }, [sources, loading]);

  useEffect(() => {
    // If mediums become empty unexpectedly, try to reload
    if (mediums.length === 0 && !loading) {
      setTimeout(() => loadSourcesAndMediums(), 1000);
    }
  }, [mediums, loading]);

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

  // Reset form selection when entity changes
  useEffect(() => {
    setSelectedForm("all");
  }, [selectedEntity]);


  // Load active campaign for the selected entity and form
  useEffect(() => {
    const loadActiveForEntity = async () => {
      if (!selectedEntity) { return; }
      try {
        setActiveLoading(true);
        let url = `/api/utm/campaigns/active?entity_id=${selectedEntity}`;
        if (selectedForm !== "all") {
          url += `&form_id=${selectedForm}`;
        }
        const res = await fetch(url);
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
  }, [selectedEntity, selectedForm]);

  useEffect(() => {
    if (activeTab === 'links') {
      void loadLinks(1);
    }
  }, [activeTab]);

  // Reload sources and mediums when switching to create tab to ensure data is available
  useEffect(() => {
    if (activeTab === 'create' && (sources.length === 0 || mediums.length === 0)) {
      if (sources.length === 0) {
        loadSourcesAndMediums();
      }
    }
  }, [activeTab, sources.length, mediums.length]);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Close all dropdown menus if click is outside any dropdown
      document.querySelectorAll('[id^="menu-"]').forEach(menu => {
        if (!menu.contains(target) && !target.closest('.dropdown-menu')) {
          menu.classList.add('hidden');
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const buildCampaignString = (blocks: CampaignBlock[] | null, entityId: number | ""): string => {
    if (!blocks || blocks.length === 0) return activeCampaign?.code || "";
    const entity = typeof entityId === "number" ? entities.find(e => e.entity_id === entityId) : null;
    return blocks
      .map(b => (b.type === "text" ? b.value : (entity ? entity.name : String(entityId || ""))))
      .join("");
  };

  const activeCampaignString = useMemo(() => buildCampaignString(activeCampaign?.format_blocks || null, selectedEntity), [activeCampaign, entities, selectedEntity]);

  // Filter entities (all types except organic)
  const filteredEntities = useMemo(() => {
    if (role !== 'admin') {
      // Non-admin users: only show local entities (excluding organic)
      return entities.filter((e: any) => e.type === 'local' && e.name.toLowerCase() !== 'organic');
    }
    
    // Admin users: show all entities (local + national, excluding organic)
    return entities.filter((e: any) => e.name.toLowerCase() !== 'organic');
  }, [entities, role]);

  const loadSourcesAndMediums = async () => {
    try {
      const [sourcesRes, mediumsRes] = await Promise.all([
        fetch('/api/utm/sources'),
        fetch('/api/utm/mediums')
      ]);

      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        const sourcesList = Array.isArray(sourcesData) ? sourcesData : [];
        setSources(sourcesList);
      } else {
        console.error('Failed to retry load sources:', sourcesRes.status, sourcesRes.statusText);
      }

      if (mediumsRes.ok) {
        const mediumsData = await mediumsRes.json();
        const mediumsList = Array.isArray(mediumsData) ? mediumsData : [];
        setMediums(mediumsList);
      } else {
        console.error('Failed to retry load mediums:', mediumsRes.status, mediumsRes.statusText);
      }
    } catch (error) {
      console.error('Error retrying sources and mediums:', error);
    }
  };

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
          setSelectedForm("all"); // Reset form selection for non-admin users
        }
      }

      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json();
        // Store all entities for filtering
        const allEntities = Array.isArray(entitiesData.items) ? entitiesData.items : [];
        setEntities(allEntities);
      }

      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        const sourcesList = Array.isArray(sourcesData) ? sourcesData : [];
        setSources(sourcesList);
      } else {
        console.error('Failed to load sources:', sourcesRes.status, sourcesRes.statusText);
      }

      if (mediumsRes.ok) {
        const mediumsData = await mediumsRes.json();
        const mediumsList = Array.isArray(mediumsData) ? mediumsData : [];
        setMediums(mediumsList);
      } else {
        console.error('Failed to load mediums:', mediumsRes.status, mediumsRes.statusText);
      }

      if (activeRes.ok) {
        const { active } = await activeRes.json();
        setActiveCampaign(active || null);
      }
      // Determine type from query param; default oGV
      const typeParam = searchParams.get('type');
      const formType = typeParam === 'TMR' ? 'TMR' : 'oGV';
      
      const formsRes = await fetch(`/api/forms?type=${encodeURIComponent(formType)}&limit=100`);
      if (formsRes.ok) {
        const formsData = await formsRes.json();
        const formsList = Array.isArray(formsData.items) ? formsData.items : [];
        setAvailableForms(formsList);
      } else {
        console.error('Failed to load forms:', formsRes.status, formsRes.statusText);
      }

      setActiveLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      // Retry loading sources and mediums if they fail
      setTimeout(() => {
        loadSourcesAndMediums();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async (page: number) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const typeParam = searchParams.get('type');
      if (typeParam && (typeParam === 'TMR' || typeParam === 'oGV' || typeParam === 'EWA')) {
        params.set('type', typeParam);
      }
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
        setSelectedForm("all");
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
    try { 
      await navigator.clipboard.writeText(text); 
      showToast('URL copied to clipboard!', 'success'); 
    } catch {
      showToast('Failed to copy URL', 'error');
    }
  };

  const shortenUrl = async (linkId: number, url: string) => {
    setShorteningUrls(prev => new Set(prev).add(linkId));
    
    try {
      const response = await fetch('/api/url-shortener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Save shortened URL to database
        const updateResponse = await fetch(`/api/utm/links/${linkId}/shorten`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            shortenedUrl: data.shortenedUrl,
            shortIoId: data.shortIoId || data.id
          })
        });

        if (updateResponse.ok) {
          // Reload links to get updated data
          if (pagination) {
            loadLinks(pagination.page);
          }
          showToast('URL shortened successfully!', 'success');
        } else {
          showToast('URL shortened but failed to save to database', 'error');
        }
      } else {
        const errorData = await response.json();
        showToast(`Failed to shorten URL: ${errorData.error}`, 'error');
      }
    } catch (error) {
      console.error('Error shortening URL:', error);
      showToast('Failed to shorten URL', 'error');
    } finally {
      setShorteningUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(linkId);
        return newSet;
      });
    }
  };

  const handlePageChange = (page: number) => { if (pagination) loadLinks(page); };

  const handleUpdateAlias = async (linkId: number) => {
    if (!aliasInput.trim()) {
      showToast('Please enter an alias', 'error');
      return;
    }

    setUpdatingAlias(prev => new Set(prev).add(linkId));

    try {
      const response = await fetch(`/api/utm/links/${linkId}/update-alias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: aliasInput.trim() })
      });

      if (response.ok) {
        // Reload links to get updated data
        if (pagination) {
          loadLinks(pagination.page);
        }
        setEditingAlias(null);
        setAliasInput('');
        showToast('Alias updated successfully!', 'success');
      } else {
        const errorData = await response.json();
        showToast(`Failed to update alias: ${errorData.error}`, 'error');
      }
    } catch (error) {
      console.error('Error updating alias:', error);
      showToast('Failed to update alias', 'error');
    } finally {
      setUpdatingAlias(prev => {
        const newSet = new Set(prev);
        newSet.delete(linkId);
        return newSet;
      });
    }
  };

  const startEditAlias = (linkId: number, currentUrl: string) => {
    // Extract current alias from URL if exists
    const url = new URL(currentUrl);
    const currentAlias = url.pathname.substring(1); // Remove leading slash
    setAliasInput(currentAlias || '');
    setEditingAlias(linkId);
  };




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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Entity Name *</label>
              <select value={selectedEntity.toString()} onChange={(e) => setSelectedEntity(e.target.value ? Number(e.target.value) : "")} disabled={role !== 'admin'} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all disabled:opacity-60" required>
                <option value="">Select Entity</option>
                {filteredEntities.map((entity) => (
                  <option key={entity.entity_id} value={entity.entity_id}>
                    {entity.name} {entity.type === 'national' ? '(National)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Phase/Form *</label>
              <select value={selectedForm} onChange={(e) => setSelectedForm(e.target.value === "all" ? "all" : Number(e.target.value))} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" required>
                <option value="all">All Phases</option>
                {availableForms.map((form) => (<option key={form.id} value={form.id}>{form.name.replace('oGV', 'Phase').replace('Submissions', '')}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">UTM Source *</label>
              <select value={selectedSource.toString()} onChange={(e) => setSelectedSource(e.target.value ? Number(e.target.value) : "")} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" required disabled={sources.length === 0}>
                <option value="">{sources.length === 0 ? 'Loading sources...' : 'Select Source'}</option>
                {sources.map((source) => (<option key={source.id} value={source.id}>{source.name} ({source.platform})</option>))}
              </select>
              {sources.length === 0 && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Loading UTM sources...</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">UTM Medium *</label>
              <select value={selectedMedium.toString()} onChange={(e) => setSelectedMedium(e.target.value ? Number(e.target.value) : "")} className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all" required disabled={mediums.length === 0}>
                <option value="">{mediums.length === 0 ? 'Loading mediums...' : 'Select Medium'}</option>
                {mediums.map((medium) => (<option key={medium.id} value={medium.id}>{medium.name} {medium.name_required ? '(Name Required)' : ''}</option>))}
              </select>
              {mediums.length === 0 && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Loading UTM mediums...</p>}
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
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Shortened Link</th>
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
                        <div 
                          className="max-w-xs truncate text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                          onClick={() => copyToClipboard(utmUrl)}
                          title="Click to copy"
                        >
                          {utmUrl}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {(() => {
                          const shortenedUrl = link.shortened_url;
                          const isShortening = shorteningUrls.has(link.id);
                          return shortenedUrl ? (
                            editingAlias === link.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={aliasInput}
                                  onChange={(e) => setAliasInput(e.target.value)}
                                  placeholder="Enter alias"
                                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateAlias(link.id);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleUpdateAlias(link.id)}
                                  disabled={updatingAlias.has(link.id)}
                                  className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {updatingAlias.has(link.id) && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>}
                                  {updatingAlias.has(link.id) ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingAlias(null);
                                    setAliasInput('');
                                  }}
                                  className="px-2 py-1 text-xs rounded bg-gray-500 text-white hover:bg-gray-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="max-w-xs truncate text-green-600 dark:text-green-400 cursor-pointer hover:underline"
                                  onClick={() => copyToClipboard(shortenedUrl)}
                                  title="Click to copy"
                                >
                                  {shortenedUrl}
                                </div>
                                <button
                                  onClick={() => startEditAlias(link.id, shortenedUrl)}
                                  className="px-1 py-1 text-xs rounded bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300"
                                  title="Edit alias"
                                >
                                  ✏️
                                </button>
                              </div>
                            )
                          ) : (
                            <button 
                              onClick={() => shortenUrl(link.id, utmUrl)}
                              disabled={isShortening}
                              className="px-2 py-1 text-xs rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {isShortening && <div className="w-3 h-3 border border-green-700 border-t-transparent rounded-full animate-spin"></div>}
                              {isShortening ? 'Shortening...' : 'Shorten'}
                            </button>
                          );
                        })()}
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
            <div className="flex items-center gap-4">
              {pagination && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
              )}
            </div>
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
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Shortened Link</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Created</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map(link => {
                      const utmUrl = generateUTMUrl(link);
                      const shortenedUrl = link.shortened_url;
                      const isShortening = shorteningUrls.has(link.id);
                      return (
                        <tr key={link.id} className="border-b border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-50/50 dark:hover:bg-gray-600/50">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.entity_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.campaign_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.source_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.medium_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{link.utm_name || '-'}</td>
                          <td className="py-3 px-4 text-sm">
                            <div 
                              className="max-w-xs truncate text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                              onClick={() => copyToClipboard(utmUrl)}
                              title="Click to copy"
                            >
                              {utmUrl}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {shortenedUrl ? (
                              editingAlias === link.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={aliasInput}
                                    onChange={(e) => setAliasInput(e.target.value)}
                                    placeholder="Enter alias"
                                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateAlias(link.id);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => handleUpdateAlias(link.id)}
                                    disabled={updatingAlias.has(link.id)}
                                    className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                    {updatingAlias.has(link.id) && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>}
                                    {updatingAlias.has(link.id) ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingAlias(null);
                                      setAliasInput('');
                                    }}
                                    className="px-2 py-1 text-xs rounded bg-gray-500 text-white hover:bg-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="max-w-xs truncate text-green-600 dark:text-green-400 cursor-pointer hover:underline"
                                    onClick={() => copyToClipboard(shortenedUrl)}
                                    title="Click to copy"
                                  >
                                    {shortenedUrl}
                                  </div>
                                  <button
                                    onClick={() => startEditAlias(link.id, shortenedUrl)}
                                    className="px-1 py-1 text-xs rounded bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300"
                                    title="Edit alias"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              )
                            ) : (
                              <button
                                onClick={() => shortenUrl(link.id, utmUrl)}
                                disabled={isShortening}
                                className="px-2 py-1 text-xs rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isShortening ? 'Shortening...' : 'Shorten'}
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{new Date(link.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="relative">
                              <button
                                onClick={() => {
                                  // Close all other menus first
                                  document.querySelectorAll('[id^="menu-"]').forEach(otherMenu => {
                                    if (otherMenu.id !== `menu-${link.id}`) {
                                      otherMenu.classList.add('hidden');
                                    }
                                  });
                                  
                                  const menu = document.getElementById(`menu-${link.id}`);
                                  if (menu) {
                                    menu.classList.toggle('hidden');
                                  }
                                }}
                                className="dropdown-menu p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              <div
                                id={`menu-${link.id}`}
                                className="dropdown-menu hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10"
                              >
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      copyToClipboard(utmUrl);
                                      // Close menu after action
                                      const menu = document.getElementById(`menu-${link.id}`);
                                      if (menu) {
                                        menu.classList.add('hidden');
                                      }
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    Copy Original URL
                                  </button>
                                  {shortenedUrl && (
                                    <button
                                      onClick={() => {
                                        copyToClipboard(shortenedUrl);
                                        // Close menu after action
                                        const menu = document.getElementById(`menu-${link.id}`);
                                        if (menu) {
                                          menu.classList.add('hidden');
                                        }
                                      }}
                                      className="block w-full text-left px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                    >
                                      Copy Shortened URL
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      handleDeleteLink(link.id);
                                      // Close menu after action
                                      const menu = document.getElementById(`menu-${link.id}`);
                                      if (menu) {
                                        menu.classList.add('hidden');
                                      }
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
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

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? '✅' : '❌'}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <LoadingOverlay isVisible={creating} message="Creating UTM link..." />
    </div>
  );
}
