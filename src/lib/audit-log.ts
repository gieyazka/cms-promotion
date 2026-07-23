import fs from 'fs/promises';
import path from 'path';

import { Article, ArticleBlock } from '@/types/article';

/**
 * Who changed what, appended to `data/audit-log.jsonl` — one JSON object per line.
 *
 * JSONL, not a JSON array, precisely because this file only ever grows: an append never reads
 * the previous contents, so a log write cannot lose earlier entries the way the whole-file
 * rewrite in `articles-store.ts` can (see the persistence notes in AGENTS.md). It also means a
 * single corrupt line costs one entry, not the log.
 *
 * The actor is whatever the browser claims in the `x-actor` header (the admin session's
 * username, see lib/actor.ts). There is no auth on these routes, so it is a record of who was
 * signed in, not proof of identity — good enough for "who touched this article", not for
 * anything adversarial.
 */

const LOG_PATH = path.join(process.cwd(), 'data', 'audit-log.jsonl');

export type AuditAction = 'create' | 'update' | 'delete';

export type AuditChange = {
  /** Article field, or `blocks` for a body edit. */
  field: string;
  /**
   * The values themselves, in their own types — a string stays a string, an `LText` stays
   * `{th, en}`, a missing field stays absent. Formatting them for reading is the log viewer's
   * job (`formatValue` in app/activity/page.tsx): storing `"—"` or `"(ว่าง)"` here would make
   * "the field did not exist" indistinguishable from someone typing those characters.
   * Long strings are the one exception — they are clipped, see `clip`.
   */
  from?: unknown;
  to?: unknown;
  /** Used instead of from/to when a value is too big to be worth storing (the block list). */
  note?: string;
};

export type AuditEntry = {
  at: string;
  actor: string;
  action: AuditAction;
  articleId: string;
  title: string;
  changes: AuditChange[];
};

export function actorFrom(req: Request): string {
  const actor = req.headers.get('x-actor')?.trim();
  return actor || 'unknown';
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await fs.appendFile(LOG_PATH, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (error) {
    // A failed log write must never fail the edit that triggered it.
    console.error('Failed to append audit entry', error);
  }
}

/**
 * Newest first. `limit` caps how many entries come back, not how many are read.
 *
 * `articleId` narrows to one article's history — applied BEFORE the limit, so asking for one
 * article returns its `limit` newest entries rather than whatever survives a global cut.
 */
export async function readAuditLog(limit = 300, articleId?: string): Promise<AuditEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(LOG_PATH, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const entries: AuditEntry[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as AuditEntry;
      if (!articleId || entry.articleId === articleId) entries.push(entry);
    } catch {
      // Skip the damaged line; the rest of the log is still readable.
    }
  }
  return entries.reverse().slice(0, limit);
}

// ---------------------------------------------------------------------------
// diffing
// ---------------------------------------------------------------------------

/** Bookkeeping the editor rewrites on every save — logging it would bury the real edits. */
const IGNORED_FIELDS = new Set(['id', 'createdAt', 'updated', 'views']);

const MAX_VALUE_LENGTH = 140;

/**
 * Stores the value as-is, with one concession to file size: any string longer than
 * `MAX_VALUE_LENGTH` is truncated and marked with an ellipsis — including the strings inside
 * an `LText` or an array, since a whole meta description can arrive that way. Types are
 * otherwise preserved, so the viewer can tell an absent field from an empty one.
 */
function clip(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_VALUE_LENGTH ? value.slice(0, MAX_VALUE_LENGTH) + '…' : value;
  }
  if (Array.isArray(value)) return value.map(clip);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, clip(v)]));
  }
  return value;
}

function blockLabel(block: ArticleBlock): string {
  return `${block.type} (${block.id})`;
}

/** Summarises the body as added / removed / edited blocks rather than a field-by-field dump. */
function diffBlocks(before: ArticleBlock[], after: ArticleBlock[]): AuditChange | null {
  const beforeById = new Map(before.map((b) => [b.id, b]));
  const afterById = new Map(after.map((b) => [b.id, b]));

  const added = after.filter((b) => !beforeById.has(b.id));
  const removed = before.filter((b) => !afterById.has(b.id));
  const edited = after.filter((b) => {
    const previous = beforeById.get(b.id);
    return previous && JSON.stringify(previous) !== JSON.stringify(b);
  });
  const reordered =
    added.length === 0 &&
    removed.length === 0 &&
    before.map((b) => b.id).join() !== after.map((b) => b.id).join();

  if (!added.length && !removed.length && !edited.length && !reordered) return null;

  const parts: string[] = [];
  if (added.length) parts.push(`เพิ่ม ${added.map(blockLabel).join(', ')}`);
  if (removed.length) parts.push(`ลบ ${removed.map(blockLabel).join(', ')}`);
  if (edited.length) parts.push(`แก้ ${edited.map(blockLabel).join(', ')}`);
  if (reordered) parts.push('สลับลำดับบล็อก');

  return { field: 'blocks', note: parts.join(' · ') };
}

/** What changed between two versions of an article, ready to store on an entry. */
export function diffArticles(before: Article, after: Article): AuditChange[] {
  const changes: AuditChange[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    if (IGNORED_FIELDS.has(key) || key === 'blocks') continue;
    const from = (before as unknown as Record<string, unknown>)[key];
    const to = (after as unknown as Record<string, unknown>)[key];
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    // `from`/`to` are omitted rather than set to undefined when the field did not exist —
    // JSON.stringify drops undefined keys anyway, so this keeps the line honest either way.
    changes.push({ field: key, from: clip(from), to: clip(to) });
  }

  const blocks = diffBlocks(before.blocks ?? [], after.blocks ?? []);
  if (blocks) changes.push(blocks);

  return changes;
}

/** The title an entry is filed under, preferring Thai and never empty. */
export function articleLabel(article: Pick<Article, 'title'>): string {
  return article.title?.th?.trim() || article.title?.en?.trim() || '(ไม่มีชื่อ)';
}
