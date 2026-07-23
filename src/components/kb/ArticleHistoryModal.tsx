'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { AuditEntry, AuditEntryCard } from '@/components/kb/AuditEntryCard';

/**
 * One article's edit history, read from `/api/audit-log?articleId=`.
 *
 * Mounted only while open (the caller renders it conditionally), so opening it always fetches
 * fresh — no cache to invalidate after a save, and no effect that has to reset state on close.
 * `showTitle` is off on the cards: every entry here is the article already on screen.
 */
export function ArticleHistoryModal({
  articleId,
  onClose,
}: {
  articleId: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/audit-log?articleId=${encodeURIComponent(articleId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'load failed');
        return data.entries as AuditEntry[];
      })
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  return (
    <Modal isOpen onClose={onClose} title="ประวัติการแก้ไขบทความนี้" size="xl">
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        {error ? (
          <p className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
            โหลดประวัติไม่สำเร็จ: {error}
          </p>
        ) : !entries ? (
          <div className="flex h-40 items-center justify-center text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center text-sm text-gray-500">
            ยังไม่มีประวัติการแก้ไขบทความนี้
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry, index) => (
              <AuditEntryCard key={`${entry.at}-${index}`} entry={entry} showTitle={false} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
