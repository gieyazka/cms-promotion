export type Locale = 'th' | 'en';

/**
 * Every user-visible string in an article is bilingual. Structure (levels, urls,
 * icons, row/column counts) is shared, so th and en can never drift out of shape.
 */
export interface LText {
  th: string;
  en: string;
}

export const emptyLText = (): LText => ({ th: '', en: '' });

export type ArticleStatus = 'draft' | 'published' | 'archived' | 'trash';

export type BlockType =
  | 'intro'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'highlight'
  | 'keyTakeaways'
  | 'list'
  | 'comparisonTable'
  | 'keyValue'
  | 'featureGrid'
  | 'featureCardGrid'
  | 'steps'
  | 'rebateSteps'
  | 'cta'
  | 'faq'
  | 'sources'
  | 'lineBanner'
  | 'related'
  | 'relatedPromos';

export type HighlightVariant = 'info' | 'warning' | 'success' | 'danger';
export type CtaVariant = 'sky' | 'navy' | 'green';
export type ListStyle = 'bullet' | 'number';
export type RelatedMode = 'auto' | 'manual';

/** Author-selectable text colour for a rich-text block. See `color?` on the block interfaces below. */
export type TextColor = 'default' | 'blue' | 'navy' | 'red' | 'green' | 'gold';

interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface IntroBlock extends BaseBlock {
  type: 'intro';
  text: LText;
  /** Absent means 'default' — inherit the article's body colour. Shared across locales. */
  color?: TextColor;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 2 | 3;
  text: LText;
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  text: LText;
  /** Absent means 'default' — inherit the article's body colour. Shared across locales. */
  color?: TextColor;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  url: string;
  caption: LText;
}

/**
 * A single item in an item-shaped block (highlight, keyTakeaways), with its own colour.
 * Colour is structure, so — like every other non-leaf field — it is shared across th/en
 * rather than living inside `text`.
 */
export interface RichItem {
  text: LText;
  /** Absent means 'default' — inherit the article's body colour. Shared across locales. */
  color?: TextColor;
}

export interface HighlightBlock extends BaseBlock {
  type: 'highlight';
  variant: HighlightVariant;
  title: LText;
  items: RichItem[];
}

export interface KeyTakeawaysBlock extends BaseBlock {
  type: 'keyTakeaways';
  items: RichItem[];
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  style: ListStyle;
  items: LText[];
}

export interface ComparisonTableBlock extends BaseBlock {
  type: 'comparisonTable';
  columns: LText[];
  rows: LText[][];
}

export interface KeyValueBlock extends BaseBlock {
  type: 'keyValue';
  title: LText;
  rows: { key: LText; value: LText }[];
}

export interface FeatureGridItem {
  icon: string;
  title: LText;
  text: LText;
}

export interface FeatureGridBlock extends BaseBlock {
  type: 'featureGrid';
  title: LText;
  items: FeatureGridItem[];
}

export interface FeatureCardGridItem {
  icon: string;
  content: LText;
  /** Absent means 'default' — inherit the article's body colour. Shared across locales. */
  color?: TextColor;
}

export interface FeatureCardGridBlock extends BaseBlock {
  type: 'featureCardGrid';
  title: LText;
  footnote: LText;
  items: FeatureCardGridItem[];
}

export interface StepItem {
  title: LText;
  desc: LText;
}

export interface StepsBlock extends BaseBlock {
  type: 'steps';
  title: LText;
  steps: StepItem[];
}

/** Preset 5-step cashback graphic. Copy is baked into the renderer, so it has no fields. */
export interface RebateStepsBlock extends BaseBlock {
  type: 'rebateSteps';
}

export interface CtaBlock extends BaseBlock {
  type: 'cta';
  url: string;
  variant: CtaVariant;
  text: LText;
  caption: LText;
  /** Absent means 'default' — inherit the article's body colour. Shared across locales. */
  color?: TextColor;
}

export interface FaqItem {
  q: LText;
  a: LText;
  /** Colours the answer. Absent means 'default' — inherit the article's body colour. Shared across locales. */
  color?: TextColor;
}

export interface FaqBlock extends BaseBlock {
  type: 'faq';
  items: FaqItem[];
}

export interface SourceItem {
  url: string;
  text: LText;
}

export interface SourcesBlock extends BaseBlock {
  type: 'sources';
  items: SourceItem[];
}

export interface LineBannerBlock extends BaseBlock {
  type: 'lineBanner';
  buttonUrl: string;
  message: LText;
  buttonLabel: LText;
}

export interface RelatedBlock extends BaseBlock {
  type: 'related';
  mode: RelatedMode;
  ids: string[];
}

export interface RelatedPromosBlock extends BaseBlock {
  type: 'relatedPromos';
  mode: RelatedMode;
  ids: string[];
}

export type ArticleBlock =
  | IntroBlock
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | HighlightBlock
  | KeyTakeawaysBlock
  | ListBlock
  | ComparisonTableBlock
  | KeyValueBlock
  | FeatureGridBlock
  | FeatureCardGridBlock
  | StepsBlock
  | RebateStepsBlock
  | CtaBlock
  | FaqBlock
  | SourcesBlock
  | LineBannerBlock
  | RelatedBlock
  | RelatedPromosBlock;

