'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function DebugAPI() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/orgs/debug/');
      console.log('Debug response:', response.data);
      setDebugInfo(response.data);
    } catch (err: any) {
      console.error('Debug error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch debug info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        API Debug Information
      </h2>
      
      <button
        onClick={fetchDebugInfo}
        disabled={loading}
        className="mb-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading...' : 'Fetch Debug Info'}
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {debugInfo && (
        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">User Information</h3>
            <pre className="text-sm overflow-x-auto text-gray-700 dark:text-gray-300">
              {JSON.stringify(debugInfo.user, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
              Organizations ({debugInfo.stats?.user_organizations_count || 0})
            </h3>
            <pre className="text-sm overflow-x-auto text-gray-700 dark:text-gray-300">
              {JSON.stringify(debugInfo.organizations, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Database Statistics</h3>
            <pre className="text-sm overflow-x-auto text-gray-700 dark:text-gray-300">
              {JSON.stringify(debugInfo.stats, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Authentication Status</h3>
            <pre className="text-sm overflow-x-auto text-gray-700 dark:text-gray-300">
              {JSON.stringify(debugInfo.authentication, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
