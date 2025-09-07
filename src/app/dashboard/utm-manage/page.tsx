"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import LoadingOverlay from "@/components/LoadingOverlay";
import UTMCampaignBuilderPage from "@/app/dashboard/utm-campaigns/builder/page";
import BaseUrlManager from "@/components/BaseUrlManager";

type UTMCampaign = {
  id: number;
  entity_id?: number | null;
  entity_name?: string | null;
  code: string;
  name: string;
  description: string;
  form_id: number;
  form_name?: string;
  created_at: string;
  updated_at: string;
};

type UTMSource = {
  id: number;
  code: string;
  name: string;
  description: string;
  platform: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type UTMMedium = {
  id: number;
  code: string;
  name: string;
  description: string;
  name_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TabType = 'campaigns' | 'sources' | 'mediums' | 'builder' | 'base-urls';

export default function UTMManagePage() {
  const [activeTab, setActiveTab] = useState<TabType>('campaigns');
  const [campaigns, setCampaigns] = useState<UTMCampaign[]>([]);
  const [sources, setSources] = useState<UTMSource[]>([]);
  const [mediums, setMediums] = useState<UTMMedium[]>([]);
  const [entities, setEntities] = useState<{ entity_id: number; name: string; type?: string }[]>([]);
  const [forms, setForms] = useState<{ id: number; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ type: TabType; id: number | null }>({ type: 'campaigns', id: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<number | ''>('');
  const [formFilter, setFormFilter] = useState<number | ''>('');

  // Bulk action states
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditFormId, setBulkEditFormId] = useState<number | ''>('');
  const [bulkEditing, setBulkEditing] = useState(false);

  // Tab-specific loading states
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [mediumsLoading, setMediumsLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    platform: '',
    name_required: false,
    entity_id: '',
    form_id: '',
    is_active: true
  });

  useEffect(() => {
    // Load all essential data initially (campaigns, sources, mediums, entities, forms)
    loadAllData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== '') {
        // Reset to page 1 when searching
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Monitor sources and mediums state, auto-reload if they become empty
  useEffect(() => {
    if (sources.length === 0 && !loading) {
      setTimeout(() => loadSourcesAndMediums(), 1000);
    }
  }, [sources.length, loading]);

  useEffect(() => {
    if (mediums.length === 0 && !loading) {
      setTimeout(() => loadSourcesAndMediums(), 1000);
    }
  }, [mediums.length, loading]);

  // Reload sources and mediums when switching tabs to ensure data is always available
  useEffect(() => {
    if (activeTab === 'sources' && sources.length === 0) {
      loadSourcesAndMediums();
    } else if (activeTab === 'mediums' && mediums.length === 0) {
      loadSourcesAndMediums();
    } else if (activeTab === 'campaigns' && (sources.length === 0 || mediums.length === 0)) {
      if (sources.length === 0 || mediums.length === 0) {
        loadSourcesAndMediums();
      }
    }
  }, [activeTab, sources.length, mediums.length]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      
      // Load all essential data in parallel
      const [campaignsRes, sourcesRes, mediumsRes, entitiesRes, formsRes] = await Promise.all([
        fetch('/api/utm/campaigns'),
        fetch('/api/utm/sources'),
        fetch('/api/utm/mediums'),
        fetch('/api/entities'),
        fetch('/api/forms')
      ]);

      // Handle campaigns data
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      }

      // Handle sources data
      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        setSources(Array.isArray(sourcesData) ? sourcesData : []);
      } else {
        console.error('UTM Manage - Failed to load sources:', sourcesRes.status, sourcesRes.statusText);
      }

      // Handle mediums data
      if (mediumsRes.ok) {
        const mediumsData = await mediumsRes.json();
        setMediums(Array.isArray(mediumsData) ? mediumsData : []);
      } else {
        console.error('UTM Manage - Failed to load mediums:', mediumsRes.status, mediumsRes.statusText);
      }

      // Handle entities data
      if (entitiesRes.ok) {
        const entData = await entitiesRes.json();
        const filteredEntities = Array.isArray(entData.items) ? entData.items.filter((e: any) => e.name.toLowerCase() !== 'organic') : [];
        setEntities(filteredEntities);
      }

      // Handle forms data
      if (formsRes.ok) {
        const formsData = await formsRes.json();
        const formsArray = Array.isArray(formsData.items) ? formsData.items : [];
        setForms(formsArray);
      }

    } catch (error) {
      console.error('UTM Manage - Error loading all data:', error);
      // Retry loading sources and mediums if they fail
      setTimeout(() => {
        loadSourcesAndMediums();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

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
        console.error('UTM Manage - Failed to retry load sources:', sourcesRes.status, sourcesRes.statusText);
      }

      if (mediumsRes.ok) {
        const mediumsData = await mediumsRes.json();
        const mediumsList = Array.isArray(mediumsData) ? mediumsData : [];
        setMediums(mediumsList);
      } else {
        console.error('UTM Manage - Failed to retry load mediums:', mediumsRes.status, mediumsRes.statusText);
      }
    } catch (error) {
      console.error('UTM Manage - Error retrying sources and mediums:', error);
    }
  };

  const loadData = async () => {
    // Set loading state for current tab
    if (activeTab === 'campaigns') {
      setCampaignsLoading(true);
    } else if (activeTab === 'sources') {
      setSourcesLoading(true);
    } else if (activeTab === 'mediums') {
      setMediumsLoading(true);
    }
    
    try {
      // Only load data needed for the current tab
      const promises = [];
      
      if (activeTab === 'campaigns') {
        promises.push(
          fetch('/api/utm/campaigns'),
          fetch('/api/entities'),
          fetch('/api/forms')
        );
      } else if (activeTab === 'sources') {
        promises.push(fetch('/api/utm/sources'));
      } else if (activeTab === 'mediums') {
        promises.push(fetch('/api/utm/mediums'));
      }

      const results = await Promise.all(promises);
      let resultIndex = 0;

      if (activeTab === 'campaigns') {
        // Handle campaigns data
        if (results[resultIndex]?.ok) {
          const campaignsData = await results[resultIndex].json();
          setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
        }
        resultIndex++;

        // Handle entities data
        if (results[resultIndex]?.ok) {
          const entData = await results[resultIndex].json();
          const filteredEntities = Array.isArray(entData.items) ? entData.items.filter((e: any) => e.name.toLowerCase() !== 'organic') : [];
          setEntities(filteredEntities);
        }
        resultIndex++;

        // Handle forms data
        if (results[resultIndex]?.ok) {
          const formsData = await results[resultIndex].json();
          const formsArray = Array.isArray(formsData.items) ? formsData.items : [];
          setForms(formsArray);
          
          if (formFilter === '') {
            setFormFilter('');
          }
        }
      } else if (activeTab === 'sources') {
        if (results[resultIndex]?.ok) {
          const sourcesData = await results[resultIndex].json();
          setSources(Array.isArray(sourcesData) ? sourcesData : []);
        }
      } else if (activeTab === 'mediums') {
        if (results[resultIndex]?.ok) {
          const mediumsData = await results[resultIndex].json();
          setMediums(Array.isArray(mediumsData) ? mediumsData : []);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      // Clear loading state for current tab
      if (activeTab === 'campaigns') {
        setCampaignsLoading(false);
      } else if (activeTab === 'sources') {
        setSourcesLoading(false);
      } else if (activeTab === 'mediums') {
        setMediumsLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      platform: '',
      name_required: false,
      entity_id: '',
      form_id: '',
      is_active: true
    });
    setEditing({ type: activeTab, id: null });
  };

  const handleEdit = (item: any) => {
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      platform: item.platform || '',
      name_required: item.name_required || false,
      entity_id: item.entity_id || '',
      form_id: item.form_id || '',
      is_active: item.is_active !== undefined ? item.is_active : true
    });
    setEditing({ type: activeTab, id: item.id });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Code and Name are required');
      return;
    }

    if (activeTab === 'campaigns' && !formData.entity_id) {
      alert('Entity is required for campaigns');
      return;
    }
    if (activeTab === 'campaigns' && !formData.form_id) {
      alert('Form is required for campaigns');
      return;
    }

    try {
      const endpoint = `/api/utm/${activeTab}`;
      const method = editing.id ? 'PUT' : 'POST';
      const body = editing.id 
        ? { ...formData, id: editing.id }
        : formData;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert(editing.id ? 'Updated successfully!' : 'Created successfully!');
        resetForm();
        await loadData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`/api/utm/${activeTab}/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Deleted successfully!');
        await loadData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Delete failed');
    }
  };

  // Bulk action handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentData = getCurrentData();
      setSelectedItems(currentData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleBulkEdit = async () => {
    if (!bulkEditFormId) {
      alert('Please select a Phase/Form');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Please select at least one campaign');
      return;
    }

    setBulkEditing(true);
    try {
      const promises = selectedItems.map(id => 
        fetch(`/api/utm/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form_id: Number(bulkEditFormId) })
        })
      );

      const results = await Promise.all(promises);
      const failedUpdates = results.filter(res => !res.ok);

      if (failedUpdates.length === 0) {
        alert(`Successfully updated ${selectedItems.length} campaign(s) to Phase ${forms.find(f => f.id === Number(bulkEditFormId))?.name}`);
        setShowBulkEditModal(false);
        setSelectedItems([]);
        setBulkEditFormId('');
        await loadData();
      } else {
        alert(`Failed to update ${failedUpdates.length} campaign(s). Please try again.`);
      }
    } catch (error) {
      console.error('Error bulk updating campaigns:', error);
      alert('Bulk update failed');
    } finally {
      setBulkEditing(false);
    }
  };

  const resetBulkEdit = () => {
    setShowBulkEditModal(false);
    setBulkEditFormId('');
    setSelectedItems([]);
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'campaigns': {
        const q = search.trim().toLowerCase();
        return campaigns.filter((c) => {
          const matchesSearch = q ? (
            (c.code || '').toLowerCase().includes(q) ||
            (c.name || '').toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q)
          ) : true;
          const matchesEntity = entityFilter ? c.entity_id === Number(entityFilter) : true;
          const matchesForm = formFilter ? c.form_id === Number(formFilter) : true;
          return matchesSearch && matchesEntity && matchesForm;
        });
      }
      case 'sources': return sources;
      case 'mediums': return mediums;
      default: return [];
    }
  };

  const getColumns = () => {
    switch (activeTab) {
      case 'campaigns':
        return [
          { key: 'entity_name', label: 'Entity Code' },
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'description', label: 'Description' }
        ];
      case 'sources':
        return [
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'platform', label: 'Platform' },
          { key: 'description', label: 'Description' },
          { key: 'is_active', label: 'Status' }
        ];
      case 'mediums':
        return [
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'name_required', label: 'Name Required' },
          { key: 'description', label: 'Description' },
          { key: 'is_active', label: 'Status' }
        ];
      default:
        return [];
    }
  };

  const renderTableCell = (item: any, column: { key: string; label: string }) => {
    switch (column.key) {
      case 'entity_name':
        return (
          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            {item.entity_name || (item.entity_id ? `Entity ${item.entity_id}` : '-')}
          </td>
        );
      case 'code':
        return (
          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
            {item.code}
          </td>
        );
      case 'name':
        return (
          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
            {item.name}
          </td>
        );
      case 'platform':
        return (
          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            {item.platform}
          </td>
        );
      case 'name_required':
        return (
          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              item.name_required
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {item.name_required ? 'Yes' : 'No'}
            </span>
          </td>
        );
      case 'description':
        return (
          <td key={column.key} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
            {item.description}
          </td>
        );
      case 'is_active':
        return (
          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              item.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {item.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
        );
      default:
        return null;
    }
  };

  const isCurrentTabLoading = 
    (activeTab === 'campaigns' && campaignsLoading) ||
    (activeTab === 'sources' && sourcesLoading) ||
    (activeTab === 'mediums' && mediumsLoading);

  if (isCurrentTabLoading) {
    return (
      <div className="relative min-h-[400px]">
        {/* Custom loading overlay for this section */}
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20 max-w-md w-full mx-4">
            <div className="flex flex-col items-center space-y-6">
              {/* Loading animation */}
              <div className="relative w-24 h-24">
                <Image
                  src="/giphy.gif"
                  alt="Loading animation"
                  fill
                  className="object-contain rounded-lg"
                  priority
                />
              </div>

              {/* Loading text */}
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Loading UTM Management...
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please wait while we fetch the data...
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Placeholder content to maintain layout */}
        <div className="opacity-0">
          <div className="p-6 space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
              <div className="lg:col-span-2 h-64 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">UTM Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage UTM campaigns, sources, and mediums for tracking links.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(sources.length === 0 || mediums.length === 0) && (
              <button
                onClick={() => loadSourcesAndMediums()}
                className="px-3 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-lg font-medium transition-colors"
              >
                🔄 Reload Sources/Mediums
              </button>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              <div>Sources: <span className={sources.length === 0 ? 'text-red-500' : 'text-green-500'}>{sources.length}</span></div>
              <div>Mediums: <span className={mediums.length === 0 ? 'text-red-500' : 'text-green-500'}>{mediums.length}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'campaigns', label: 'Campaigns' },
            { id: 'sources', label: 'Sources' },
            { id: 'mediums', label: 'Mediums' },
            { id: 'builder', label: 'Campaign Builder' },
            { id: 'base-urls', label: 'Base URLs' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setPage(1);
                resetForm();
                setSelectedItems([]);
                // Load data for the new tab if not already loaded
                if (tab.id === 'campaigns' && campaigns.length === 0) {
                  loadData();
                } else if (tab.id === 'sources' && sources.length === 0) {
                  loadData();
                } else if (tab.id === 'mediums' && mediums.length === 0) {
                  loadData();
                }
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'builder' ? (
        <UTMCampaignBuilderPage />
      ) : activeTab === 'base-urls' ? (
        <BaseUrlManager />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editing.id ? `Edit ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    required
                  />
                </div>

                {activeTab === 'campaigns' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Entity *
                      </label>
                      <select
                        value={formData.entity_id}
                        onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Entity</option>
                        {entities.map((ent) => (
                          <option key={ent.entity_id} value={ent.entity_id}>
                            {ent.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Phase (Form) *
                      </label>
                      <select
                        value={formData.form_id}
                        onChange={(e) => setFormData({ ...formData, form_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Phase</option>
                        {forms.map((form) => (
                          <option key={form.id} value={form.id}>
                            {form.name.replace('oGV', 'Phase').replace('Submissions', '')}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Select the form/phase this campaign will use for data collection
                      </p>
                    </div>
                  </>
                )}

                {activeTab === 'sources' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Platform
                    </label>
                    <input
                      type="text"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                )}

                {activeTab === 'mediums' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="name_required"
                      checked={formData.name_required}
                      onChange={(e) => setFormData({ ...formData, name_required: e.target.checked })}
                      className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                    />
                    <label htmlFor="name_required" className="ml-2 block text-sm text-gray-700 dark:text-gray-200">
                      Name Required
                    </label>
                  </div>
                )}

                {(activeTab === 'sources' || activeTab === 'mediums') && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-200">
                      Active
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>



                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {editing.id ? 'Update' : 'Create'}
                  </button>
                  {editing.id && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Data Table */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 justify-between flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h2>
                                    {activeTab === 'campaigns' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Filter campaigns by entity and phase/form
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          value={search}
                          onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectedItems([]); }}
                          placeholder="Search campaigns"
                          className="h-9 px-3 rounded-md ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white"
                        />
                        <select
                          value={entityFilter}
                          onChange={(e) => { setEntityFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); setSelectedItems([]); }}
                          className="h-9 px-3 rounded-md ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white"
                        >
                          <option value="">All LC</option>
                          {entities.map((ent) => {
                            return (
                              <option key={ent.entity_id} value={ent.entity_id}>{ent.name}</option>
                            );
                          })}
                        </select>
                        <select
                          value={formFilter}
                          onChange={(e) => { setFormFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); setSelectedItems([]); }}
                          className="h-9 px-3 rounded-md ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white"
                        >
                          <option value="">All Phase (Show All)</option>
                          {forms.map((form) => (
                            <option key={form.id} value={form.id}>{form.name.replace('oGV', 'Phase').replace('Submissions', '')}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Bulk Actions */}
                      {selectedItems.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedItems.length} campaign(s) selected
                          </span>
                          <button
                            onClick={() => setShowBulkEditModal(true)}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded-md transition-colors"
                          >
                            Bulk Edit Phase
                          </button>
                          <button
                            onClick={() => setSelectedItems([])}
                            className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
                          >
                            Clear Selection
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto thin-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {activeTab === 'campaigns' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedItems.length > 0 && selectedItems.length === getCurrentData().length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                          />
                        </th>
                      )}
                      {getColumns().map((column) => (
                        <th
                          key={column.key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {column.label}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      const data = getCurrentData();
                      const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
                      const currentPage = Math.min(page, totalPages);
                      const start = (currentPage - 1) * pageSize;
                      const end = start + pageSize;
                      return data.slice(start, end);
                                         })().map((item: any) => (
                       <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                         {activeTab === 'campaigns' && (
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                             <input
                               type="checkbox"
                               checked={selectedItems.includes(item.id)}
                               onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                               className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                             />
                           </td>
                         )}
                         {getColumns().map((column) => renderTableCell(item, column))}
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <div className="flex justify-end space-x-2">
                             <button
                               onClick={() => handleEdit(item)}
                               className="text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
                             >
                               Edit
                             </button>
                             <button
                               onClick={() => handleDelete(item.id)}
                               className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                             >
                               Delete
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <span>Rows per page</span>
                  <select
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {[10, 20, 50, 100, 500].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const data = getCurrentData();
                  const total = data.length;
                  const totalPages = Math.max(1, Math.ceil(total / pageSize));
                  const currentPage = Math.min(page, totalPages);
                  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
                  const end = Math.min(currentPage * pageSize, total);
                  return (
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {start}-{end} of {total}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                        >
                          Prev
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Page {currentPage} / {totalPages}</span>
                        <button
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bulk Edit Phase
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You are about to change the Phase/Form for {selectedItems.length} selected campaign(s).
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                New Phase/Form *
              </label>
              <select
                value={bulkEditFormId}
                onChange={(e) => setBulkEditFormId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                required
              >
                <option value="">Select Phase</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name.replace('oGV', 'Phase').replace('Submissions', '')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkEdit}
                disabled={!bulkEditFormId || bulkEditing}
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {bulkEditing ? 'Updating...' : 'Update All'}
              </button>
              <button
                onClick={resetBulkEdit}
                disabled={bulkEditing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
