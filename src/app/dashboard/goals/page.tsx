'use client';

import { useState } from 'react';
import GoalsManager from '../users/GoalsManager';

type TabType = 'sus' | 'msus';

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sus');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals Management</h1>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('sus')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'sus'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Goal SUs
              </button>
              <button
                onClick={() => setActiveTab('msus')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'msus'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Goal MSUs
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'sus' ? (
            <GoalsManager goalType="sus" />
          ) : (
            <GoalsManager goalType="msus" />
          )}
        </div>
      </div>
    </div>
  );
}
