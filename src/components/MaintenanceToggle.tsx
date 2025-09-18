"use client";
import { useState, useEffect } from 'react';

export default function MaintenanceToggle() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkMaintenanceStatus();
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      const response = await fetch('/api/maintenance');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenanceMode);
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
    }
  };

  const toggleMaintenance = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: !maintenanceMode })
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenanceMode);
        setMessage(data.message);
        
        if (data.bypassUrl) {
          setMessage(`${data.message}. Bypass URL: ${window.location.origin}${data.bypassUrl}`);
        }
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error) {
      setMessage('Error updating maintenance mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Maintenance Mode
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {maintenanceMode 
              ? 'Website is currently in maintenance mode' 
              : 'Website is currently accessible to all users'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            maintenanceMode 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {maintenanceMode ? 'ON' : 'OFF'}
          </div>
          
          <button
            onClick={toggleMaintenance}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              maintenanceMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Updating...' : (maintenanceMode ? 'Disable' : 'Enable')}
          </button>
        </div>
      </div>
      
      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
