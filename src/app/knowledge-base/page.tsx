'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

import { Article, ArticleStatus, CATEGORIES, OWNERS } from '@/types/article';
import { readTime, slugify, uid } from '@/lib/blocks';
import { actorHeaders, jsonWriteHeaders } from '@/lib/actor';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { StatusChip } from '@/components/kb/StatusChip';

type Tab = 'all' | 'published' | 'draft' | 'archived';
type SortId = 'updated_desc' | 'updated_asc' | 'views_desc' | 'title_asc';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Draft' },
  { id: 'archived', label: 'Archived' },
];

const SORT_OPTIONS: { value: SortId; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'updated_asc', label: 'Oldest updated' },
  { value: 'views_desc', label: 'Most viewed' },
  { value: 'title_asc', label: 'Title A–Z' },
];

function relTime(iso: string): string {
  if (!iso) return '—';
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

const nfmt = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('en-US');

const categoryLabel = (value: string) => CATEGORIES.find((c) => c.value === value)?.label.en || value || '—';
const ownerLabel = (value: string) => OWNERS.find((o) => o.value === value)?.label.en || value;

export default function KnowledgeBaseList() {
  const router = useRouter();
  const { showToast } = useToast();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortId>('updated_desc');
  const [tab, setTab] = useState<Tab>('all');
  const [trashOpen, setTrashOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [purgeTarget, setPurgeTarget] = useState<string[] | null>(null);

  useEffect(() => {
    fetch('/api/articles')
      .then((res) => res.json())
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => showToast('Failed to load articles', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allCount = useMemo(() => articles.filter((a) => a.status !== 'trash').length, [articles]);
  const trashCount = useMemo(() => articles.filter((a) => a.status === 'trash').length, [articles]);
  const tabCounts: Record<Tab, number> = {
    all: allCount,
    published: articles.filter((a) => a.status === 'published').length,
    draft: articles.filter((a) => a.status === 'draft').length,
    archived: articles.filter((a) => a.status === 'archived').length,
  };

  const filtered = useMemo(() => {
    let list = articles.filter((a) => (trashOpen ? a.status === 'trash' : a.status !== 'trash'));

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.title.th.toLowerCase().includes(q) ||
          a.title.en.toLowerCase().includes(q) ||
          (a.seo_path ?? '').toLowerCase().includes(q) ||
          a.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (!trashOpen) {
      if (tab !== 'all') list = list.filter((a) => a.status === tab);
      if (category !== 'all') list = list.filter((a) => a.category === category);
    }

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'updated_desc':
          return new Date(b.updated).getTime() - new Date(a.updated).getTime();
        case 'updated_asc':
          return new Date(a.updated).getTime() - new Date(b.updated).getTime();
        case 'views_desc':
          return b.views - a.views;
        case 'title_asc':
          return a.title.th.localeCompare(b.title.th, 'th');
        default:
          return 0;
      }
    });
  }, [articles, trashOpen, search, tab, category, sort]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.includes(a.id));
  const toggleSelectAll = () => setSelected(allSelected ? [] : filtered.map((a) => a.id));
  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function updateStatus(ids: string[], status: ArticleStatus, successMessage: string) {
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/articles/${id}`, {
            method: 'PUT',
            headers: jsonWriteHeaders(),
            body: JSON.stringify({ status }),
          })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error('request failed');
      setArticles((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, status } : a)));
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
      showToast(successMessage, 'success');
    } catch {
      showToast('Something went wrong, please try again', 'error');
    }
  }

  async function purgeArticles(ids: string[]) {
    try {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/articles/${id}`, { method: 'DELETE', headers: actorHeaders() })),
      );
      // A delete can now fail on the backend rather than locally (the route deactivates the
      // synced record first). Show that reason — "failed" alone gives no clue whether to
      // retry, and the article is still in the trash either way.
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const body = await failed.json().catch(() => null);
        throw new Error(body?.error || 'request failed');
      }
      setArticles((prev) => prev.filter((a) => !ids.includes(a.id)));
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
      showToast('Deleted permanently', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete permanently', 'error');
    } finally {
      setPurgeTarget(null);
    }
  }

  async function duplicateArticle(article: Article) {
    const titleTh = `${article.title.th || 'Untitled'} (สำเนา)`;
    const titleEn = `${article.title.en || 'Untitled'} (copy)`;
    const slug = slugify(`${article.seo_path || 'untitled'}-copy`);
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: jsonWriteHeaders(),
        body: JSON.stringify({
          ...article,
          title: { th: titleTh, en: titleEn },
          slug,
          status: 'draft',
          views: 0,
          blocks: article.blocks.map((b) => ({ ...b, id: uid() })),
        }),
      });
      if (!res.ok) throw new Error('request failed');
      const created = (await res.json()) as Article;
      setArticles((prev) => [created, ...prev]);
      showToast('Article duplicated', 'success');
    } catch {
      showToast('Failed to duplicate article', 'error');
    }
  }

  /**
   * The status tab is its own control with its own counts, not a filter — "Clear filters"
   * leaves it alone. `listNarrowed` is the wider question ("is anything hiding rows?"),
   * which is what the empty state needs to know.
   */
  const filtersActive = search !== '' || category !== 'all';
  const listNarrowed = filtersActive || tab !== 'all';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">{trashOpen ? 'Trash' : 'Knowledge Base'}</h1>
          <p className="text-gray-500 mt-1">
            {trashOpen
              ? `${trashCount} deleted article${trashCount === 1 ? '' : 's'}`
              : `${allCount} article${allCount === 1 ? '' : 's'} total`}
          </p>
        </div>
        {trashOpen ? (
          <button
            onClick={() => {
              setTrashOpen(false);
              setSelected([]);
            }}
            className="flex items-center justify-center space-x-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold"
          >
            <X size={18} />
            <span>Back to list</span>
          </button>
        ) : (
          <Link
            href="/knowledge-base/new"
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold"
          >
            <Plus size={20} />
            <span>New Article</span>
          </Link>
        )}
      </div>

      {!trashOpen && (
        <div className="flex items-center gap-1 mb-6 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setSelected([]);
              }}
              className={`relative px-4 py-2.5 text-sm whitespace-nowrap font-semibold transition-colors ${tab === id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {label} <span className="font-mono text-xs">({tabCounts[id]})</span>
              {tab === id && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-blue-600" />}
            </button>
          ))}
          <button
            onClick={() => {
              setTrashOpen(true);
              setSelected([]);
            }}
            className="ml-auto flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-400 hover:text-red-500 dark:hover:text-red-400 whitespace-nowrap"
          >
            <Trash2 size={14} />
            Trash
            {trashCount > 0 && (
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5">
                {trashCount}
              </span>
            )}
          </button>
        </div>
      )}

      {!trashOpen && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, slug, or tags..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm font-medium"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label.en}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm font-medium"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {filtersActive && (
            <button
              onClick={() => {
                setSearch('');
                setCategory('all');
              }}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {trashOpen && (
        <div className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <p className="text-sm font-medium">
            Articles in trash are permanently deleted after 30 days. Restore them before then to keep them.
          </p>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-600 mb-4">
          <span className="text-white text-sm font-semibold">{selected.length} selected</span>
          <div className="w-px h-5 bg-white/25" />
          {trashOpen ? (
            <>
              <BarButton
                icon={<RotateCcw size={15} />}
                label="Restore"
                onClick={() => updateStatus(selected, 'draft', 'Restored to draft')}
              />
              <BarButton
                icon={<Trash2 size={15} />}
                label="Delete permanently"
                onClick={() => setPurgeTarget(selected)}
              />
            </>
          ) : (
            <>
              <BarButton
                icon={<CheckCircle2 size={15} />}
                label="Publish"
                onClick={() => updateStatus(selected, 'published', 'Published')}
              />
              <BarButton
                icon={<Archive size={15} />}
                label="Archive"
                onClick={() => updateStatus(selected, 'archived', 'Archived')}
              />
              <BarButton
                icon={<Trash2 size={15} />}
                label="Move to trash"
                onClick={() => updateStatus(selected, 'trash', 'Moved to trash')}
              />
            </>
          )}
          <button onClick={() => setSelected([])} className="ml-auto text-white/70 hover:text-white text-sm">
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading articles...</p>
        </div>
      ) : filtered.length === 0 ? (
        trashOpen ? (
          <EmptyState
            icon={<Trash2 className="text-gray-300 dark:text-gray-600" size={32} />}
            title="Trash is empty"
            description="Deleted articles will show up here before they're permanently removed."
          />
        ) : listNarrowed ? (
          <EmptyState
            icon={<Search className="text-gray-300 dark:text-gray-600" size={32} />}
            title="No articles match your filters"
            description="Try adjusting your search or clearing the filters."
            action={
              filtersActive ? (
                <button
                  onClick={() => {
                    setSearch('');
                    setCategory('all');
                  }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={<BookOpen className="text-gray-300 dark:text-gray-600" size={32} />}
            title="No articles yet"
            description="Create your first Knowledge Base article to start educating your traders."
            action={
              <Link
                href="/knowledge-base/new"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700"
              >
                <Plus size={18} /> Create first article
              </Link>
            }
          />
        )
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
                  <th className="px-4 py-3 w-11">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-blue-600"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <Th>Article</Th>
                  <Th>Status</Th>
                  <Th>Category</Th>
                  <Th>Owners</Th>
                  <Th>Read time</Th>
                  <Th>Updated</Th>
                  <Th align="right">Views</Th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors ${selected.includes(a.id)
                        ? 'bg-blue-50/60 dark:bg-blue-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                      }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-blue-600"
                        checked={selected.includes(a.id)}
                        onChange={() => toggleSelect(a.id)}
                      />
                    </td>
                    <td className="px-4 py-3 max-w-[320px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {a.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.cover} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen size={18} className="text-gray-300 dark:text-gray-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          {trashOpen ? (
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {a.title.th || '(untitled)'}
                            </div>
                          ) : (
                            <Link
                              href={`/knowledge-base/${a.id}`}
                              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                            >
                              {a.title.th || '(untitled)'}
                            </Link>
                          )}
                          <div className="text-xs text-gray-400 truncate">{a.title.en || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {categoryLabel(a.category)}
                    </td>
                    <td className="px-4 py-3">
                      {a.owners.length ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                            {ownerLabel(a.owners[0]).trim().charAt(0)}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                            {ownerLabel(a.owners[0])}
                          </span>
                          {a.owners.length > 1 && (
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                              +{a.owners.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={13} />
                        {readTime(a, 'th')} min
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {relTime(a.updated)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900 dark:text-white whitespace-nowrap">
                      {nfmt(a.views)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu trigger={<MoreVertical size={18} />}>
                        {(close) =>
                          trashOpen ? (
                            <>
                              <MenuItem
                                icon={<RotateCcw size={15} />}
                                label="Restore"
                                onClick={() => {
                                  updateStatus([a.id], 'draft', 'Restored to draft');
                                  close();
                                }}
                              />
                              <MenuItem
                                icon={<Trash2 size={15} />}
                                label="Delete permanently"
                                danger
                                onClick={() => {
                                  setPurgeTarget([a.id]);
                                  close();
                                }}
                              />
                            </>
                          ) : (
                            <>
                              <MenuItem
                                icon={<Pencil size={15} />}
                                label="Edit"
                                onClick={() => {
                                  router.push(`/knowledge-base/${a.id}`);
                                  close();
                                }}
                              />
                              <MenuItem
                                icon={<Copy size={15} />}
                                label="Duplicate"
                                onClick={() => {
                                  duplicateArticle(a);
                                  close();
                                }}
                              />
                              <MenuItem
                                icon={a.status === 'published' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                                label={a.status === 'published' ? 'Unpublish' : 'Publish'}
                                onClick={() => {
                                  updateStatus(
                                    [a.id],
                                    a.status === 'published' ? 'draft' : 'published',
                                    a.status === 'published' ? 'Unpublished' : 'Published'
                                  );
                                  close();
                                }}
                              />
                              <MenuItem
                                icon={<Archive size={15} />}
                                label="Archive"
                                onClick={() => {
                                  updateStatus([a.id], 'archived', 'Archived');
                                  close();
                                }}
                              />
                              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                              <MenuItem
                                icon={<Trash2 size={15} />}
                                label="Move to trash"
                                danger
                                onClick={() => {
                                  updateStatus([a.id], 'trash', 'Moved to trash');
                                  close();
                                }}
                              />
                            </>
                          )
                        }
                      </RowMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!purgeTarget} onClose={() => setPurgeTarget(null)} title="Delete permanently?">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {purgeTarget && purgeTarget.length > 1
            ? `This will permanently delete ${purgeTarget.length} articles. This action cannot be undone.`
            : 'This will permanently delete this article. This action cannot be undone.'}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setPurgeTarget(null)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => purgeTarget && purgeArticles(purgeTarget)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
          >
            Delete permanently
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'
        }`}
    >
      {children}
    </th>
  );
}

function BarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl py-20 text-center">
      <div className="bg-gray-50 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        {icon}
      </div>
      <p className="text-gray-900 dark:text-white text-lg font-bold mb-2">{title}</p>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">{description}</p>
      {action}
    </div>
  );
}

function RowMenu({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  /**
   * The menu is `position: fixed`, not `absolute`. The table sits inside
   * `overflow-hidden` (rounded card) + `overflow-x-auto` (horizontal scroll), and CSS
   * computes the other axis to `auto` whenever one axis is not `visible` — so an
   * absolutely positioned menu is clipped by the card's bottom edge. Fixed positioning
   * escapes both, at the cost of having to place it by hand from the button's rect.
   */
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPos(null);
    };
    // Fixed coords are frozen at open time, so the menu would drift away from its row.
    const onScroll = () => setPos(null);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [pos]);

  return (
    <div className="inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          if (pos) return setPos(null);
          const r = e.currentTarget.getBoundingClientRect();
          const right = window.innerWidth - r.right;
          // ponytail: 240px covers the tallest menu (6 items); measure-then-flip if the
          // menu ever grows past that.
          setPos(
            window.innerHeight - r.bottom < 240
              ? { bottom: window.innerHeight - r.top + 4, right }
              : { top: r.bottom + 4, right }
          );
        }}
        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        {trigger}
      </button>
      {pos && (
        <div
          style={pos}
          className="fixed z-30 min-w-[180px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1"
        >
          {children(() => setPos(null))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors ${danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
