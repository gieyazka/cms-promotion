'use client';

import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, Search } from 'lucide-react';

import { AuditEntry, AuditEntryCard } from '@/components/kb/AuditEntryCard';

/**
 * Every article's history. The per-article view lives in the editor instead
 * (`ArticleHistoryModal`); both render the same `AuditEntryCard`, so an entry reads
 * identically wherever it is seen.
 */
export default function ActivityPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/audit-log')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'load failed');
        return data.entries as AuditEntry[];
      })
      .then(setEntries)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || !entries) return entries ?? [];
    return entries.filter((e) =>
      [e.actor, e.title, e.articleId, ...e.changes.map((c) => c.field)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [entries, query]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <History className="text-blue-600" size={26} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ประวัติการแก้ไข</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ใครแก้อะไรบ้าง เก็บไว้ในเครื่องที่ <code className="text-xs">data/audit-log.jsonl</code>
            </p>
          </div>
        </div>

        <div className="relative mt-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาผู้แก้ไข ชื่อบทความ หรือฟิลด์..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {error ? (
            <p className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
              โหลดประวัติไม่สำเร็จ: {error}
            </p>
          ) : !entries ? (
            <div className="flex h-40 items-center justify-center text-gray-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center text-sm text-gray-500">
              {entries.length === 0 ? 'ยังไม่มีประวัติการแก้ไข' : 'ไม่พบรายการที่ค้นหา'}
            </p>
          ) : (
            visible.map((entry, index) => (
              <AuditEntryCard key={`${entry.at}-${index}`} entry={entry} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