export interface Article {
  id: string;
  seo_path: string;
  status: ArticleStatus;
  /**
   * The green "NEW" pill shown on the article itself (independent of `status`).
   * Optional on purpose: **absent means shown.** Always test it as `showNew !== false`,
   * never as `showNew &&` — articles written before this field existed have no value and
   * must keep displaying the badge, which is the prototype's rule.
   */
  showNew?: boolean;
  /**
   * How the cover image is used in the hero. Absent or `false` (the default): the image
   * IS the hero — nothing is drawn on top, because the artwork already carries its own
   * title. `true`: the image becomes a backdrop and the badge + title text are laid over
   * it, for covers that are plain photography.
   *
   * Only meaningful when `cover` is set. Whichever branch runs, the article must end up
   * with exactly one `<h1>`.
   */
  coverOverlay?: boolean;
  /**
   * The small gold pill above the title in the hero. Three states, and the distinction
   * between the last two matters:
   *   undefined -> DEFAULT_HERO_BADGE ("EARNEX KNOWLEDGE"), so articles written before
   *                this field existed keep the badge they have always had
   *   ''        -> no badge at all
   *   'text'    -> that text
   * Resolve it through `heroBadgeText()`; do not read the field directly.
   */
  heroBadge?: string;
  /**
   * Title/badge colour over a cover image. Absent = 'light' (white text), which is what
   * every article rendered before this field existed. 'dark' is for pale covers where
   * white text disappears.
   *
   * Only honoured when the cover is shown with `coverOverlay`. The gradient hero is a
   * dark navy, so dark text there would be invisible — the renderer forces light on it,
   * and the editor only offers the control when an overlaid cover is in play.
   */
  heroTitleColor?: 'light' | 'dark';
  category: string;
  tags: string[];
  owners: string[];
  cover: string;
  /** ISO date (yyyy-mm-dd). Empty until published. */
  pubDate: string;
  views: number;
  createdAt: string;
  /** ISO timestamp of the last edit. */
  updated: string;
  /**
   * ISO timestamp of the last successful push to the Earnex backend. Written by the editor's
   * Save button, the only thing that pushes; the blur autosave never touches it. Bookkeeping
   * only — `backendId`, not this, decides whether the next push creates or updates.
   */
  syncedAt?: string;
  /**
   * The backend's uuid for this article's record — the article's identity on the server. Set
   * from the create response and reused as the path id of `PATCH /knowledge_base/update/{id}`,
   * so every later Save edits that one record instead of adding another.
   *
   * Absent means "no record to address": either never pushed, or pushed back when the create
   * response carried no id. Either way the next Save creates and captures an id, so an article
   * can end up with a stale orphan record on the server. Fix by hand if it matters.
   */
  backendId?: string;
  title: LText;
  metaTitle: LText;
  metaDesc: LText;
  blocks: ArticleBlock[];
}

export const CATEGORIES: { value: string; label: LText }[] = [
  { value: 'trading_tips', label: { th: 'เคล็ดลับการเทรด', en: 'Trading Tips' } },
  { value: 'financial_history', label: { th: 'ประวัติการเงิน', en: 'Financial History' } },
  { value: 'cost_rebate', label: { th: 'ต้นทุนและรีเบท', en: 'Cost & Rebate' } },
];

export const OWNERS: { value: string; label: LText }[] = [
  { value: 'thongkham', label: { th: 'คุณทองคำ', en: 'Khun Thongkham' } },
  { value: 'pimchanok', label: { th: 'คุณพิมพ์ชนก', en: 'Khun Pimchanok' } },
  { value: 'thanakorn', label: { th: 'คุณธนกร', en: 'Khun Thanakorn' } },
  { value: 'kittipong', label: { th: 'คุณกิตติพงษ์', en: 'Khun Kittipong' } },
  { value: 'sasithorn', label: { th: 'คุณศศิธร', en: 'Khun Sasithorn' } },
  { value: 'content-team', label: { th: 'ทีมคอนเทนต์ Earnex', en: 'Earnex Content Team' } },
  { value: 'marketing', label: { th: 'ทีม Marketing', en: 'Marketing Team' } },
];

export const DEFAULT_HERO_BADGE = 'EARNEX KNOWLEDGE';

/**
 * The hero badge label for an article. Returns '' when the author has deliberately
 * cleared it — callers must treat '' as "render no badge", not as "fall back to default".
 */
export function heroBadgeText(article: Pick<Article, 'heroBadge'>): string {
  return article.heroBadge === undefined ? DEFAULT_HERO_BADGE : article.heroBadge.trim();
}

/** Earnex brand colours used by the article preview (not by the CMS chrome). */
export const BRAND = {
  gold: '#D4AF37',
  goldLight: '#F0CD6B',
  navy: '#0B1E3D',
  navyLight: '#14294D',
} as const;
