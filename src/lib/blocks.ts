import {
  Article,
  ArticleBlock,
  BlockType,
  LText,
} from '@/types/article';

export const uid = (prefix = 'b') =>
  prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

const t = (th: string, en: string): LText => ({ th, en });

/** Label + lucide icon name for the "add block" menu and block cards. */
export const BLOCK_META: Record<BlockType, { label: LText; icon: string }> = {
  intro: { label: t('ย่อหน้านำ (Intro)', 'Intro Paragraph'), icon: 'TextQuote' },
  heading: { label: t('หัวข้อ (H2/H3)', 'Heading (H2/H3)'), icon: 'Heading' },
  paragraph: { label: t('ย่อหน้า / Rich text', 'Paragraph / Rich text'), icon: 'AlignLeft' },
  image: { label: t('รูปภาพ + คำบรรยาย', 'Image + Caption'), icon: 'Image' },
  highlight: { label: t('กล่องไฮไลต์', 'Highlight Box'), icon: 'AlertCircle' },
  keyTakeaways: { label: t('สรุปประเด็นสำคัญ', 'Key Takeaways'), icon: 'Lightbulb' },
  list: { label: t('รายการ (Bullet / ลำดับเลข)', 'List (Bullet / Numbered)'), icon: 'List' },
  comparisonTable: { label: t('ตารางเปรียบเทียบ', 'Comparison Table'), icon: 'Table' },
  keyValue: { label: t('ตาราง Key–Value', 'Key–Value Table'), icon: 'Rows3' },
  featureGrid: { label: t('กริดการ์ดฟีเจอร์', 'Feature Grid'), icon: 'LayoutGrid' },
  featureCardGrid: { label: t('การ์ดไอคอน + ข้อความ', 'Feature Card Grid'), icon: 'Sparkles' },
  steps: { label: t('ขั้นตอน (Step Process)', 'Step Process'), icon: 'ListOrdered' },
  rebateSteps: { label: t('กราฟิก 5 ขั้นตอน Cashback', '5-Step Cashback Graphic'), icon: 'Coins' },
  cta: { label: t('ปุ่ม CTA', 'CTA Button'), icon: 'MousePointerClick' },
  faq: { label: t('FAQ Accordion', 'FAQ Accordion'), icon: 'MessageCircleQuestion' },
  sources: { label: t('แหล่งอ้างอิง / Fact Check', 'Sources / Fact Check'), icon: 'BookCheck' },
  lineBanner: { label: t('แบนเนอร์ติดต่อ LINE', 'LINE Contact Banner'), icon: 'MessageSquare' },
  related: { label: t('บทความที่เกี่ยวข้อง', 'Related Articles'), icon: 'BookOpen' },
  relatedPromos: { label: t('โปรโมชั่นที่เกี่ยวข้อง', 'Related Promotions'), icon: 'Tag' },
};

/**
 * What the "add block" menu offers, as one flat grid — the picker deliberately has no
 * group headings, so this array's order IS the order on screen.
 *
 * This is the 13 types the source prototype exposed in its Knowledge Base module, plus
 * `related` — which the prototype never put in a menu but did use in its seeded article.
 *
 * `list`, `keyValue`, `steps`, `relatedPromos` and `featureGrid` are deliberately absent:
 * the prototype offered the first four only in its *promotions* module, and never offered
 * `featureGrid` anywhere. They remain fully implemented — type, factory, editing form and
 * renderer — so an article that already contains one keeps working, and re-listing one here
 * is a one-line change. Do not delete them thinking they are dead code.
 */
export const BLOCK_MENU: BlockType[] = [
  'heading',
  'intro',
  'paragraph',
  'image',
  'highlight',
  'featureCardGrid',
  'comparisonTable',
  'rebateSteps',
  'cta',
  'lineBanner',
  'faq',
  'keyTakeaways',
  'sources',
  'related',
];

