"use client";
import { useState, useEffect } from 'react';

export default function SimpleMaintenancePage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/toggle-maintenance');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenanceMode);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const toggleMaintenance = async (action: 'enable' | 'disable') => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/toggle-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenanceMode);
        setMessage(data.message);
      } else {
        setMessage('Error updating maintenance mode');
      }
    } catch (error) {
      setMessage('Error updating maintenance mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Maintenance Control
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Simple maintenance mode toggle
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${
              maintenanceMode 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                maintenanceMode ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
              {maintenanceMode ? 'MAINTENANCE ON' : 'MAINTENANCE OFF'}
            </div>

            <div className="space-y-4">
              <button
                onClick={() => toggleMaintenance('enable')}
                disabled={loading || maintenanceMode}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : '🔧 ENABLE Maintenance'}
              </button>

              <button
                onClick={() => toggleMaintenance('disable')}
                disabled={loading || !maintenanceMode}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : '✅ DISABLE Maintenance'}
              </button>
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                message.includes('Error') 
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {message}
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
              <p>• Enable: Shows maintenance page to all users</p>
              <p>• Disable: Website accessible normally</p>
              <p>• Changes take effect immediately</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
