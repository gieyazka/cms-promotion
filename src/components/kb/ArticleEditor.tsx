'use client';

import { createElement, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Save, UploadCloud, Eye, Pencil, ChevronUp, ChevronDown, Copy, Trash2,
  Plus, X, Upload, GripVertical, Monitor, Tablet, Smartphone, Search, Clock, FileText,
  CheckCircle2, Loader2, PanelRightClose, PanelRightOpen, Languages, Braces, Activity,
} from 'lucide-react';

import {
  Article, ArticleBlock, ArticleStatus, BlockType, LText, Locale, CATEGORIES, OWNERS, DEFAULT_HERO_BADGE,
} from '@/types/article';
import { newBlock, BLOCK_META, BLOCK_MENU, slugify, wordCount, readTime, uid } from '@/lib/blocks';
import { toApiPayload } from '@/lib/article-api-format';
import { getIcon } from '@/lib/icons';
import { useToast } from '@/components/ui/Toast';
import BlockEditorForm from '@/components/kb/BlockEditorForm';
import ArticlePreview from '@/components/kb/ArticlePreview';
import { StatusChip } from '@/components/kb/StatusChip';

type ViewMode = 'edit' | 'preview';
type Device = 'desktop' | 'tablet' | 'mobile';
type ArticlePatch = Partial<Article> | ((prev: Article) => Partial<Article>);

/** Walks any block/value looking for a non-empty leaf in the given locale's LText. */
function hasLocaleText(value: unknown, locale: Locale): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.th === 'string' && typeof obj.en === 'string') {
      return String(obj[locale] ?? '').trim().length > 0;
    }
    return Object.values(obj).some((v) => hasLocaleText(v, locale));
  }
  return false;
}

function langHasContent(article: Article, locale: Locale): boolean {
  return hasLocaleText(article.title, locale) || article.blocks.some((b) => hasLocaleText(b, locale));
}

function cloneBlock(block: ArticleBlock): ArticleBlock {
  return { ...(JSON.parse(JSON.stringify(block)) as ArticleBlock), id: uid() };
}

function miniBtnClass(disabled: boolean, danger?: boolean) {
  if (disabled) return 'flex h-7 w-7 items-center justify-center rounded-lg text-gray-200 dark:text-gray-700 cursor-default';
  if (danger) return 'flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 cursor-pointer transition-colors';
  return 'flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 cursor-pointer transition-colors';
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-gray-400 dark:text-gray-500">{hint}</span>}
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white dark:bg-gray-900 text-blue-600">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-gray-400 uppercase truncate">{label}</div>
        <div className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{value}</div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all';

const KB_PREVIEW_COLLAPSED_KEY = 'kb-editor-preview-collapsed';

/**
 * The collapsed preference lives in localStorage, which the server cannot see. Reading
 * it while rendering would make the server produce one tree and the client another, and
 * React 19 treats that as a hydration error. useSyncExternalStore is the sanctioned way
 * out: it renders the server snapshot (expanded) through hydration, then swaps to the
 * stored value — so a collapsed preview appears immediately after hydration without ever
 * making the two trees disagree.
 */
const previewCollapsedStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    previewCollapsedStore.listeners.add(listener);
    return () => {
      previewCollapsedStore.listeners.delete(listener);
    };
  },
  getSnapshot() {
    return window.localStorage.getItem(KB_PREVIEW_COLLAPSED_KEY) === '1';
  },
  getServerSnapshot() {
    return false;
  },
  set(collapsed: boolean) {
    window.localStorage.setItem(KB_PREVIEW_COLLAPSED_KEY, collapsed ? '1' : '0');
    previewCollapsedStore.listeners.forEach((listener) => listener());
  },
};

/**
 * ArticlePreview renders its desktop frame at up to 900px, its tablet frame at a fixed
 * 700px (10px bezel), and its mobile frame at a fixed 390px (8px bezel) — all wider than
 * the ~450-650px this takes up in a split pane. Rather than letting the frame's own
 * fixed-px paddings/font-sizes reflow into a cramped column, we render it at its natural
 * width and scale the whole thing down visually with a CSS transform, so proportions
 * stay faithful to the reference design.
 * These widths are the frame's natural width including ArticlePreview's own outer
 * padding around the card: 32/24px (desktop & tablet) or 24/12px (mobile) — the bezel
 * border is already counted in the frame's own width since box-sizing is border-box.
 *   desktop: 900 card + 48 outer padding = 948
 *   tablet:  700 card (bezel included) + 48 outer padding = 748
 *   mobile:  390 card (bezel included) + 24 outer padding = 414
 */
