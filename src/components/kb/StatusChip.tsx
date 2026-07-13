import { ArticleStatus } from '@/types/article';

const STYLES: Record<ArticleStatus, string> = {
  published:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  draft:
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  archived:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  trash:
    'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
};

const LABELS: Record<ArticleStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
  trash: 'Trash',
};

export function StatusChip({ status }: { status: ArticleStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
