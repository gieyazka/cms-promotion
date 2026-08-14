import fs from 'fs/promises';
import path from 'path';

import { Article, ArticleBlock, LText } from '@/types/article';
import { slugify } from '@/lib/blocks';

const DATA_PATH = path.join(process.cwd(), 'data', 'articles.json');

/** Legacy two-way cta variant names, upgraded to the current three-way palette below. */
const LEGACY_CTA_VARIANT: Record<string, 'sky' | 'navy'> = { primary: 'sky', secondary: 'navy' };

/**
 * Upgrades a legacy highlight/keyTakeaways item ({th, en}) to the current RichItem shape
 * ({ text: {th, en} }), so an article file written before the per-item colour migration still
 * loads. A row that already has the `text` key is left untouched.
 *
 * Also upgrades a legacy cta `variant` of 'primary'/'secondary' to 'sky'/'navy', so an
 * un-migrated file still loads under the current three-way sky/navy/green palette.
 */
function normalizeBlock(block: ArticleBlock): ArticleBlock {
  if (block.type === 'cta' && block.variant in LEGACY_CTA_VARIANT) {
    return { ...block, variant: LEGACY_CTA_VARIANT[block.variant] };
  }
  if (block.type !== 'highlight' && block.type !== 'keyTakeaways') return block;
  return {
    ...block,
    items: block.items.map((item) => ('text' in item ? item : { text: item as LText })),
  };
}

const EMPTY_LTEXT: LText = { th: '', en: '' };

/**
 * `detail` and `alt_banner_image` are newer than most of `data/articles.json` — `detail`
 * used to be `metaDesc`. Both are non-optional in the type and are read as
 * `article.detail[locale]` in the editor, the preview and the API payload, so an article
 * written before them crashes on render. Fill them in here, the way the block upgrades
 * above do, rather than making every reader guard.
 */
function normalizeArticle(article: Article): Article {
  return {
    ...article,
    detail: article.detail ?? article.metaDesc ?? EMPTY_LTEXT,
    alt_banner_image: article.alt_banner_image ?? EMPTY_LTEXT,
    blocks: article.blocks.map(normalizeBlock),
  };
}

/**
 * Same flat-file approach as the promotions store. Note the failure mode: a
 * corrupt or unreadable file reads as an empty list, and the next write would
 * then persist that emptiness. Callers must not write a list they did not read.
 */
export async function readArticles(): Promise<Article[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const articles = Array.isArray(parsed) ? (parsed as Article[]) : [];
    return articles.map(normalizeArticle);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Writes via a temp file + rename. `rename` is atomic, so a reader never observes a
 * half-written file and two writers cannot splice their output together — which is what
 * a plain `writeFile` did: the shorter document landed inside the longer one and left a
 * trailing `] }` that made `JSON.parse` throw, turning every later request into a 500.
 */
export async function writeArticles(articles: Article[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  const tmp = `${DATA_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(articles, null, 2), 'utf-8');
  await fs.rename(tmp, DATA_PATH);
}

/**
 * The only safe way to change the store. Every mutation is a read-modify-write over the
 * WHOLE file, so two of them running concurrently both read the same snapshot and the
 * second one writes back a copy that never saw the first one's change — bulk actions send
 * one PUT per article via `Promise.all`, so selecting six articles lost five of the six
 * edits and could erase an article created in the meantime.
 *
 * `mutate` receives the articles and edits them IN PLACE (push / splice / assign by
 * index); the array is persisted when it returns. Anything the route needs back — the
 * updated record, a not-found marker — comes through the return value.
 *
 * ponytail: an in-process promise chain, which is exactly as wide as the one Next.js
 * server process. Two instances behind a load balancer would still race; that is the
 * point at which this file should become a real datastore, per the note in AGENTS.md.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Guards the invariants `data/articles.json` cannot repair after the fact.
 *
 * `seo_path` is the public URL (`earnex.com/kb/<seo_path>`), so it has to be latin, lowercase,
 * and unique. The rule is `value === slugify(value)` rather than a second regex, so the API
 * enforces exactly what the editor's field produces and the two cannot drift. Thai fails it by
 * construction — `slugify` strips non-latin, so a Thai slug does not survive the round trip.
 *
 * Empty slug and empty category are allowed on anything unpublished, on purpose: the editor's
 * blur autosave POSTs a new article before the author has typed a title (ArticleEditor's
 * `flushSave`/`performSave`), and rejecting that would make creating an article impossible.
 * Publishing is when an article becomes a real, categorised URL, so publishing is where both
 * are required.
 *
 * Call it INSIDE `mutateArticles`, for two reasons: checking against a list read outside the
 * queue lets two concurrent creates both pass on the same slug, and throwing from within the
 * mutation skips the write — so a rejected save leaves `articles.json` byte-for-byte untouched
 * instead of rewriting it with the same content on every retry of the editor's autosave.
 */
export class InvalidArticle extends Error {}

export function assertArticle(
  articles: Article[],
  article: Pick<Article, 'seo_path' | 'status' | 'category'>,
  selfId?: string,
): void {
  const published = article.status === 'published';
  const slug = (article.seo_path ?? '').trim();

  if (published && !(article.category ?? '').trim()) {
    throw new InvalidArticle('บทความที่เผยแพร่ต้องเลือกหมวดหมู่');
  }

  if (!slug) {
    if (published) {
      throw new InvalidArticle(
        'บทความที่เผยแพร่ต้องมี Slug (URL) — ตั้งชื่อไทยล้วนจะได้ slug ว่าง ให้กรอกเป็นอังกฤษเอง',
      );
    }
    return;
  }
  if (slug !== slugify(slug)) {
    throw new InvalidArticle(
      `Slug "${slug}" ใช้ไม่ได้ — ใช้ได้เฉพาะ a-z, 0-9 และ - (ห้ามภาษาไทย ตัวพิมพ์ใหญ่ หรือเว้นวรรค)`,
    );
  }
  const clash = articles.find((a) => a.id !== selfId && (a.seo_path ?? '').trim() === slug);
  if (clash) {
    throw new InvalidArticle(
      `Slug "${slug}" ซ้ำกับบทความ "${clash.title?.th || clash.title?.en || clash.id}"`,
    );
  }
}

export function mutateArticles<T>(mutate: (articles: Article[]) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const articles = await readArticles();
    const result = await mutate(articles);
    await writeArticles(articles);
    return result;
  });
  // A failed mutation must not poison the queue for every request after it.
  writeQueue = run.catch(() => undefined);
  return run;
}
