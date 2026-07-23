'use client';

import Link from 'next/link';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';

/**
 * One row of `data/audit-log.jsonl`, rendered.
 *
 * Shared by the two places history is shown, so a change never reads differently depending on
 * where you look at it: `/activity` (every article) and the history modal inside the article
 * editor (one article). The only difference between them is `showTitle` — inside the editor
 * every entry is the open article, so repeating its title on each row is noise.
 *
 * The types are re-declared here rather than imported from `lib/audit-log.ts` because that
 * module is server-only (it reaches for `fs`), and these components are `'use client'`.
 */

export type AuditChange = { field: string; from?: unknown; to?: unknown; note?: string };

export type AuditEntry = {
  at: string;
  actor: string;
  action: 'create' | 'update' | 'delete';
  articleId: string;
  title: string;
  changes: AuditChange[];
};

const ACTION_META = {
  create: { label: 'สร้าง', icon: PlusCircle, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  update: { label: 'แก้ไข', icon: Pencil, className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  delete: { label: 'ลบถาวร', icon: Trash2, className: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
} as const;

/** Field names as they appear in the editor, so an entry reads like the UI it came from. */
export const FIELD_LABELS: Record<string, string> = {
  title: 'ชื่อบทความ',
  slug: 'Slug',
  status: 'สถานะ',
  category: 'หมวดหมู่',
  tags: 'แท็ก',
  owners: 'ผู้ดูแล',
  cover: 'รูปหน้าปก',
  coverOverlay: 'วางชื่อทับรูป',
  heroBadge: 'ป้ายแบนเนอร์',
  heroTitleColor: 'สีตัวหนังสือบนรูป',
  showNew: 'ป้าย NEW',
  pubDate: 'วันที่เผยแพร่',
  metaTitle: 'Meta title',
  metaDesc: 'Meta description',
  blocks: 'เนื้อหา',
  syncedAt: 'ส่งขึ้นเซิร์ฟเวอร์',
  backendId: 'ID บนเซิร์ฟเวอร์',
  article: 'บทความ',
};

/**
 * Turns a stored value into something readable. The log keeps raw values (see AuditChange in
 * lib/audit-log.ts), so this is the only place that decides what "no value" looks like —
 * and an absent field ("—") stays distinguishable from an empty one ("(ว่าง)").
 */
export function formatValue(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return value || '(ว่าง)';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '(ว่าง)';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.th === 'string' || typeof record.en === 'string') {
      const th = (record.th as string) ?? '';
      const en = (record.en as string) ?? '';
      return th || en ? `${th} / ${en}` : '(ว่าง)';
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export function AuditEntryCard({ entry, showTitle = true }: { entry: AuditEntry; showTitle?: boolean }) {
  const meta = ACTION_META[entry.action];
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.className}`}>
          <Icon size={12} /> {meta.label}
        </span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.actor}</span>
        {!showTitle ? null : entry.action === 'delete' ? (
          <span className="truncate text-sm text-gray-600 dark:text-gray-300">{entry.title}</span>
        ) : (
          <Link
            href={`/knowledge-base/${entry.articleId}`}
            className="truncate text-sm text-blue-600 hover:underline"
          >
            {entry.title}
          </Link>
        )}
        <span className="ml-auto text-xs text-gray-400">{new Date(entry.at).toLocaleString('th-TH')}</span>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {entry.changes.map((change, i) => (
          <li key={i} className="text-xs text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {FIELD_LABELS[change.field] ?? change.field}
            </span>{' '}
            {change.note ? (
              <span>{change.note}</span>
            ) : (
              <>
                <span className="text-gray-400 line-through break-all">{formatValue(change.from)}</span>
                <span className="mx-1 text-gray-400">→</span>
                <span className="break-all">{formatValue(change.to)}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
