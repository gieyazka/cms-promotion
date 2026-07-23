import { Article, ArticleBlock, LText, Locale } from '@/types/article';
import { readTime } from '@/lib/blocks';

/**
 * Renders an Article as `KnowledgeBaseCreateInput` — the exact body of
 * `POST {KB_API_BASE}/knowledge_base/create` on the Earnex backend (see `kb-api.ts`).
 * The envelope is the same shape the promotions module previews via `parseToAPI`, minus
 * the promotion-only fields:
 *   - post_date        → article.pubDate (the backend's only date; there is no date_end)
 *   - read_time        → readTime(article) in minutes, computed from the Thai body
 *   - detail           → article.metaDesc[locale] (the nearest one-line text an article has)
 *   - banner_image_url → article.cover
 *   - blocks           → `{ type, sort_order, translations: [{ locale, data }] }`
 *
 * This is a VIEW of the article, not how it is stored. The KB stores structure once and
 * bilingual text at the leaves (`LText`); this format instead duplicates the whole block —
 * structure and all — once per locale. Converting is therefore lossy in one direction: two
 * locales can express different structures here, which the KB type system forbids on purpose.
 * Nothing reads this back. `data/articles.json` and `PUT /api/articles/[id]` still hold and
 * take the raw `Article`.
 */

const LOCALES: Locale[] = ['th', 'en'];

const isLText = (v: unknown): v is LText =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  typeof (v as LText).th === 'string' &&
  typeof (v as LText).en === 'string';

/** Collapses every LText leaf to one locale's string, leaving the surrounding shape intact. */
function localize(value: unknown, locale: Locale): unknown {
  if (isLText(value)) return value[locale];
  if (Array.isArray(value)) return value.map((v) => localize(v, locale));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, localize(v, locale)])
    );
  }
  return value;
}

function blockToApi(block: ArticleBlock, index: number) {
  const { type, ...rest } = block;
  return {
    type,
    sort_order: index,
    translations: LOCALES.map((locale) => ({ locale, data: localize(rest, locale) })),
  };
}

/**
 * A draft has no `pubDate` yet (`newArticle()` starts it as `''`; publishing fills it in), but
 * the backend column is a MySQL DATE — an empty string there fails the insert with
 * `1292 Incorrect date value: ''`. Fall back to the day the article was created so the payload
 * always carries a real `YYYY-MM-DD`; publishing later overwrites it with the chosen date.
 */
function postDate(article: Article): string {
  return (article.pubDate || article.createdAt || article.updated || '').slice(0, 10);
}

export function toApiPayload(article: Article) {
  return {
    post_date: postDate(article),
    tags: article.tags,
    read_time: readTime(article),
    translations: LOCALES.map((locale) => ({
      locale,
      title: article.title[locale],
      detail: article.metaDesc[locale],
      banner_image_url: article.cover || null,
    })),
    blocks: article.blocks.map(blockToApi),
  };
}
