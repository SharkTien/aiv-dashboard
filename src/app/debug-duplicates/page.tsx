"use client";
import { useState, useEffect } from 'react';

export default function DebugDuplicatesPage() {
  const [formId, setFormId] = useState('29');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkDuplicates = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/debug/duplicate-check?formId=${formId}`);
      const data = await response.json();
      
      if (data.success) {
        setResult(data.analysis);
      } else {
        setError(data.error || 'Failed to check duplicates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const recheckDuplicates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debug/recheck-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: parseInt(formId) })
      });
      const data = await response.json();
      
      if (data.success) {
        setResult(data.details);
        alert(`Recheck completed: ${data.message}`);
      } else {
        setError(data.error || 'Failed to recheck duplicates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Duplicate Detection Debug</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Form ID:
        </label>
        <input
          type="number"
          value={formId}
          onChange={(e) => setFormId(e.target.value)}
          className="border rounded px-3 py-2 w-32"
        />
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={checkDuplicates}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Duplicates'}
        </button>
        
        <button
          onClick={recheckDuplicates}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Rechecking...' : 'Recheck Duplicates'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ Error: {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">📊 Summary</h2>
            <p><strong>Total Submissions:</strong> {result.totalSubmissions}</p>
            <p><strong>Duplicated Submissions:</strong> {result.duplicatedSubmissions}</p>
            <p><strong>Duplicate Settings:</strong> {result.duplicateSettings?.length || 0} fields configured</p>
          </div>

          {result.duplicateSettings && result.duplicateSettings.length > 0 && (
            <div className="bg-blue-100 p-4 rounded">
              <h2 className="text-lg font-semibold mb-2">⚙️ Duplicate Settings</h2>
              <ul className="list-disc list-inside">
                {result.duplicateSettings.map((setting: any, index: number) => (
                  <li key={index}>
                    {setting.field_label} ({setting.field_name})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.duplicateSettings && result.duplicateSettings.length === 0 && (
            <div className="bg-yellow-100 p-4 rounded">
              <h2 className="text-lg font-semibold mb-2">⚠️ No Duplicate Settings</h2>
              <p>No duplicate detection fields configured. Go to Form Builder → Duplicate Settings to configure.</p>
            </div>
          )}

          {result.potentialDuplicates && result.potentialDuplicates.length > 0 && (
            <div className="bg-orange-100 p-4 rounded">
              <h2 className="text-lg font-semibold mb-2">🔍 Potential Duplicates Found</h2>
              <div className="space-y-2">
                {result.potentialDuplicates.map((group: any, index: number) => (
                  <div key={index} className="border border-orange-300 p-3 rounded">
                    <p><strong>Group {index + 1}:</strong> {group.key}</p>
                    <p><strong>Count:</strong> {group.totalCount} submissions</p>
                    <div className="mt-2">
                      <strong>Submissions:</strong>
                      <ul className="list-disc list-inside ml-4">
                        {group.submissions.map((sub: any, subIndex: number) => (
                          <li key={subIndex}>
                            ID: {sub.id}, Time: {sub.timestamp}, 
                            Duplicated: {sub.duplicated ? '✅' : '❌'}, 
                            Entity: {sub.entity_name || 'N/A'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.potentialDuplicates && result.potentialDuplicates.length === 0 && (
            <div className="bg-green-100 p-4 rounded">
              <h2 className="text-lg font-semibold mb-2">✅ No Duplicates Found</h2>
              <p>All submissions have unique values in the configured duplicate detection fields.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
