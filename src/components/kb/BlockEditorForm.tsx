'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Lock, Search, X } from 'lucide-react';
import { Article, ArticleBlock, CtaVariant, ImageGroupItem, LText, Locale, RichItem, TextColor, emptyLText } from '@/types/article';
import { Promotion } from '@/types/promotion';
import { DEFAULT_ICON } from '@/lib/icons';
import { uid } from '@/lib/blocks';
import IconPicker from './IconPicker';
import ImagePicker from './ImagePicker';
import RichTextArea from './RichTextArea';

// ---------------------------------------------------------------------------
// small shared building blocks
// ---------------------------------------------------------------------------

function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function assertNever(x: never): never {
  throw new Error('Unhandled block type: ' + JSON.stringify(x));
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">{label}</label>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400 ${mono ? 'font-mono' : ''
        }`}
    />
  );
}

function PlainTextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y placeholder:text-gray-400"
    />
  );
}

function MiniBtn({
  icon: Icon,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${disabled
        ? 'text-gray-300 dark:text-gray-700 cursor-default'
        : danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
      <Icon size={15} />
    </button>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start inline-flex items-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-700 text-blue-600 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

/** Row wrapper for any list-ish item: stacked field(s) on the left, move/remove rail on the right. */
function ItemRow({
  children,
  canMoveUp,
  canMoveDown,
  canRemove,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  children: React.ReactNode;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="flex-1 min-w-0 flex flex-col gap-2">{children}</div>
      <div className="flex flex-col gap-0.5 flex-none">
        <MiniBtn icon={ChevronUp} onClick={onMoveUp} disabled={!canMoveUp} />
        <MiniBtn icon={ChevronDown} onClick={onMoveDown} disabled={!canMoveDown} />
        <MiniBtn icon={Trash2} onClick={onRemove} disabled={!canRemove} danger />
      </div>
    </div>
  );
}

/** Segmented control for small enum choices (heading level, variants, styles, modes). */
function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 min-w-[90px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${value === opt.value
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Label for a cta variant option: a small round dot in the button's own accent colour, plus text. */
function CtaVariantLabel({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/** Add/remove/move list editor for a plain LText[] array (list items, sources, etc.). No colour —
 *  these blocks have no per-item or block-level colour control. */
function LTextListEditor({
  items,
  locale,
  onChange,
  addLabel,
  rich,
  placeholder,
}: {
  items: LText[];
  locale: Locale;
  onChange: (items: LText[]) => void;
  addLabel: string;
  rich?: boolean;
  placeholder?: string;
}) {
  const update = (idx: number, v: string) => onChange(items.map((it, j) => (j === idx ? { ...it, [locale]: v } : it)));
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, idx) => (
        <ItemRow
          key={idx}
          canMoveUp={idx > 0}
          canMoveDown={idx < items.length - 1}
          canRemove={items.length > 1}
          onMoveUp={() => onChange(moveInArray(items, idx, idx - 1))}
          onMoveDown={() => onChange(moveInArray(items, idx, idx + 1))}
          onRemove={() => onChange(items.filter((_, j) => j !== idx))}
        >
          {rich ? (
            <RichTextArea value={it[locale]} onChange={(v) => update(idx, v)} placeholder={placeholder} rows={2} />
          ) : (
            <TextInput value={it[locale]} onChange={(v) => update(idx, v)} placeholder={placeholder} />
          )}
        </ItemRow>
      ))}
      <AddButton label={addLabel} onClick={() => onChange([...items, emptyLText()])} />
    </div>
  );
}

/** Add/remove/move list editor for a RichItem[] array (highlight, keyTakeaways). Each item carries
 *  its own colour, so every row's RichTextArea toolbar edits that ONE item's colour independently. */
function RichItemListEditor({
  items,
  locale,
  onChange,
  addLabel,
  placeholder,
}: {
  items: RichItem[];
  locale: Locale;
  onChange: (items: RichItem[]) => void;
  addLabel: string;
  placeholder?: string;
}) {
  const update = (idx: number, v: string) =>
    onChange(items.map((it, j) => (j === idx ? { ...it, text: { ...it.text, [locale]: v } } : it)));
  const updateColor = (idx: number, color: TextColor) =>
    onChange(items.map((it, j) => (j === idx ? { ...it, color } : it)));
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, idx) => (
        <ItemRow
          key={idx}
          canMoveUp={idx > 0}
          canMoveDown={idx < items.length - 1}
          canRemove={items.length > 1}
          onMoveUp={() => onChange(moveInArray(items, idx, idx - 1))}
          onMoveDown={() => onChange(moveInArray(items, idx, idx + 1))}
          onRemove={() => onChange(items.filter((_, j) => j !== idx))}
        >
          <RichTextArea
            value={it.text[locale]}
            onChange={(v) => update(idx, v)}
            placeholder={placeholder}
            rows={2}
            color={it.color}
            onColorChange={(color) => updateColor(idx, color)}
          />
        </ItemRow>
      ))}
      <AddButton label={addLabel} onClick={() => onChange([...items, { text: emptyLText() }])} />
    </div>
  );
}

/** Raw ID list (add / edit / remove) — the fallback used when the picker's fetch fails. */
function IdListEditor({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {ids.map((id, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <TextInput
            value={id}
            onChange={(v) => onChange(ids.map((x, j) => (j === idx ? v : x)))}
            placeholder="ID"
            mono
          />
          <MiniBtn icon={Trash2} onClick={() => onChange(ids.filter((_, j) => j !== idx))} disabled={false} danger />
        </div>
      ))}
      <AddButton label="Add ID" onClick={() => onChange([...ids, ''])} />
    </div>
  );
}

/** No separate 'loading': the picker is only mounted once the fetch is wanted, so 'idle' already
 *  means "in flight" to every caller — and setting a loading state from the effect body is exactly
 *  the cascading-render the `react-hooks/set-state-in-effect` lint rule rejects. */
type FetchStatus = 'idle' | 'success' | 'error';

/** Fetches `url` lazily — nothing happens until `enabled` flips true — and again only if `url` or
 *  `enabled` changes, which in practice means once per picker.
 *
 *  Each run owns its request and cancels only its own via `cancelled`. A `startedRef` guard used
 *  to sit here to make it fetch once per component instance; it deadlocked the hook under React's
 *  StrictMode double-invoke, which runs the effect, tears it down, and runs it again on the SAME
 *  instance — so the ref was already true on the second run, no second request went out, and the
 *  first one's response landed in a closure the teardown had marked cancelled. Status never left
 *  'loading' and the picker sat on "Loading…" forever. Don't reintroduce a cross-run guard. */
function useFetchList<T>(url: string, enabled: boolean): { status: FetchStatus; data: T[] } {
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then((json: T[]) => {
        if (!cancelled) {
          setData(json);
          setStatus('success');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, url]);

  return { status, data };
}

interface PickerOption {
  primary: string;
  secondary?: string;
}

/** Searchable checkbox picker for manual "related" ids, with selected items shown as removable
 *  chips above the list. Falls back to a raw `IdListEditor` if the backing fetch fails, and renders
 *  ids that no longer resolve to a real record as an "Unknown (id)" chip rather than dropping them. */
function RelatedIdPicker<T extends { id: string }>({
  ids,
  onChange,
  fetchUrl,
  enabled,
  filterItem,
  toOption,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  fetchUrl: string;
  enabled: boolean;
  filterItem: (item: T) => boolean;
  toOption: (item: T) => PickerOption;
}) {
  const { status, data } = useFetchList<T>(fetchUrl, enabled);
  const [search, setSearch] = useState('');

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-amber-500 px-1">Could not load the list — enter IDs manually instead.</div>
        <IdListEditor ids={ids} onChange={onChange} />
      </div>
    );
  }

  const loading = status === 'idle';
  const items = data.filter(filterItem);
  const byId = new Map(items.map((it) => [it.id, it]));

  const q = search.trim().toLowerCase();
  const visible = q
    ? items.filter((it) => {
      const opt = toOption(it);
      return opt.primary.toLowerCase().includes(q) || (opt.secondary ?? '').toLowerCase().includes(q);
    })
    : items;

  const toggle = (id: string) => {
    onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  return (
    <div className="flex flex-col gap-2">
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => {
            const found = byId.get(id);
            const label = found ? toOption(found).primary : loading ? id : `Unknown (${id})`;
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-1.5 py-1 rounded-full text-xs font-semibold ${found
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-500'
                  }`}
              >
                <span className="truncate max-w-[160px]">{label}</span>
                <button
                  type="button"
                  onClick={() => onChange(ids.filter((x) => x !== id))}
                  className="flex-none hover:opacity-70"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 px-1 py-2">Loading…</div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="text-sm text-gray-400 px-1 py-2">No matches</div>
            ) : (
              visible.map((it) => {
                const opt = toOption(it);
                const checked = ids.includes(it.id);
                return (
                  <label
                    key={it.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer border transition-colors ${checked
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(it.id)} className="accent-blue-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-gray-900 dark:text-white truncate">{opt.primary}</span>
                      {opt.secondary && <span className="block text-xs text-gray-400 truncate">{opt.secondary}</span>}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageField({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <ImagePicker value={url} onChange={onChange} />
      <TextInput value={url} onChange={onChange} placeholder="or paste an image URL" mono />
    </div>
  );
}

// ---------------------------------------------------------------------------
// main component
// ---------------------------------------------------------------------------

interface BlockEditorFormProps {
  block: ArticleBlock;
  locale: Locale;
  onChange: (next: ArticleBlock) => void;
}

export default function BlockEditorForm({ block, locale, onChange }: BlockEditorFormProps): React.ReactElement {
  switch (block.type) {
    case 'intro':
      return (
        <RichTextArea
          value={block.text[locale]}
          onChange={(v) => onChange({ ...block, text: { ...block.text, [locale]: v } })}
          placeholder="Intro paragraph that sums up the article"
          rows={4}
          color={block.color}
          onColorChange={(color) => onChange({ ...block, color })}
        />
      );

    case 'heading':
      return (
        <div className="flex flex-col gap-3">
          <SegmentedControl<2 | 3>
            options={[
              { value: 2, label: 'H2' },
              { value: 3, label: 'H3' },
            ]}
            value={block.level}
            onChange={(level) => onChange({ ...block, level })}
          />
          <TextInput
            value={block.text[locale]}
            onChange={(v) => onChange({ ...block, text: { ...block.text, [locale]: v } })}
            placeholder="Heading text"
          />
        </div>
      );

    case 'paragraph':
      return (
        <RichTextArea
          value={block.text[locale]}
          onChange={(v) => onChange({ ...block, text: { ...block.text, [locale]: v } })}
          placeholder="Type the paragraph content..."
          rows={5}
          color={block.color}
          onColorChange={(color) => onChange({ ...block, color })}
        />
      );

    case 'image':
      return (
        <div className="flex flex-col gap-3">
          <ImageField url={block.url} onChange={(url) => onChange({ ...block, url })} />
          <Field label="Caption">
            <TextInput
              value={block.caption[locale]}
              onChange={(v) => onChange({ ...block, caption: { ...block.caption, [locale]: v } })}
              placeholder="Image caption"
            />
          </Field>
        </div>
      );

    case 'imageGroup':
      return (
        <div className="flex flex-col gap-2">
          <Field label="Group title">
            <TextInput
              value={block.title?.[locale] ?? ''}
              onChange={(v) => onChange({ ...block, title: { ...(block.title ?? emptyLText()), [locale]: v } })}
              placeholder="e.g. 3 ข้อสังเกต Order Block (เว้นว่างได้)"
            />
          </Field>
          {block.items.map((item, idx) => (
            <ItemRow
              key={item.id}
              canMoveUp={idx > 0}
              canMoveDown={idx < block.items.length - 1}
              canRemove={block.items.length > 1}
              onMoveUp={() => onChange({ ...block, items: moveInArray(block.items, idx, idx - 1) })}
              onMoveDown={() => onChange({ ...block, items: moveInArray(block.items, idx, idx + 1) })}
              onRemove={() => onChange({ ...block, items: block.items.filter((_, j) => j !== idx) })}
            >
              {(() => {
                // One updater for the row, so every field below reads the same way and none of
                // them can accidentally rebuild the array with a different shape.
                const patch = (fields: Partial<ImageGroupItem>) =>
                  onChange({ ...block, items: block.items.map((it, j) => (j === idx ? { ...it, ...fields } : it)) });
                return (
                  <div className="flex flex-col gap-3">
                    <ImageField url={item.url} onChange={(url) => patch({ url })} />
                    <Field label="Heading">
                      <TextInput
                        value={item.title[locale]}
                        onChange={(v) => patch({ title: { ...item.title, [locale]: v } })}
                        placeholder="e.g. ข้อ 2 ต้องมี Imbalance"
                      />
                    </Field>
                    <Field label="Text">
                      <RichTextArea
                        value={item.body[locale]}
                        onChange={(v) => patch({ body: { ...item.body, [locale]: v } })}
                        placeholder="Describe the image... **bold**, *italic*, [links](https://)"
                        rows={3}
                        color={item.color}
                        onColorChange={(color) => patch({ color })}
                      />
                    </Field>
                  </div>
                );
              })()}
            </ItemRow>
          ))}
          <AddButton
            label="Add image row"
            onClick={() =>
              onChange({ ...block, items: [...block.items, { id: uid('ig'), url: '', title: emptyLText(), body: emptyLText() }] })
            }
          />
        </div>
      );

    case 'highlight':
      return (
        <div className="flex flex-col gap-3">
          {/* <SegmentedControl<'info' | 'warning' | 'success' | 'danger'> */}
          <SegmentedControl<'answer' | 'warning' | 'info'>
            options={[
              { value: 'answer', label: 'Answer' },
              { value: 'info', label: 'Info' },
              { value: 'warning', label: 'Warning' },
              // { value: 'success', label: 'Success' },
              // { value: 'danger', label: 'Danger' },
            ]}
            value={block.variant}
            onChange={(variant) => onChange({ ...block, variant })}
          />
          <Field label="Box title">
            <TextInput
              value={block.title[locale]}
              onChange={(v) => onChange({ ...block, title: { ...block.title, [locale]: v } })}
              placeholder="Box title"
            />
          </Field>
          <Field label="Items">
            <RichItemListEditor
              items={block.items}
              locale={locale}
              onChange={(items) => onChange({ ...block, items })}
              addLabel="Add point"
              placeholder="Point text"
            />
          </Field>
        </div>
      );

    case 'keyTakeaways':
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-semibold">
            <Lock size={14} className="flex-none" />
            Heading is fixed to &quot;Key Takeaways&quot;
          </div>
          <RichItemListEditor
            items={block.items}
            locale={locale}
            onChange={(items) => onChange({ ...block, items })}
            addLabel="Add takeaway"
            placeholder="Takeaway text"
          />
        </div>
      );

    case 'list':
      return (
        <div className="flex flex-col gap-3">
          <SegmentedControl<'bullet' | 'number'>
            options={[
              { value: 'bullet', label: '• Bullet' },
              { value: 'number', label: '1. Numbered' },
            ]}
            value={block.style}
            onChange={(style) => onChange({ ...block, style })}
          />
          <LTextListEditor
            items={block.items}
            locale={locale}
            onChange={(items) => onChange({ ...block, items })}
            addLabel="Add item"
            placeholder="List item"
          />
        </div>
      );

    case 'comparisonTable': {
      const addColumn = () =>
        onChange({
          ...block,
          columns: [...block.columns, emptyLText()],
          rows: block.rows.map((row) => [...row, emptyLText()]),
        });
      const removeColumn = (ci: number) => {
        if (block.columns.length <= 1) return;
        onChange({
          ...block,
          columns: block.columns.filter((_, j) => j !== ci),
          rows: block.rows.map((row) => row.filter((_, j) => j !== ci)),
        });
      };
      const addRow = () => onChange({ ...block, rows: [...block.rows, block.columns.map(() => emptyLText())] });
      const removeRow = (ri: number) => {
        if (block.rows.length <= 1) return;
        onChange({ ...block, rows: block.rows.filter((_, j) => j !== ri) });
      };
      const updateColumn = (ci: number, v: string) =>
        onChange({ ...block, columns: block.columns.map((c, j) => (j === ci ? { ...c, [locale]: v } : c)) });
      const updateCell = (ri: number, ci: number, v: string) =>
        onChange({
          ...block,
          rows: block.rows.map((row, r) =>
            r === ri ? row.map((c, cc) => (cc === ci ? { ...c, [locale]: v } : c)) : row
          ),
        });
      return (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {block.columns.map((col, ci) => (
                    <th key={ci} className="p-1.5 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-1">
                        <input
                          value={col[locale]}
                          onChange={(e) => updateColumn(ci, e.target.value)}
                          className="w-full min-w-[100px] bg-transparent outline-none text-xs font-bold text-gray-600 dark:text-gray-300 px-1 py-1"
                        />
                        {block.columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColumn(ci)}
                            className="text-red-400 hover:text-red-600 flex-none"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="p-1.5 bg-gray-50 dark:bg-gray-800 w-8">
                    <button
                      type="button"
                      onClick={addColumn}
                      title="Add column"
                      className="text-blue-600 hover:text-blue-700 flex items-center justify-center w-full"
                    >
                      <Plus size={16} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-1.5 border-t border-gray-100 dark:border-gray-800">
                        <input
                          value={cell[locale]}
                          onChange={(e) => updateCell(ri, ci, e.target.value)}
                          className="w-full min-w-[100px] bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200 px-1 py-1"
                        />
                      </td>
                    ))}
                    <td className="p-1.5 border-t border-gray-100 dark:border-gray-800 text-center">
                      {block.rows.length > 1 && (
                        <button type="button" onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AddButton label="Add row" onClick={addRow} />
        </div>
      );
    }

    case 'keyValue':
      return (
        <div className="flex flex-col gap-3">
          <Field label="Title">
            <TextInput
              value={block.title[locale]}
              onChange={(v) => onChange({ ...block, title: { ...block.title, [locale]: v } })}
              placeholder="e.g. Conditions"
            />
          </Field>
          <div className="flex flex-col gap-2">
            {block.rows.map((row, idx) => (
              <ItemRow
                key={idx}
                canMoveUp={idx > 0}
                canMoveDown={idx < block.rows.length - 1}
                canRemove={block.rows.length > 1}
                onMoveUp={() => onChange({ ...block, rows: moveInArray(block.rows, idx, idx - 1) })}
                onMoveDown={() => onChange({ ...block, rows: moveInArray(block.rows, idx, idx + 1) })}
                onRemove={() => onChange({ ...block, rows: block.rows.filter((_, j) => j !== idx) })}
              >
                <div className="flex gap-2">
                  <TextInput
                    value={row.key[locale]}
                    onChange={(v) =>
                      onChange({
                        ...block,
                        rows: block.rows.map((r, j) => (j === idx ? { ...r, key: { ...r.key, [locale]: v } } : r)),
                      })
                    }
                    placeholder="Key"
                  />
                  <TextInput
                    value={row.value[locale]}
                    onChange={(v) =>
                      onChange({
                        ...block,
                        rows: block.rows.map((r, j) =>
                          j === idx ? { ...r, value: { ...r.value, [locale]: v } } : r
                        ),
                      })
                    }
                    placeholder="Value"
                  />
                </div>
              </ItemRow>
            ))}
          </div>
          <AddButton
            label="Add row"
            onClick={() => onChange({ ...block, rows: [...block.rows, { key: emptyLText(), value: emptyLText() }] })}
          />
        </div>
      );

    case 'featureGrid':
      return (
        <div className="flex flex-col gap-3">
          <Field label="Grid title">
            <TextInput
              value={block.title[locale]}
              onChange={(v) => onChange({ ...block, title: { ...block.title, [locale]: v } })}
              placeholder="Grid title"
            />
          </Field>
          <div className="flex flex-col gap-2">
            {block.items.map((item, idx) => (
              <ItemRow
                key={idx}
                canMoveUp={idx > 0}
                canMoveDown={idx < block.items.length - 1}
                canRemove={block.items.length > 1}
                onMoveUp={() => onChange({ ...block, items: moveInArray(block.items, idx, idx - 1) })}
                onMoveDown={() => onChange({ ...block, items: moveInArray(block.items, idx, idx + 1) })}
                onRemove={() => onChange({ ...block, items: block.items.filter((_, j) => j !== idx) })}
              >
                <div className="flex gap-2 items-start">
                  <IconPicker
                    value={item.icon}
                    onChange={(icon) =>
                      onChange({ ...block, items: block.items.map((it, j) => (j === idx ? { ...it, icon } : it)) })
                    }
                  />
                  <div className="flex-1 flex flex-col gap-2">
                    <TextInput
                      value={item.title[locale]}
                      onChange={(v) =>
                        onChange({
                          ...block,
                          items: block.items.map((it, j) =>
                            j === idx ? { ...it, title: { ...it.title, [locale]: v } } : it
                          ),
                        })
                      }
                      placeholder="Title"
                    />
                    <TextInput
                      value={item.text[locale]}
                      onChange={(v) =>
                        onChange({
                          ...block,
                          items: block.items.map((it, j) =>
                            j === idx ? { ...it, text: { ...it.text, [locale]: v } } : it
                          ),
                        })
                      }
                      placeholder="Short description"
                    />
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
          <AddButton
            label="Add card"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { icon: DEFAULT_ICON, title: emptyLText(), text: emptyLText() }],
              })
            }
          />
        </div>
      );

    case 'featureCardGrid':
      return (
        <div className="flex flex-col gap-3">
          <Field label="Overall title">
            <TextInput
              value={block.title[locale]}
              onChange={(v) => onChange({ ...block, title: { ...block.title, [locale]: v } })}
              placeholder="e.g. Manage your trading costs with Earnex"
            />
          </Field>
          <div className="flex flex-col gap-2">
            {block.items.length === 0 ? (
              <div className="text-center py-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400">
                No cards yet
              </div>
            ) : (
              block.items.map((item, idx) => (
                <ItemRow
                  key={idx}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < block.items.length - 1}
                  canRemove={block.items.length > 1}
                  onMoveUp={() => onChange({ ...block, items: moveInArray(block.items, idx, idx - 1) })}
                  onMoveDown={() => onChange({ ...block, items: moveInArray(block.items, idx, idx + 1) })}
                  onRemove={() => onChange({ ...block, items: block.items.filter((_, j) => j !== idx) })}
                >
                  <div className="flex gap-2 items-start">
                    <IconPicker
                      value={item.icon}
                      onChange={(icon) =>
                        onChange({ ...block, items: block.items.map((it, j) => (j === idx ? { ...it, icon } : it)) })
                      }
                    />
                    <div className="flex-1">
                      <RichTextArea
                        value={item.content[locale]}
                        onChange={(v) =>
                          onChange({
                            ...block,
                            items: block.items.map((it, j) =>
                              j === idx ? { ...it, content: { ...it.content, [locale]: v } } : it
                            ),
                          })
                        }
                        placeholder="Card text... add links with [text](https://)"
                        rows={3}
                        color={item.color}
                        onColorChange={(color) =>
                          onChange({ ...block, items: block.items.map((it, j) => (j === idx ? { ...it, color } : it)) })
                        }
                      />
                    </div>
                  </div>
                </ItemRow>
              ))
            )}
          </div>
          <AddButton
            label="Add card"
            onClick={() =>
              onChange({ ...block, items: [...block.items, { icon: DEFAULT_ICON, content: emptyLText() }] })
            }
          />
          <Field label="Footnote (optional)">
            <TextInput
              value={block.footnote[locale]}
              onChange={(v) => onChange({ ...block, footnote: { ...block.footnote, [locale]: v } })}
              placeholder="* Subject to each broker and account type."
            />
          </Field>
        </div>
      );

    case 'steps':
      return (
        <div className="flex flex-col gap-3">
          <TextInput
            value={block.title[locale]}
            onChange={(v) => onChange({ ...block, title: { ...block.title, [locale]: v } })}
            placeholder="Steps title"
          />
          {/* One step per row — number, title, description, delete. The step's position IS
              its number, so reordering is done by deleting/retyping, not arrow buttons. */}
          {block.steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-7 h-7 flex-none rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <TextInput
                  value={step.title[locale]}
                  onChange={(v) =>
                    onChange({
                      ...block,
                      steps: block.steps.map((s, j) => (j === idx ? { ...s, title: { ...s.title, [locale]: v } } : s)),
                    })
                  }
                  placeholder="Step title"
                />
                <TextInput
                  value={step.desc[locale]}
                  onChange={(v) =>
                    onChange({
                      ...block,
                      steps: block.steps.map((s, j) => (j === idx ? { ...s, desc: { ...s.desc, [locale]: v } } : s)),
                    })
                  }
                  placeholder="Description"
                />
              </div>
              <MiniBtn
                icon={Trash2}
                onClick={() => onChange({ ...block, steps: block.steps.filter((_, j) => j !== idx) })}
                disabled={block.steps.length <= 2}
                danger
              />
            </div>
          ))}
          <AddButton
            label="Add step"
            onClick={() => onChange({ ...block, steps: [...block.steps, { title: emptyLText(), desc: emptyLText() }] })}
          />
        </div>
      );

    case 'rebateSteps':
      return (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
          <Lock size={16} className="flex-none" />
          <div className="text-sm font-semibold">
            Preset graphic, no configuration. The 5-step cashback infographic renders automatically in the active
            locale.
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <TextInput
                value={block.text[locale]}
                onChange={(v) => onChange({ ...block, text: { ...block.text, [locale]: v } })}
                placeholder="Button text"
              />
            </div>
            <div className="flex-1">
              <TextInput value={block.url} onChange={(url) => onChange({ ...block, url })} placeholder="Destination URL" mono />
            </div>
          </div>
          <SegmentedControl<CtaVariant>
            options={[
              { value: 'sky', label: <CtaVariantLabel color="#317AE6" label="ฟ้า (Sky)" /> },
              { value: 'navy', label: <CtaVariantLabel color="#1E3A8A" label="น้ำเงิน (Navy)" /> },
              { value: 'green', label: <CtaVariantLabel color="#2E9E57" label="เขียว (Green)" /> },
            ]}
            value={block.variant}
            onChange={(variant) => onChange({ ...block, variant })}
          />
          <Field label="Caption (optional)">
            <RichTextArea
              value={block.caption[locale]}
              onChange={(v) => onChange({ ...block, caption: { ...block.caption, [locale]: v } })}
              placeholder="e.g. Forex/CFD trading carries risk. Read the [terms](url) first."
              rows={2}
              color={block.color}
              onColorChange={(color) => onChange({ ...block, color })}
            />
          </Field>
        </div>
      );

    case 'faq':
      return (
        <div className="flex flex-col gap-2">
          {block.items.map((item, idx) => (
            <ItemRow
              key={idx}
              canMoveUp={idx > 0}
              canMoveDown={idx < block.items.length - 1}
              canRemove={block.items.length > 1}
              onMoveUp={() => onChange({ ...block, items: moveInArray(block.items, idx, idx - 1) })}
              onMoveDown={() => onChange({ ...block, items: moveInArray(block.items, idx, idx + 1) })}
              onRemove={() => onChange({ ...block, items: block.items.filter((_, j) => j !== idx) })}
            >
              <TextInput
                value={item.q[locale]}
                onChange={(v) =>
                  onChange({
                    ...block,
                    items: block.items.map((it, j) => (j === idx ? { ...it, q: { ...it.q, [locale]: v } } : it)),
                  })
                }
                placeholder="Question"
              />
              <RichTextArea
                value={item.a[locale]}
                onChange={(v) =>
                  onChange({
                    ...block,
                    items: block.items.map((it, j) => (j === idx ? { ...it, a: { ...it.a, [locale]: v } } : it)),
                  })
                }
                placeholder="Answer"
                rows={2}
                color={item.color}
                onColorChange={(color) =>
                  onChange({ ...block, items: block.items.map((it, j) => (j === idx ? { ...it, color } : it)) })
                }
              />
            </ItemRow>
          ))}
          <AddButton
            label="Add question"
            onClick={() => onChange({ ...block, items: [...block.items, { q: emptyLText(), a: emptyLText() }] })}
          />
        </div>
      );

    case 'sources':
      return (
        <div className="flex flex-col gap-2">
          {block.items.map((item, idx) => (
            <ItemRow
              key={idx}
              canMoveUp={idx > 0}
              canMoveDown={idx < block.items.length - 1}
              canRemove={block.items.length > 1}
              onMoveUp={() => onChange({ ...block, items: moveInArray(block.items, idx, idx - 1) })}
              onMoveDown={() => onChange({ ...block, items: moveInArray(block.items, idx, idx + 1) })}
              onRemove={() => onChange({ ...block, items: block.items.filter((_, j) => j !== idx) })}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-6 flex-none">[{idx + 1}]</span>
                <TextInput
                  value={item.text[locale]}
                  onChange={(v) =>
                    onChange({
                      ...block,
                      items: block.items.map((it, j) => (j === idx ? { ...it, text: { ...it.text, [locale]: v } } : it)),
                    })
                  }
                  placeholder="Source name"
                />
              </div>
              <TextInput
                value={item.url}
                onChange={(url) =>
                  onChange({ ...block, items: block.items.map((it, j) => (j === idx ? { ...it, url } : it)) })
                }
                placeholder="URL"
                mono
              />
            </ItemRow>
          ))}
          <AddButton
            label="Add source"
            onClick={() => onChange({ ...block, items: [...block.items, { text: emptyLText(), url: '' }] })}
          />
        </div>
      );

    case 'lineBanner': {
      const urlOk = !block.buttonUrl || /^https?:\/\//.test(block.buttonUrl);
      return (
        <div className="flex flex-col gap-3">
          <Field label="Message">
            <PlainTextArea
              value={block.message[locale]}
              onChange={(v) => onChange({ ...block, message: { ...block.message, [locale]: v } })}
              placeholder="Invitation message"
              rows={2}
            />
          </Field>
          <Field label="Button label">
            <TextInput
              value={block.buttonLabel[locale]}
              onChange={(v) => onChange({ ...block, buttonLabel: { ...block.buttonLabel, [locale]: v } })}
              placeholder="Contact us"
            />
          </Field>
          <Field label="Button URL">
            <TextInput
              value={block.buttonUrl}
              onChange={(buttonUrl) => onChange({ ...block, buttonUrl })}
              placeholder="https://lin.ee/xxxx"
              mono
            />
            {!block.buttonUrl && (
              <span className="text-xs text-amber-500">No link set yet — required before publishing</span>
            )}
            {block.buttonUrl && !urlOk && (
              <span className="text-xs text-red-500">Invalid URL — must start with http:// or https://</span>
            )}
          </Field>
        </div>
      );
    }

    case 'related':
      return (
        <div className="flex flex-col gap-3">
          <SegmentedControl<'auto' | 'manual'>
            options={[
              { value: 'auto', label: 'Automatic' },
              { value: 'manual', label: 'Manual' },
            ]}
            value={block.mode}
            onChange={(mode) => onChange({ ...block, mode })}
          />
          {block.mode === 'auto' ? (
            <div className="text-sm px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              The system automatically picks the 3 latest articles in the same category.
            </div>
          ) : (
            <Field label="Articles">
              <RelatedIdPicker<Article>
                ids={block.ids}
                onChange={(ids) => onChange({ ...block, ids })}
                fetchUrl="/api/articles"
                enabled={block.mode === 'manual'}
                filterItem={(a) => a.status !== 'trash'}
                toOption={(a) => ({ primary: a.title.th, secondary: a.title.en })}
              />
            </Field>
          )}
        </div>
      );

    case 'relatedPromos':
      return (
        <div className="flex flex-col gap-3">
          <SegmentedControl<'auto' | 'manual'>
            options={[
              { value: 'auto', label: 'Automatic' },
              { value: 'manual', label: 'Manual' },
            ]}
            value={block.mode}
            onChange={(mode) => onChange({ ...block, mode })}
          />
          {block.mode === 'auto' ? (
            <div className="text-sm px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              The system automatically picks the 3 latest promotions from the same broker.
            </div>
          ) : (
            <Field label="Promotions">
              <RelatedIdPicker<Promotion>
                ids={block.ids}
                onChange={(ids) => onChange({ ...block, ids })}
                fetchUrl="/api/promotions"
                enabled={block.mode === 'manual'}
                filterItem={() => true}
                toOption={(p) => ({ primary: p.title_th, secondary: p.title_en })}
              />
            </Field>
          )}
        </div>
      );

    default:
      return assertNever(block);
  }
}
