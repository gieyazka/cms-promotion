'use client';

import { useEffect, useState } from 'react';
import { Promotion } from '@/types/promotion';

export default function Home() {
  const [stats, setStats] = useState({ total: 0, active: 0, drafts: 0 });

  useEffect(() => {
    fetch('/api/promotions')
      .then((res) => res.json())
      .then((data: Promotion[]) => {
        const total = data.length;
        const active = data.filter(p => p.status === 'active').length;
        const drafts = data.filter(p => p.status === 'draft').length;
        setStats({ total, active, drafts });
      })
      .catch(console.error);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Promotions</h2>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Active</h2>
          <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Drafts</h2>
          <p className="text-3xl font-bold mt-2 text-gray-400 dark:text-gray-500">{stats.drafts}</p>
        </div>
      </div>
    </div>
  );
}
