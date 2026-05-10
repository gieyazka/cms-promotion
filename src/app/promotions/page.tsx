'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Calendar, ChevronRight, Search, Filter, MoreVertical, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Promotion } from '@/types/promotion';

export default function PromotionsList() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    fetch('/api/promotions')
      .then((res) => res.json())
      .then((data) => {
        const sortedData = Array.isArray(data) ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
        setPromotions(sortedData);
        setFilteredPromotions(sortedData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching promotions:', err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = promotions;
    if (searchQuery) {
      result = result.filter(p => 
        (p.title_th?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.title_en?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    setFilteredPromotions(result);
  }, [searchQuery, statusFilter, promotions]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Promotions</h1>
          <p className="text-gray-500 mt-1">Manage and publish your marketing content</p>
        </div>
        <Link
          href="/promotions/new"
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold"
        >
          <Plus size={20} />
          <span>New Promotion</span>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search promotions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              All
            </button>
            <button 
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'active' ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setStatusFilter('draft')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'draft' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Drafts
            </button>
          </div>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-2 hidden md:block" />
          
          <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400'}`}><ListIcon size={18} /></button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading promotions...</p>
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl py-20 text-center">
          <div className="bg-gray-50 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="text-gray-300 dark:text-gray-600" size={40} />
          </div>
          <p className="text-gray-500 text-lg mb-6">No promotions found.</p>
          <Link href="/promotions/new" className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-2.5 rounded-xl font-bold">
            Create Promotion
          </Link>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredPromotions.map((promo) => (
            <Link 
              key={promo.id} 
              href={`/promotions/${promo.id}`} 
              className={`block group transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1' 
                  : 'bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-900 flex items-center justify-between'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${promo.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{promo.status}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                  {promo.title_th || promo.title_en}
                </h3>
                <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                  <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    <Calendar size={12} className="mr-1" />
                    {promo.dateConfig ? (promo.dateConfig.type === 'range' ? 'Range' : promo.dateConfig.type) : 'No Date'}
                  </div>
                  <span className="text-xs italic">
                    Added {new Date(promo.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {viewMode === 'list' && <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