const PREVIEW_FRAME_WIDTH: Record<Device, number> = { desktop: 948, tablet: 748, mobile: 414 };

function ScaledArticlePreview({
  article,
  locale,
  device,
  showSpacing,
}: {
  article: Article;
  locale: Locale;
  device: Device;
  showSpacing: boolean;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    const panel = panelRef.current;
    const frame = frameRef.current;
    if (!panel || !frame) return;

    // State is only ever set from inside the (async) ResizeObserver callback,
    // never synchronously in the effect body — the browser delivers the first
    // observation asynchronously, so this never fires during this render pass.
    const ro = new ResizeObserver(() => {
      const frameWidth = PREVIEW_FRAME_WIDTH[device];
      const availableWidth = panel.clientWidth;
      const nextScale = availableWidth > 0 ? Math.min(1, availableWidth / frameWidth) : 1;
      setScale(nextScale);
      setNaturalHeight(frame.scrollHeight);
    });
    ro.observe(panel);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [device]);

  return (
    <div ref={panelRef} className="w-full overflow-hidden" style={{ height: naturalHeight * scale || undefined }}>
      <div className="flex justify-center">
        <div
          ref={frameRef}
          style={{ width: PREVIEW_FRAME_WIDTH[device], transform: `scale(${scale})`, transformOrigin: 'top center' }}
        >
          <ArticlePreview article={article} locale={locale} device={device} showSpacing={showSpacing} />
        </div>
      </div>
    </div>
  );
}

