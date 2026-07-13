import { Article, ArticleBlock, LText, Locale } from '@/types/article';

/**
 * Renders an Article in the backend-facing shape the promotions module previews
 * (`parseToAPI` in app/promotions/new/page.tsx): a flat record plus `translations: [{locale, …}]`,
 * and blocks as `{ type, sort_order, translations: [{ locale, data }] }`.
 *
 * This is a VIEW of the article, not how it is stored. The KB stores structure once and
 * bilingual text at the leaves (`LText`); this format instead duplicates the whole block —
 * structure and all — once per locale. Converting is therefore lossy in one direction: two
 * locales can express different structures here, which the KB type system forbids on purpose.
 * Nothing reads this back. `PUT /api/articles/[id]` still takes the raw `Article`.
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

export function toApiPayload(article: Article) {
  return {
    slug: article.slug,
    status: article.status,
    category: article.category,
    tags: article.tags,
    owners: article.owners,
    cover_image_url: article.cover,
    cover_overlay: article.coverOverlay === true,
    hero_badge: article.heroBadge,
    hero_title_color: article.heroTitleColor ?? 'light',
    show_new: article.showNew !== false,
    pub_date: article.pubDate,
    views: article.views,
    translations: LOCALES.map((locale) => ({
      locale,
      title: article.title[locale],
      meta_title: article.metaTitle[locale],
      meta_desc: article.metaDesc[locale],
    })),
    blocks: article.blocks.map(blockToApi),
  };
}
