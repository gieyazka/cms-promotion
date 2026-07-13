import fs from 'fs/promises';
import path from 'path';

import { Article, ArticleBlock, LText } from '@/types/article';

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

function normalizeArticle(article: Article): Article {
  return { ...article, blocks: article.blocks.map(normalizeBlock) };
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

export async function writeArticles(articles: Article[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(articles, null, 2), 'utf-8');
}
