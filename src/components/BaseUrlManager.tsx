"use client";
import { useState, useEffect } from "react";

type BaseUrls = {
  oGV: string;
  TMR: string;
};

export default function BaseUrlManager() {
  const [baseUrls, setBaseUrls] = useState<BaseUrls>({
    oGV: "https://www.aiesec.vn/globalvolunteer/home",
    TMR: "https://www.aiesec.vn/join-aiesec-fall-2025"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadBaseUrls();
  }, []);

  const loadBaseUrls = async () => {
    try {
      const response = await fetch('/api/utm/base-urls');
      if (response.ok) {
        const data = await response.json();
        setBaseUrls(data);
      } else {
        console.error('Failed to load base URLs');
      }
    } catch (error) {
      console.error('Error loading base URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (hubType: 'oGV' | 'TMR') => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/utm/base-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hub_type: hubType,
          base_url: baseUrls[hubType]
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `${hubType} base URL updated successfully!` });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to update base URL' });
      }
    } catch (error) {
      console.error('Error saving base URL:', error);
      setMessage({ type: 'error', text: 'Failed to update base URL' });
    } finally {
      setSaving(false);
    }
  };

  const handleUrlChange = (hubType: 'oGV' | 'TMR', value: string) => {
    setBaseUrls(prev => ({
      ...prev,
      [hubType]: value
    }));
  };

  const resetToDefault = (hubType: 'oGV' | 'TMR') => {
    const defaultUrls = {
      oGV: "https://www.aiesec.vn/globalvolunteer/home",
      TMR: "https://www.aiesec.vn/join-aiesec-fall-2025"
    };
    setBaseUrls(prev => ({
      ...prev,
      [hubType]: defaultUrls[hubType]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading base URLs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Base URL Configuration
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure the base URLs used when generating UTM links for different hub types.
        </p>

        {/* oGV Configuration */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              oGV Hub Base URL
            </label>
            <button
              onClick={() => resetToDefault('oGV')}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Reset to default
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={baseUrls.oGV}
              onChange={(e) => handleUrlChange('oGV', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="https://www.aiesec.vn/globalvolunteer/home"
            />
            <button
              onClick={() => handleSave('oGV')}
              disabled={saving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Used when creating UTM links from oGV Hub → UTM Generator
          </p>
        </div>

        {/* TMR Configuration */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              TMR Hub Base URL
            </label>
            <button
              onClick={() => resetToDefault('TMR')}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Reset to default
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={baseUrls.TMR}
              onChange={(e) => handleUrlChange('TMR', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="https://www.aiesec.vn/join-aiesec-fall-2025"
            />
            <button
              onClick={() => handleSave('TMR')}
              disabled={saving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Used when creating UTM links from TMR Hub → UTM Generator
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? '✅' : '❌'}
              <span className="ml-2 text-sm font-medium">{message.text}</span>
            </div>
          </div>
        )}
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          How Base URLs Work
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• When users create UTM links from oGV Hub, the oGV base URL is used</li>
          <li>• When users create UTM links from TMR Hub, the TMR base URL is used</li>
          <li>• UTM parameters (source, medium, campaign, name) are automatically appended</li>
          <li>• Changes take effect immediately for new UTM link generation</li>
        </ul>
      </div>
    </div>
  );
}