export function newBlock(type: BlockType): ArticleBlock {
  const id = uid();
  switch (type) {
    case 'intro':
      return { id, type, text: t('เขียนย่อหน้านำที่สรุปประเด็นสำคัญของบทความ', 'Write an intro that sums up the article in one paragraph') };
    case 'heading':
      return { id, type, level: 2, text: t('หัวข้อใหม่', 'New heading') };
    case 'paragraph':
      return { id, type, text: t('พิมพ์เนื้อหาที่นี่ ใช้ **ตัวหนา** *ตัวเอียง* และ [ลิงก์](https://) ได้', 'Type here. **Bold**, *italic* and [links](https://) are supported.') };
    case 'image':
      return { id, type, url: '', caption: t('', '') };
    case 'highlight':
      return { id, type, variant: 'info', title: t('คำแนะนำ', 'Tip'), items: [{ text: t('ประเด็นที่ 1', 'Point 1') }, { text: t('ประเด็นที่ 2', 'Point 2') }] };
    case 'keyTakeaways':
      return { id, type, items: [{ text: t('ประเด็นสรุปข้อที่ 1', 'Takeaway 1') }, { text: t('ประเด็นสรุปข้อที่ 2', 'Takeaway 2') }] };
    case 'list':
      return { id, type, style: 'bullet', items: [t('ข้อที่ 1', 'Item 1'), t('ข้อที่ 2', 'Item 2')] };
    case 'comparisonTable':
      return {
        id,
        type,
        columns: [t('คอลัมน์ 1', 'Column 1'), t('คอลัมน์ 2', 'Column 2')],
        rows: [
          [t('', ''), t('', '')],
          [t('', ''), t('', '')],
        ],
      };
    case 'keyValue':
      return {
        id,
        type,
        title: t('เงื่อนไข', 'Conditions'),
        rows: [{ key: t('', ''), value: t('', '') }],
      };
    case 'featureGrid':
      return {
        id,
        type,
        title: t('จุดเด่น', 'Highlights'),
        items: [
          { icon: 'HandCoins', title: t('หัวข้อ', 'Title'), text: t('คำอธิบายสั้น ๆ', 'Short description') },
          { icon: 'BarChart3', title: t('หัวข้อ', 'Title'), text: t('คำอธิบายสั้น ๆ', 'Short description') },
        ],
      };
    case 'featureCardGrid':
      return {
        id,
        type,
        title: t('บริหารต้นทุนอย่างมีระบบกับ Earnex', 'Manage your trading costs with Earnex'),
        footnote: t('* เป็นไปตามเงื่อนไขของแต่ละโบรกเกอร์และประเภทบัญชี', '* Subject to each broker and account type.'),
        items: [
          { icon: 'HandCoins', content: t('รับ [Rebate](#) คืนสูงสุด **100%** ของค่าคอมมิชชันในทุกการเทรด', 'Get up to **100%** of your commission back as [Rebate](#) on every trade') },
          { icon: 'BarChart3', content: t('ติดตามยอด Rebate สะสมแบบเรียลไทม์ในแอปเดียว', 'Track your accumulated rebates in real time, in one app') },
        ],
      };
    case 'steps':
      return {
        id,
        type,
        title: t('ขั้นตอน', 'Steps'),
        steps: [
          { title: t('ขั้นที่ 1', 'Step 1'), desc: t('', '') },
          { title: t('ขั้นที่ 2', 'Step 2'), desc: t('', '') },
          { title: t('ขั้นที่ 3', 'Step 3'), desc: t('', '') },
        ],
      };
    case 'rebateSteps':
      return { id, type };
    case 'cta':
      return { id, type, url: '#', variant: 'sky', text: t('คลิกที่นี่', 'Click here'), caption: t('', '') };
    case 'faq':
      return { id, type, items: [{ q: t('คำถาม?', 'Question?'), a: t('คำตอบ', 'Answer') }] };
    case 'sources':
      return { id, type, items: [{ url: '#', text: t('แหล่งอ้างอิง', 'Source') }] };
    case 'lineBanner':
      return {
        id,
        type,
        buttonUrl: '',
        message: t('ติดต่อเราเพื่อสอบถามและรับสิทธิประโยชน์ต่างๆ คลิก', 'Contact us for questions and member benefits'),
        buttonLabel: t('ติดต่อเรา', 'Contact us'),
      };
    case 'related':
      return { id, type, mode: 'auto', ids: [] };
    case 'relatedPromos':
      return { id, type, mode: 'auto', ids: [] };
  }
}

export function newArticle(): Article {
  const now = new Date().toISOString();
  return {
    id: '',
    seo_path: '',
    status: 'draft',
    showNew: true,
    category: '',
    tags: [],
    owners: [],
    cover: '',
    pubDate: '',
    views: 0,
    createdAt: now,
    updated: now,
    title: { th: '', en: '' },
    metaTitle: { th: '', en: '' },
    metaDesc: { th: '', en: '' },
    blocks: [newBlock('intro')],
  };
}

/** Latin + Thai slug, matching the prototype's slugify. */
export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9฀-๿\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

/** Blocks whose text feeds the word count / read-time estimate. */
export function wordCount(article: Article, locale: 'th' | 'en' = 'th'): number {
  let text = '';
  for (const b of article.blocks) {
    switch (b.type) {
      case 'intro':
      case 'paragraph':
      case 'heading':
        text += ' ' + b.text[locale];
        break;
      case 'highlight':
        text += ' ' + b.title[locale] + ' ' + b.items.map((i) => i.text[locale]).join(' ');
        break;
      case 'keyTakeaways':
        text += ' ' + b.items.map((i) => i.text[locale]).join(' ');
        break;
      case 'list':
        text += ' ' + b.items.map((i) => i[locale]).join(' ');
        break;
      case 'faq':
        text += ' ' + b.items.map((i) => i.q[locale] + ' ' + i.a[locale]).join(' ');
        break;
      default:
        break;
    }
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function readTime(article: Article, locale: 'th' | 'en' = 'th'): number {
  return Math.max(1, Math.round(wordCount(article, locale) / 180));
}

/** H2 headings only — the table of contents ignores H3. */
export function tocHeadings(article: Article) {
  return article.blocks.filter((b) => b.type === 'heading' && b.level === 2);
}