export default function ArticleEditor({ initial, isNew }: { initial: Article; isNew: boolean }) {
  const { showToast } = useToast();

  const [article, setArticle] = useState<Article>(initial);
  const [articleId, setArticleId] = useState<string>(isNew ? '' : initial.id);
  const [locale, setLocale] = useState<Locale>('th');
  const [view, setView] = useState<ViewMode>('edit');
  const [device, setDevice] = useState<Device>('desktop');
  const [showSpacing, setShowSpacing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug && initial.slug !== slugify(initial.title.th));
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const previewCollapsed = useSyncExternalStore(
    previewCollapsedStore.subscribe,
    previewCollapsedStore.getSnapshot,
    previewCollapsedStore.getServerSnapshot,
  );
  const setPreviewCollapsed = previewCollapsedStore.set;

  // The manual Save button and the beforeunload guard read the latest values
  // through these refs. They are synced after commit, never during render.
  const articleRef = useRef(article);
  const articleIdRef = useRef(articleId);
  const dirtyRef = useRef(dirty);

  useEffect(() => {
    articleRef.current = article;
  }, [article]);

  useEffect(() => {
    articleIdRef.current = articleId;
  }, [articleId]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // "Saved" is a transient confirmation, not a persistent status — it clears itself,
  // or gets pre-empted the moment `dirty` flips back to true (see the bar's render).
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const t = useCallback((th: string, en: string) => (locale === 'th' ? th : en), [locale]);

  const saveArticle = useCallback(async (articleToSave: Article, toastMsg?: string) => {
    setSaving(true);
    try {
      let saved: Article;
      if (!articleIdRef.current) {
        const res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleToSave),
        });
        if (!res.ok) throw new Error('save failed');
        saved = await res.json();
        setArticleId(saved.id);
        window.history.replaceState(null, '', '/knowledge-base/' + saved.id);
      } else {
        const res = await fetch(`/api/articles/${articleIdRef.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleToSave),
        });
        if (!res.ok) throw new Error('save failed');
        saved = await res.json();
      }
      setArticle(saved);
      setDirty(false);
      setJustSaved(true);
      showToast(toastMsg ?? t('บันทึกแล้ว', 'Saved'), 'success');
      return saved;
    } catch {
      showToast(t('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'Failed to save, please try again'), 'error');
      return null;
    } finally {
      setSaving(false);
    }
  }, [showToast, t]);

  // Marks the article dirty only — saving is a deliberate action from here on
  // (the Save button, or Publish/Unpublish), never a side effect of typing.
  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  const updateArticle = useCallback((patch: ArticlePatch) => {
    setArticle((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
    markDirty();
  }, [markDirty]);

  // ---- blocks ----
  const updateBlock = useCallback((id: string, next: ArticleBlock) => {
    updateArticle((prev) => ({ blocks: prev.blocks.map((b) => (b.id === id ? next : b)) }));
  }, [updateArticle]);

  const moveBlock = useCallback((from: number, to: number) => {
    updateArticle((prev) => {
      if (to < 0 || to >= prev.blocks.length) return {};
      const blocks = [...prev.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved);
      return { blocks };
    });
  }, [updateArticle]);

  const removeBlock = useCallback((id: string) => {
    updateArticle((prev) => ({ blocks: prev.blocks.filter((b) => b.id !== id) }));
  }, [updateArticle]);

  const duplicateBlock = useCallback((index: number) => {
    updateArticle((prev) => {
      const blocks = [...prev.blocks];
      blocks.splice(index + 1, 0, cloneBlock(blocks[index]));
      return { blocks };
    });
  }, [updateArticle]);

  const handleAddBlock = useCallback((type: BlockType) => {
    updateArticle((prev) => ({ blocks: [...prev.blocks, newBlock(type)] }));
    setAddBlockOpen(false);
  }, [updateArticle]);

  const toggleCollapsed = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // ---- cover upload ----
  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('upload failed');
      const data: { url: string } = await res.json();
      updateArticle({ cover: data.url });
      showToast(t('อัปโหลดรูปสำเร็จ', 'Image uploaded'), 'success');
    } catch {
      showToast(t('อัปโหลดรูปไม่สำเร็จ', 'Upload failed'), 'error');
    } finally {
      setCoverUploading(false);
    }
  };

  // ---- tags ----
  const addTag = () => {
    const v = tagInput.trim();
    if (!v || article.tags.includes(v)) {
      setTagInput('');
      return;
    }
    updateArticle((prev) => ({ tags: [...prev.tags, v] }));
    setTagInput('');
  };

  // ---- save / publish ----
  const handleSaveClick = async () => {
    await saveArticle(articleRef.current);
  };

  const handlePublishClick = async () => {
    if (article.status === 'published') {
      const next: Article = { ...article, status: 'draft' as ArticleStatus };
      setArticle(next);
      await saveArticle(next, t('ยกเลิกการเผยแพร่แล้ว', 'Unpublished'));
      return;
    }
    if (!article.title.th.trim() && !article.title.en.trim()) {
      showToast(t('กรุณาใส่ชื่อบทความก่อนเผยแพร่', 'Please add a title before publishing'), 'error');
      return;
    }
    const next: Article = {
      ...article,
      status: 'published',
      pubDate: article.pubDate || new Date().toISOString().slice(0, 10),
    };
    setArticle(next);
    await saveArticle(next, t('เผยแพร่บทความเรียบร้อย', 'Published successfully'));
  };

  // ---- language toggle ----
  const toggleLang = (target: Locale) => setLocale(target);

  /** The dot is "this locale already has content", not "this locale is selected". */
  const renderLangBar = () => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3.5">
      <span className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
        <Languages size={16} className="text-blue-600" />
        {t('ภาษาของเนื้อหา', 'Content language')}
      </span>
      <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 flex-none">
        {(['th', 'en'] as Locale[]).map((l) => {
          const active = locale === l;
          const filled = langHasContent(article, l);
          return (
            <button
              key={l}
              type="button"
              onClick={() => toggleLang(l)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                active ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {l === 'th' ? 'ภาษาไทย' : 'English'}
              <span className={`h-1.5 w-1.5 rounded-full ${filled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            </button>
          );
        })}
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {t(
          'สลับเพื่อกรอกแต่ละภาษา · โครงสร้าง (หมวดหมู่ / แท็ก / รูปภาพ / สี) ใช้ร่วมกันทั้งสองภาษา',
          'Switch to fill in each language · structure (category / tags / images / colours) is shared by both'
        )}
      </span>
    </div>
  );

  /** Mirrors the promotions module's "Live JSON Preview": the backend-facing payload first,
      then the raw stored article. Only the second one is what `PUT /api/articles/[id]` takes. */
  const renderJsonPreview = () => {
    const box = (label: string, json: string) => (
      <div className="relative mt-4 overflow-hidden rounded-xl bg-gray-900 p-6 shadow-2xl">
        <span className="absolute top-2 left-3 text-[10px] font-bold uppercase tracking-widest text-yellow-400">{label}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(json);
            showToast(t('คัดลอก JSON แล้ว', 'JSON copied'), 'success');
          }}
          title={t('คัดลอก', 'Copy')}
          className="absolute top-4 right-4 rounded-md p-2 text-gray-300 hover:bg-white/20 transition-colors"
        >
          <Copy size={14} />
        </button>
        <pre className="mt-3 max-h-[500px] overflow-auto font-mono text-[11px] leading-relaxed text-green-400">{json}</pre>
      </div>
    );
    return (
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer list-none rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="flex items-center gap-2">
            <Braces size={18} className="text-gray-500" />
            <span className="font-bold text-gray-700 dark:text-gray-300">
              {t('JSON ของบทความ (สองภาษา)', 'Live JSON Preview (Multilingual)')}
            </span>
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-blue-500 group-open:hidden">
            {t('แสดง JSON', 'Show JSON')}
          </span>
          <span className="hidden text-xs font-black uppercase tracking-widest text-red-500 group-open:block">
            {t('ซ่อน JSON', 'Hide JSON')}
          </span>
        </summary>
        {box('API format', JSON.stringify(toApiPayload(article), null, 2))}
        {box(t('ข้อมูลที่บันทึกจริง', 'Stored article'), JSON.stringify(article, null, 2))}
      </details>
    );
  };

  // ---- meta panel ----
  const handleTitleChange = (value: string) => {
    updateArticle((prev) => {
      const nextTitle: LText = { ...prev.title, [locale]: value };
      const patch: Partial<Article> = { title: nextTitle };
      if (locale === 'th' && !slugTouched) patch.slug = slugify(value);
      return patch;
    });
  };

  const dupSlug = false; // uniqueness is enforced server-side; no client-side article list available here

  const renderMetaPanel = () => (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-blue-600">
        <FileText size={16} />
        <span className="text-xs font-black uppercase tracking-widest">{t('ข้อมูลบทความ', 'Article details')}</span>
      </div>
      <div className="flex flex-col gap-4">
        <Field label={t('ชื่อบทความ', 'Article title')}>
          <input
            value={article.title[locale]}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('เช่น ทำไมทองคำถึงปลอดภัยที่สุด', 'e.g. Why gold is the safest asset')}
            className={`${inputClass} h-12 text-base font-bold`}
          />
        </Field>
        <Field
          label="Slug (URL)"
          hint={dupSlug ? undefined : 'earnex.com/kb/' + (article.slug || '...')}
        >
          <input
            value={article.slug}
            onChange={(e) => {
              setSlugTouched(true);
              updateArticle({ slug: slugify(e.target.value) });
            }}
            placeholder="auto-generated"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field label={t('หมวดหมู่', 'Category')}>
          <select
            value={article.category}
            onChange={(e) => updateArticle({ category: e.target.value })}
            className={inputClass}
          >
            <option value="">{t('เลือกหมวดหมู่', 'Select category')}</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label[locale]}</option>
            ))}
          </select>
        </Field>
        <Field
          label={t('ป้ายบนแบนเนอร์', 'Hero badge')}
          hint={t('เว้นว่างไว้ถ้าไม่ต้องการแสดงป้าย', 'Leave empty to show no badge')}
        >
          {/* '' is a real, distinct state ("no badge") — never coalesced to undefined
              or to DEFAULT_HERO_BADGE, or the "no badge" state becomes unreachable. */}
          <input
            value={article.heroBadge ?? DEFAULT_HERO_BADGE}
            onChange={(e) => updateArticle({ heroBadge: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field
          label={t('ป้ายสถานะ NEW', 'NEW status badge')}
          hint={t('เปิด/ปิดได้ตลอด — ปิดเมื่อบทความไม่ใหม่แล้ว', 'Toggle anytime — turn it off when the article is no longer new')}
        >
          {/* Absent (undefined) means shown, same as `true` — only an explicit `false`
              hides it, so articles predating this field keep displaying the badge. */}
          <label className="flex items-center gap-3 rounded-xl bg-blue-50/60 dark:bg-blue-900/10 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={article.showNew !== false}
              onChange={() => updateArticle({ showNew: article.showNew === false })}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('แสดงป้าย "NEW" บนบทความ', 'Show "NEW" badge on the article')}
            </span>
            {article.showNew !== false && (
              <span
                className="inline-flex items-center rounded-full font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg,#33C13B,#0EAB16)', fontSize: 10.5, padding: '2px 9px', letterSpacing: 0.4 }}
              >
                NEW
              </span>
            )}
          </label>
        </Field>
        <Field label={t('แท็ก', 'Tags')}>
          <div className="flex flex-col gap-2">
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 text-xs font-semibold"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => updateArticle((prev) => ({ tags: prev.tags.filter((x) => x !== tag) }))}
                      className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={t('เพิ่มแท็ก แล้วกด Enter', 'Add a tag, press Enter')}
                className={inputClass}
              />
              <button
                type="button"
                onClick={addTag}
                className="flex-none flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </Field>
        <Field
          label={t('ผู้รับผิดชอบ (ภายใน)', 'Owners (internal)')}
          hint={t('ใช้ภายในทีมเท่านั้น ไม่แสดงในหน้าเผยแพร่', 'For internal tracking only, not shown on the published page')}
        >
          <div className="flex flex-wrap gap-2">
            {OWNERS.map((owner) => {
              const active = article.owners.includes(owner.value);
              return (
                <button
                  key={owner.value}
                  type="button"
                  onClick={() => updateArticle((prev) => ({
                    owners: active ? prev.owners.filter((o) => o !== owner.value) : [...prev.owners, owner.value],
                  }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'
                  }`}
                >
                  {owner.label[locale]}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={t('รูปหน้าปก (Cover)', 'Cover image')}>
          {article.cover ? (
            <div className="relative h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.cover} alt="Cover" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => updateArticle({ cover: '' })}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label
              className={`flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                coverUploading
                  ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
              }`}
            >
              {coverUploading ? (
                <Loader2 size={20} className="animate-spin text-blue-500" />
              ) : (
                <>
                  <Upload size={20} className="text-blue-500" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {t('คลิกเพื่ออัปโหลดรูปหน้าปก', 'Click to upload cover image')}
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={coverUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </Field>
        {article.cover && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-3 rounded-xl bg-blue-50/60 dark:bg-blue-900/10 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={article.coverOverlay === true}
                onChange={() => updateArticle({ coverOverlay: !article.coverOverlay })}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('วางชื่อบทความทับบนรูป', 'Overlay the title on the cover')}
              </span>
            </label>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {t('ปิดไว้ถ้ารูปมีตัวหนังสืออยู่แล้ว — เปิดเมื่อใช้ภาพถ่ายเปล่า', 'Leave off if the artwork already contains the title — turn on for plain photography')}
            </span>
          </div>
        )}
        {/* Only meaningful on the overlay hero — the gradient hero forces light text
            regardless of this field, so offering the control there would be a lie. */}
        {article.cover && article.coverOverlay === true && (
          <Field
            label={t('สีตัวหนังสือบนรูป', 'Title colour on the cover')}
            hint={t('ใช้สีเข้มเมื่อรูปสว่าง ไม่งั้นตัวหนังสือขาวจะจมหายไปกับรูป', 'Use dark when the cover is bright, or white text will disappear into it')}
          >
            <div className="inline-flex items-center gap-1 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-1">
              <button
                type="button"
                onClick={() => updateArticle({ heroTitleColor: 'light' })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  article.heroTitleColor !== 'dark' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {t('ขาว', 'Light')}
              </button>
              <button
                type="button"
                onClick={() => updateArticle({ heroTitleColor: 'dark' })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  article.heroTitleColor === 'dark' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {t('เข้ม', 'Dark')}
              </button>
            </div>
          </Field>
        )}
        <Field label={t('วันที่เผยแพร่', 'Publish date')}>
          <input
            type="date"
            value={article.pubDate}
            onChange={(e) => updateArticle({ pubDate: e.target.value })}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Clock} label={t('เวลาอ่าน', 'Read time')} value={`${readTime(article, locale)} ${t('นาที', 'min')}`} />
          <StatTile icon={FileText} label={t('จำนวนคำ', 'Words')} value={String(wordCount(article, locale))} />
          <StatTile icon={Eye} label={t('ยอดวิว', 'Views')} value={article.views.toLocaleString()} />
        </div>
        {renderSEO()}
      </div>
    </div>
  );

  // ---- SEO panel ----
  const renderSEO = () => {
    const metaTitle = article.metaTitle[locale];
    const metaDesc = article.metaDesc[locale];
    return (
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoOpen((v) => !v)}
          className="flex w-full items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-4 py-3"
        >
          <Search size={16} className="text-blue-600" />
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">SEO / Meta</span>
          <ChevronDown size={16} className={`ml-auto text-gray-400 transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
        </button>
        {seoOpen && (
          <div className="p-4 flex flex-col gap-4">
            <Field
              label="Meta title"
              hint={`${metaTitle.length}/60 ${t('ตัวอักษร (แนะนำไม่เกิน 60)', 'chars (60 recommended)')}`}
            >
              <input
                value={metaTitle}
                onChange={(e) => updateArticle((prev) => ({ metaTitle: { ...prev.metaTitle, [locale]: e.target.value } }))}
                placeholder={article.title[locale] || t('ชื่อสำหรับ SEO', 'SEO title')}
                className={inputClass}
              />
            </Field>
            <Field
              label="Meta description"
              hint={`${metaDesc.length}/160 ${t('ตัวอักษร (แนะนำไม่เกิน 160)', 'chars (160 recommended)')}`}
            >
              <textarea
                value={metaDesc}
                onChange={(e) => updateArticle((prev) => ({ metaDesc: { ...prev.metaDesc, [locale]: e.target.value } }))}
                rows={3}
                placeholder={t('คำอธิบายสั้น ๆ สำหรับผลการค้นหา', 'Short description for search results')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </Field>
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">{t('ตัวอย่างผลการค้นหา', 'Search preview')}</div>
              <div className="text-[13px] text-gray-500 dark:text-gray-400 truncate">earnex.com › kb › {article.slug || 'untitled'}</div>
              <div className="text-[#1a0dab] dark:text-[#8ab4f8] text-lg leading-snug truncate">
                {metaTitle || article.title[locale] || t('ชื่อบทความ', 'Article title')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {metaDesc || t('คำอธิบายจะปรากฏที่นี่...', 'Description will appear here...')}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---- blocks ----
  const renderBlocksHeader = () => (
    <div className="flex items-center gap-2 mb-3 px-0.5">
      <span className="text-base font-bold text-gray-800 dark:text-gray-100">{t('เนื้อหาบทความ', 'Article content')}</span>
      <span className="text-xs text-gray-400">{article.blocks.length} {t('บล็อก', 'blocks')}</span>
      <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400">
        <GripVertical size={13} />
        {t('ลากเพื่อจัดเรียง', 'Drag to reorder')}
      </span>
    </div>
  );

  const renderNoBlocks = () => (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 px-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
        <FileText size={26} />
      </div>
      <div className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">{t('ยังไม่มีเนื้อหา', 'No content yet')}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('เพิ่มบล็อกแรกเพื่อเริ่มเขียนบทความของคุณ', 'Add your first block to start writing')}
      </div>
      <button
        type="button"
        onClick={() => setAddBlockOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
      >
        <Plus size={16} />
        {t('เพิ่มบล็อกเนื้อหา', 'Add content block')}
      </button>
    </div>
  );

  const renderBlockCard = (block: ArticleBlock, index: number) => {
    const meta = BLOCK_META[block.type];
    const Icon = getIcon(meta.icon);
    const isCollapsed = !!collapsed[block.id];
    const isDragging = dragIndex === index;
    const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;

    return (
      <div
        key={block.id}
        draggable
        onDragStart={() => setDragIndex(index)}
        onDragOver={(e) => {
          e.preventDefault();
          if (overIndex !== index) setOverIndex(index);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragIndex !== null && dragIndex !== index) moveBlock(dragIndex, index);
          setDragIndex(null);
          setOverIndex(null);
        }}
        onDragEnd={() => {
          setDragIndex(null);
          setOverIndex(null);
        }}
        className={`mb-3 rounded-2xl border bg-white dark:bg-gray-900 transition-all ${
          isOver ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-gray-100 dark:border-gray-800'
        } ${isDragging ? 'opacity-40' : ''}`}
      >
        <div className="flex items-center gap-2.5 border-b border-gray-50 dark:border-gray-800 px-3 py-2.5">
          <span className="cursor-grab text-gray-300 dark:text-gray-600 flex-none">
            <GripVertical size={18} />
          </span>
          <button
            type="button"
            onClick={() => toggleCollapsed(block.id)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <Icon size={15} />
            </span>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{meta.label[locale]}</span>
            {isCollapsed ? <ChevronDown size={14} className="text-gray-400 flex-none" /> : <ChevronUp size={14} className="text-gray-400 flex-none" />}
          </button>
          <div className="ml-auto flex items-center gap-0.5 flex-none">
            <button
              type="button"
              title={t('เลื่อนขึ้น', 'Move up')}
              disabled={index === 0}
              onClick={() => moveBlock(index, index - 1)}
              className={miniBtnClass(index === 0)}
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              title={t('เลื่อนลง', 'Move down')}
              disabled={index === article.blocks.length - 1}
              onClick={() => moveBlock(index, index + 1)}
              className={miniBtnClass(index === article.blocks.length - 1)}
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              title={t('ทำสำเนา', 'Duplicate')}
              onClick={() => duplicateBlock(index)}
              className={miniBtnClass(false)}
            >
              <Copy size={15} />
            </button>
            <button
              type="button"
              title={t('ลบ', 'Delete')}
              onClick={() => removeBlock(block.id)}
              className={miniBtnClass(false, true)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="p-4">
            <BlockEditorForm block={block} locale={locale} onChange={(next) => updateBlock(block.id, next)} />
          </div>
        )}
      </div>
    );
  };

  const renderAddBlockZone = () => {
    if (!addBlockOpen) {
      return (
        <button
          type="button"
          onClick={() => setAddBlockOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 py-4 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <Plus size={18} />
          {t('เพิ่มบล็อกเนื้อหา', 'Add content block')}
        </button>
      );
    }
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-lg shadow-blue-500/5">
        <div className="flex items-center mb-3">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t('เลือกชนิดบล็อก', 'Choose a block type')}</span>
          <button
            type="button"
            onClick={() => setAddBlockOpen(false)}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
          {BLOCK_MENU.map((type) => {
            const meta = BLOCK_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleAddBlock(type)}
                className="flex items-center gap-2.5 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                  {createElement(getIcon(meta.icon), { size: 16 })}
                </span>
                <span className="text-xs font-semibold leading-snug text-gray-700 dark:text-gray-200">{meta.label[locale]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- preview ----
  const renderPreviewToolbar = (showCollapse: boolean) => (
    <div className="flex flex-none items-center gap-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
      <Eye size={16} className="text-gray-400" />
      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Live preview</span>
      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
        {locale.toUpperCase()}
      </span>
      <button
        type="button"
        onClick={() => setShowSpacing((s) => !s)}
        title={t('แสดงระยะห่างอัตโนมัติระหว่างบล็อก (ดูอย่างเดียว)', 'Show the automatic gap between blocks (read-only)')}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          showSpacing
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        <Activity size={14} />
        {t('ระยะห่างอัตโนมัติ', 'Auto spacing')}
      </button>
      <div className="ml-auto flex items-center gap-1 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-1">
        <button
          type="button"
          onClick={() => setDevice('desktop')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            device === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Monitor size={14} /> {t('คอมพิวเตอร์', 'Desktop')}
        </button>
        <button
          type="button"
          onClick={() => setDevice('tablet')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            device === 'tablet' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Tablet size={14} /> {t('แท็บเล็ต', 'Tablet')}
        </button>
        <button
          type="button"
          onClick={() => setDevice('mobile')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            device === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Smartphone size={14} /> {t('มือถือ', 'Mobile')}
        </button>
      </div>
      {showCollapse && (
        <button
          type="button"
          onClick={() => setPreviewCollapsed(true)}
          title={t('ซ่อนตัวอย่าง', 'Hide preview')}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <PanelRightClose size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 h-16">
        <Link
          href="/knowledge-base"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-white truncate max-w-[280px]">
              {article.title[locale] || t('บทความใหม่', 'New article')}
            </span>
            <StatusChip status={article.status} />
          </div>
          <div className="flex items-center gap-1.5 text-xs h-4">
            {dirty ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">{t('ยังไม่ได้บันทึก', 'Unsaved changes')}</span>
              </>
            ) : justSaved ? (
              <>
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">{t('บันทึกแล้ว', 'Saved')}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Split pane covers Edit+Preview simultaneously at lg+; below lg it falls
              back to switching between the two, so this toggle only makes sense there. */}
          <div className="flex lg:hidden bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex-none">
            <button
              type="button"
              onClick={() => setView('edit')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                view === 'edit' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Pencil size={13} /> {t('แก้ไข', 'Edit')}
            </button>
            <button
              type="button"
              onClick={() => setView('preview')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                view === 'preview' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Eye size={13} /> {t('ตัวอย่าง', 'Preview')}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving || (!dirty && !isNew)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {t('บันทึก', 'Save')}
          </button>
          <button
            type="button"
            onClick={handlePublishClick}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <UploadCloud size={16} />
            {article.status === 'published' ? t('ยกเลิกเผยแพร่', 'Unpublish') : t('เผยแพร่', 'Publish')}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Edit column: full width below lg (when that's the active mobile view),
              always visible and flexing to fill remaining space at lg+. */}
          <div className={`w-full lg:flex-1 lg:min-w-0 flex-col gap-6 ${view === 'preview' ? 'hidden lg:flex' : 'flex'}`}>
            {renderLangBar()}
            {renderMetaPanel()}
            <div>
              {renderBlocksHeader()}
              {article.blocks.length === 0 ? renderNoBlocks() : (
                <div>{article.blocks.map((b, i) => renderBlockCard(b, i))}</div>
              )}
              <div className="mt-3">{renderAddBlockZone()}</div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">{renderJsonPreview()}</div>
          </div>

          {/* Desktop split-pane preview: sticky, independently scrollable, always
              visible at lg+ regardless of the (mobile-only) edit/preview toggle. */}
          <div
            // A definite height (not max-h) is what lets the inner scroller resolve
            // flex-1 against something real.
            className={`hidden lg:flex flex-none flex-col lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] transition-[width] duration-200 ${
              previewCollapsed ? 'lg:w-14' : 'lg:w-[500px] xl:w-[630px] 2xl:w-[770px]'
            }`}
          >
            {previewCollapsed ? (
              <button
                type="button"
                onClick={() => setPreviewCollapsed(false)}
                title={t('แสดงตัวอย่าง', 'Show preview')}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 hover:text-blue-600 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              >
                <PanelRightOpen size={18} />
              </button>
            ) : (
              <div className="flex h-full flex-col gap-3">
                {/* Toolbar stays pinned; only the article below it scrolls. */}
                <div className="flex-none">{renderPreviewToolbar(true)}</div>

                {/* min-h-0 is load-bearing: a flex item defaults to min-height:auto, which
                    refuses to shrink below its content, so the box would grow past the
                    panel and overflow-y would have nothing left to scroll. */}
                <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 pb-4">
                  <ScaledArticlePreview article={article} locale={locale} device={device} showSpacing={showSpacing} />
                </div>
              </div>
            )}
          </div>

          {/* Mobile/tablet fallback preview: single column, normal page scroll,
              shown only when the edit/preview toggle is set to preview below lg. */}
          {view === 'preview' && (
            <div className="w-full lg:hidden flex flex-col gap-3">
              {renderPreviewToolbar(false)}
              <ScaledArticlePreview article={article} locale={locale} device={device} showSpacing={showSpacing} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
