'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileCheck,
  Image as ImageIcon,
  Maximize2,
  Star,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  Article,
  ArticleBlock,
  BRAND,
  CtaBlock,
  CtaVariant,
  FaqBlock,
  FeatureCardGridBlock,
  FeatureGridBlock,
  HighlightBlock,
  HighlightVariant,
  ImageBlock,
  ImageGroupBlock,
  ImageGroupItem,
  IntroBlock,
  KeyTakeawaysBlock,
  KeyValueBlock,
  LineBannerBlock,
  ListBlock,
  Locale,
  ComparisonTableBlock,
  HeadingBlock,
  ParagraphBlock,
  RelatedBlock,
  RelatedPromosBlock,
  SourcesBlock,
  StepsBlock,
} from '@/types/article';
import { getIcon } from '@/lib/icons';
import { renderBlockText, renderInline } from '@/lib/md';
import { textColorStyle } from '@/lib/text-colors';

/** Brand palette lifted from the Earnex public-article prototype (not the CMS chrome). */
export const PALETTE = {
  primary: '#42A5F5',
  secondary: '#1E3A8A',
  highlight: '#0083EC',
  card: '#F2F9FF',
  faint: '#F8F9FF',
  divider: '#E2F2FF',
  success: '#0EAB16',
  successBg: '#DDFDDD',
  successText: '#008B41',
  warningBg: '#FCF5DE',
  warningText: '#EBA53B',
  warningBorder: '#F0DCAA',
  dangerBg: '#FDECEC',
  dangerBorder: '#F5C2C2',
  dangerText: '#B91C1C',
  lineGreen: '#06C755',
  lineGreenDark: '#04833B',
};

function isSafeHref(href: string | undefined): boolean {
  const h = (href || '').trim();
  if (!h) return false;
  if (h === '#' || h.startsWith('/') || h.startsWith('#')) return true;
  return /^https?:\/\//i.test(h);
}

interface BlockViewProps {
  block: ArticleBlock;
  article: Article;
  locale: Locale;
  mobile: boolean;
}

export default function BlockView({ block, article, locale, mobile }: BlockViewProps): React.ReactElement | null {
  switch (block.type) {
    case 'intro':
      return <IntroView block={block} locale={locale} mobile={mobile} />;
    case 'heading':
      return <HeadingView block={block} locale={locale} mobile={mobile} />;
    case 'paragraph':
      return <ParagraphView block={block} locale={locale} mobile={mobile} />;
    case 'image':
      return <ImageView block={block} locale={locale} mobile={mobile} />;
    case 'imageGroup':
      return <ImageGroupView block={block} locale={locale} mobile={mobile} />;
    case 'highlight':
      return <HighlightView block={block} locale={locale} mobile={mobile} />;
    case 'keyTakeaways':
      return <KeyTakeawaysView block={block} locale={locale} mobile={mobile} />;
    case 'list':
      return <ListView block={block} locale={locale} mobile={mobile} />;
    case 'comparisonTable':
      return <ComparisonTableView block={block} locale={locale} mobile={mobile} />;
    case 'keyValue':
      return <KeyValueView block={block} locale={locale} mobile={mobile} />;
    case 'featureGrid':
      return <FeatureGridView block={block} locale={locale} mobile={mobile} />;
    case 'featureCardGrid':
      return <FeatureCardGridView block={block} locale={locale} mobile={mobile} />;
    case 'steps':
      return <StepsView block={block} locale={locale} mobile={mobile} />;
    case 'rebateSteps':
      return <RebateStepsView locale={locale} mobile={mobile} />;
    case 'cta':
      return <CtaView block={block} locale={locale} mobile={mobile} />;
    case 'faq':
      return <FaqView block={block} locale={locale} mobile={mobile} />;
    case 'sources':
      return <SourcesView block={block} locale={locale} mobile={mobile} />;
    case 'lineBanner':
      return <LineBannerView block={block} locale={locale} mobile={mobile} />;
    case 'related':
      return <RelatedView block={block} article={article} locale={locale} mobile={mobile} />;
    case 'relatedPromos':
      return <RelatedPromosView block={block} locale={locale} mobile={mobile} />;
  }
}

// ---------------------------------------------------------------------------
// intro / heading / paragraph
// ---------------------------------------------------------------------------

function IntroView({ block, locale, mobile }: { block: IntroBlock; locale: Locale; mobile: boolean }) {
  return (
    <div
      style={{
        fontSize: mobile ? 16.5 : 19,
        lineHeight: 1.7,
        color: PALETTE.secondary,
        fontWeight: 500,
        paddingLeft: mobile ? 14 : 18,
        borderLeft: `3px solid ${BRAND.gold}`,
        ...textColorStyle(block.color),
      }}
    >
      {renderBlockText(block.text[locale])}
    </div>
  );
}

function HeadingView({ block, locale, mobile }: { block: HeadingBlock; locale: Locale; mobile: boolean }) {
  if (block.level === 2) {
    return (
      <h2
        style={{
          fontSize: mobile ? 20 : 26,
          fontWeight: 800,
          color: PALETTE.secondary,
          margin: 0,
          lineHeight: 1.3,
          letterSpacing: -0.3,
        }}
      >
        <span style={{ borderLeft: `4px solid ${BRAND.gold}`, paddingLeft: 12, display: 'inline-block' }}>
          {renderInline(block.text[locale])}
        </span>
      </h2>
    );
  }
  return (
    <h3 style={{ fontSize: mobile ? 17 : 21, fontWeight: 700, color: '#243b6b', margin: 0 }}>
      {renderInline(block.text[locale])}
    </h3>
  );
}

function ParagraphView({ block, locale, mobile }: { block: ParagraphBlock; locale: Locale; mobile: boolean }) {
  return (
    <div style={{ fontSize: mobile ? 15 : 16.5, color: '#3a3f4b', margin: 0, ...textColorStyle(block.color) }}>
      {renderBlockText(block.text[locale])}
    </div>
  );
}

// ---------------------------------------------------------------------------
// image
// ---------------------------------------------------------------------------

function ImageView({ block, locale, mobile }: { block: ImageBlock; locale: Locale; mobile: boolean }) {
  const caption = block.caption[locale];
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          height: mobile ? 180 : 300,
          background: block.url ? '#0B1E3D' : '#eef1f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {block.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={block.url} alt={caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ color: '#b6bcc8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ImageIcon size={34} />
            <span style={{ fontSize: 12 }}>{locale === 'en' ? 'Image' : 'รูปภาพประกอบ'}</span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption style={{ fontSize: 12.5, color: '#9aa0ad', textAlign: 'center', marginTop: 8 }}>
          {renderInline(caption)}
        </figcaption>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// imageGroup
//
// ONE layout, not a desktop/mobile pair, because the app has one: every number below is copied
// from earnex_app's `image_group_block.dart`, which was measured off Figma node 17404-243446.
// The preview's job is to show what the app will render, so a two-column desktop variant here
// would be a design that ships nowhere.
//
//   card       #fff, radius 30, padding 16, gap 24 (image → text), 1px gradient border
//              #42A5F5 → #fff, glow 0 0 20 #42A5F5 20%; cards 24 apart
//   image      radius 24, full width at its OWN aspect ratio — these are charts, and cropping
//              one to a fixed height can cut off the candle the paragraph is about
//   expand     pill 24 radius, padding 8/16, white 20% over a 12px blur, same glow
//   heading    2px left rule #42A5F5 + 12 padding, 20/w700 #42A5F5
//   body       18 (20 on desktop) /w500, line-height 1.5, #2F2F2F
// ---------------------------------------------------------------------------

/** Headings and body copy in the app's article mockup are near-black, not the CMS navy. */
const IG_INK = '#2F2F2F';
const IG_GLOW = '0 0 20px rgba(66,165,245,.2)';

/** Shared by the picture and its empty state so the radius and the alt text can't drift apart. */
function ImageGroupPicture({ item, locale }: { item: ImageGroupItem; locale: Locale }) {
  return item.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt={item.title[locale] || ''} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 24 }} />
  ) : (
    <div
      style={{
        width: '100%',
        // 3:2 is the ratio of the design's own asset, so an article still being written keeps
        // the card the shape it will end up.
        aspectRatio: '3 / 2',
        borderRadius: 24,
        background: PALETTE.card,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color: '#b6bcc8',
      }}
    >
      <ImageIcon size={34} />
      <span style={{ fontSize: 12 }}>{locale === 'en' ? 'Image' : 'รูปภาพประกอบ'}</span>
    </div>
  );
}

function ImageGroupText({ item, locale, mobile }: { item: ImageGroupItem; locale: Locale; mobile: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      {item.title[locale]?.trim() ? (
        <h3
          style={{
            margin: '0 0 16px',
            paddingLeft: 12,
            borderLeft: `2px solid ${PALETTE.primary}`,
            fontSize: 20,
            fontWeight: 700,
            color: PALETTE.primary,
            lineHeight: 1.5,
          }}
        >
          {renderInline(item.title[locale])}
        </h3>
      ) : null}
      <div style={{ fontSize: mobile ? 18 : 20, fontWeight: 500, lineHeight: 1.5, color: IG_INK, ...textColorStyle(item.color) }}>
        {renderBlockText(item.body[locale])}
      </div>
    </div>
  );
}

function ImageGroupView({ block, locale, mobile }: { block: ImageGroupBlock; locale: Locale; mobile: boolean }) {
  // Which image is open full-screen, by item id. `null` closes it.
  const [zoomed, setZoomed] = useState<string | null>(null);
  const open = block.items.find((it) => it.id === zoomed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Optional group heading: plain text, no rule and no gold bar — the app draws it with its
          own H2 token (20/25, w700, #2F2F2F) and this is a preview of the app, not of the CMS
          chrome. Absent or empty renders nothing. */}
      {block.title?.[locale]?.trim() ? (
        <h2 style={{ fontSize: mobile ? 20 : 25, fontWeight: 700, color: IG_INK, margin: 0, lineHeight: 1.5 }}>
          {renderInline(block.title[locale])}
        </h2>
      ) : null}
      {block.items.map((item) => (
        // The 1px gradient edge is a gradient plate with a white one inset on top: CSS has no
        // gradient border-color, and `border-image` loses the radius.
        <div
          key={item.id}
          style={{
            background: `linear-gradient(135deg, ${PALETTE.primary}, #fff)`,
            borderRadius: 30,
            padding: 1,
            boxShadow: IG_GLOW,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 29, padding: 16 }}>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <ImageGroupPicture item={item} locale={locale} />
              {item.url && (
                <button
                  type="button"
                  onClick={() => setZoomed(item.id)}
                  style={{
                    position: 'absolute',
                    right: 16,
                    bottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 24,
                    border: 'none',
                    background: 'rgba(255,255,255,.2)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: IG_GLOW,
                    color: IG_INK,
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.5,
                    cursor: 'pointer',
                  }}
                >
                  <Maximize2 size={24} />
                  {locale === 'en' ? 'Expand' : 'ขยาย'}
                </button>
              )}
            </div>
            <ImageGroupText item={item} locale={locale} mobile={mobile} />
          </div>
        </div>
      ))}

      {open && createPortal(
        // Portalled to <body> on purpose. `position: fixed` resolves against the nearest
        // TRANSFORMED ancestor, and the mobile preview is a CSS-scaled frame — so an inline
        // overlay sizes itself to the whole article (4000px tall) and centres the image a
        // screenful above the viewport, invisible. Outside that frame, fixed means fixed.
        <div
          onClick={() => setZoomed(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(6,14,30,.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.url} alt={open.title[locale] || ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 10 }} />
          <button
            type="button"
            onClick={() => setZoomed(null)}
            aria-label={locale === 'en' ? 'Close' : 'ปิด'}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 34,
              height: 34,
              borderRadius: 999,
              border: 'none',
              background: 'rgba(255,255,255,.16)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// highlight
// ---------------------------------------------------------------------------

const HIGHLIGHT_MAP: Record<
  HighlightVariant,
  { bg: string; bd: string; icon: typeof AlertCircle; color: string; title: string; defTitle: { th: string; en: string } }
> = {
  answer: { bg: PALETTE.card, bd: PALETTE.divider, icon: AlertCircle, color: PALETTE.primary, title: PALETTE.secondary, defTitle: { th: 'คำแนะนำ', en: 'Tip' } },
  info: { bg: PALETTE.card, bd: PALETTE.divider, icon: AlertCircle, color: PALETTE.primary, title: PALETTE.secondary, defTitle: { th: 'คำแนะนำ', en: 'Tip' } },
  warning: { bg: PALETTE.warningBg, bd: PALETTE.warningBorder, icon: AlertTriangle, color: PALETTE.warningText, title: PALETTE.warningText, defTitle: { th: 'ข้อควรระวัง', en: 'Warning' } },
  // success: { bg: PALETTE.successBg, bd: '#C8EBC8', icon: CheckCircle2, color: PALETTE.success, title: PALETTE.successText, defTitle: { th: 'จุดเด่น', en: 'Highlight' } },
  // danger: { bg: PALETTE.dangerBg, bd: PALETTE.dangerBorder, icon: AlertTriangle, color: PALETTE.dangerText, title: PALETTE.dangerText, defTitle: { th: 'คำเตือน', en: 'Caution' } },
};

function HighlightView({ block, locale, mobile }: { block: HighlightBlock; locale: Locale; mobile: boolean }) {
  const c = HIGHLIGHT_MAP[block.variant] || HIGHLIGHT_MAP.info;
  const Icon = c.icon;
  const title = block.title[locale] || c.defTitle[locale];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 16, padding: mobile ? 16 : '22px 24px', margin: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flex: '0 0 auto' }}>
          <Icon size={18} />
        </span>
        <span style={{ fontSize: mobile ? 15 : 17, fontWeight: 700, color: c.title }}>{title}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {block.items.map((it, i) => (
          <li
            key={i}
            style={{ display: 'flex', gap: 9, fontSize: mobile ? 14 : 15.5, color: '#3a3f4b', ...textColorStyle(it.color) }}
          >
            <span style={{ color: c.color, flex: '0 0 auto', marginTop: 3 }}>
              <CheckCircle2 size={15} />
            </span>
            <span>{renderInline(it.text[locale])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// keyTakeaways
// ---------------------------------------------------------------------------

function KeyTakeawaysView({ block, locale, mobile }: { block: KeyTakeawaysBlock; locale: Locale; mobile: boolean }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#F2F9FF,#E4F0FF)',
        border: `1px solid ${PALETTE.divider}`,
        borderRadius: 16,
        padding: '32px 24px',
        margin: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PALETTE.primary, flex: '0 0 auto', boxShadow: '0 2px 8px rgba(66,165,245,.2)' }}>
          <Star size={19} />
        </span>
        <span style={{ fontSize: mobile ? 17 : 20, fontWeight: 800, color: PALETTE.secondary }}>Key Takeaways</span>
      </div>
      {block.items.length === 0 ? (
        <div style={{ fontSize: mobile ? 13.5 : 14.5, color: '#9aa0ad', fontStyle: 'italic' }}>
          {locale === 'en' ? 'No takeaways yet' : 'ยังไม่มีประเด็นสรุป'}
        </div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {block.items.map((it, i) => (
            <li
              key={i}
              style={{ display: 'flex', gap: 10, fontSize: mobile ? 14.5 : 16, color: '#3a3f4b', lineHeight: 1.65, ...textColorStyle(it.color) }}
            >
              <span style={{ color: PALETTE.primary, flex: '0 0 auto', marginTop: 4 }}>
                <CheckCircle2 size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>{renderInline(it.text[locale])}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

function ListView({ block, locale, mobile }: { block: ListBlock; locale: Locale; mobile: boolean }) {
  const numbered = block.style === 'number';
  return (
    <div style={{ margin: 0 }}>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {block.items.map((it, i) => (
          <li key={i} style={{ display: 'flex', gap: 12, fontSize: mobile ? 14.5 : 16, color: '#3a3f4b', lineHeight: 1.6 }}>
            {numbered ? (
              <span style={{ flex: '0 0 auto', width: 26, height: 26, borderRadius: '50%', background: PALETTE.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginTop: 1 }}>
                {i + 1}
              </span>
            ) : (
              <span style={{ flex: '0 0 auto', color: PALETTE.primary, marginTop: 3 }}>
                <CheckCircle2 size={17} />
              </span>
            )}
            <span>{renderInline(it[locale])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// comparisonTable / keyValue
// ---------------------------------------------------------------------------

function ComparisonTableView({ block, locale, mobile }: { block: ComparisonTableBlock; locale: Locale; mobile: boolean }) {
  return (
    <div style={{ margin: 0, borderRadius: 14, border: `1px solid ${PALETTE.divider}`, overflow: 'hidden', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: mobile ? 420 : 0 }}>
        <thead>
          <tr style={{ background: PALETTE.secondary }}>
            {block.columns.map((c, i) => (
              <th key={i} style={{ padding: mobile ? '11px 12px' : '13px 16px', textAlign: i === 0 ? 'left' : 'center', color: '#fff', fontSize: mobile ? 12.5 : 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {c[locale]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 ? PALETTE.faint : '#fff' }}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: mobile ? '10px 12px' : '12px 16px',
                    textAlign: ci === 0 ? 'left' : 'center',
                    fontSize: mobile ? 13 : 14.5,
                    fontWeight: ci === 0 ? 600 : 400,
                    color: ci === 0 ? PALETTE.secondary : '#3a3f4b',
                    borderTop: `1px solid ${PALETTE.divider}`,
                  }}
                >
                  {cell[locale]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeyValueView({ block, locale, mobile }: { block: KeyValueBlock; locale: Locale; mobile: boolean }) {
  return (
    <div style={{ margin: 0 }}>
      {block.title[locale] && (
        <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 700, color: PALETTE.secondary, marginBottom: 12 }}>
          {block.title[locale]}
        </div>
      )}
      <div style={{ border: `1px solid ${PALETTE.divider}`, borderRadius: 14, overflow: 'hidden' }}>
        {block.rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: mobile ? '12px 14px' : '14px 18px',
              background: i % 2 ? PALETTE.faint : '#fff',
              borderTop: i > 0 ? `1px solid ${PALETTE.divider}` : 'none',
            }}
          >
            <span style={{ flex: '1 1 50%', fontSize: mobile ? 13.5 : 15, color: '#5b6170' }}>{r.key[locale]}</span>
            <span style={{ flex: '0 0 auto', fontSize: mobile ? 14 : 15.5, fontWeight: 700, color: PALETTE.secondary, textAlign: 'right' }}>{r.value[locale]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// featureGrid / featureCardGrid
// ---------------------------------------------------------------------------

function FeatureGridView({ block, locale, mobile }: { block: FeatureGridBlock; locale: Locale; mobile: boolean }) {
  return (
    <div style={{ margin: 0 }}>
      {block.title[locale] && (
        <h3 style={{ fontSize: mobile ? 17 : 20, fontWeight: 800, color: PALETTE.secondary, textAlign: 'center', margin: '0 0 18px' }}>
          {block.title[locale]}
        </h3>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        {block.items.map((it, i) => {
          const Icon = getIcon(it.icon);
          return (
            <div key={i} style={{ background: '#fff', border: `1px solid ${PALETTE.divider}`, borderRadius: 16, padding: 18, boxShadow: '0 4px 16px rgba(66,165,245,.08)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#56B2FA,#317AE6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 12 }}>
                <Icon size={24} />
              </div>
              <div style={{ fontSize: mobile ? 15 : 16.5, fontWeight: 700, color: PALETTE.secondary, marginBottom: 6 }}>{it.title[locale]}</div>
              <div style={{ fontSize: mobile ? 13.5 : 14.5, color: '#5b6170', lineHeight: 1.6 }}>{it.text[locale]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeatureCardGridView({ block, locale, mobile }: { block: FeatureCardGridBlock; locale: Locale; mobile: boolean }) {
  return (
    <div style={{ margin: 0 }}>
      {block.title[locale] && (
        <h3 style={{ fontSize: mobile ? 18 : 22, fontWeight: 800, color: PALETTE.secondary, textAlign: 'center', margin: '0 0 20px', letterSpacing: -0.3 }}>
          {block.title[locale]}
        </h3>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {block.items.map((it, i) => {
          const Icon = getIcon(it.icon);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: mobile ? 14 : 18,
                background: '#fff',
                border: `1px solid ${PALETTE.divider}`,
                borderRadius: mobile ? 18 : 22,
                padding: mobile ? 16 : '20px 24px',
                boxShadow: '0 6px 20px rgba(66,165,245,.1)',
              }}
            >
              <div
                style={{
                  width: mobile ? 54 : 64,
                  height: mobile ? 54 : 64,
                  flex: '0 0 auto',
                  borderRadius: mobile ? 16 : 18,
                  background: 'linear-gradient(150deg,#7EC5FF 0%,#3E86EC 60%,#2B6FE0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: 'inset 0 2px 6px rgba(255,255,255,.5), 0 8px 18px rgba(49,122,230,.4)',
                }}
              >
                <Icon size={mobile ? 28 : 32} />
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: mobile ? 14.5 : 16,
                  color: '#3a3f4b',
                  lineHeight: 1.65,
                  ...textColorStyle(it.color),
                }}
              >
                {renderBlockText(it.content[locale])}
              </div>
            </div>
          );
        })}
      </div>
      {block.footnote[locale] && block.footnote[locale].trim() && (
        <div style={{ textAlign: 'center', fontSize: mobile ? 11.5 : 12.5, color: '#9aa0ad', marginTop: 16 }}>
          {block.footnote[locale]}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// steps / rebateSteps
// ---------------------------------------------------------------------------

function StepsView({ block, locale, mobile }: { block: StepsBlock; locale: Locale; mobile: boolean }) {
  const steps = block.steps;
  return (
    <div style={{ margin: 0, background: PALETTE.faint, borderRadius: 18, padding: mobile ? '22px 16px' : '30px 24px' }}>
      {block.title[locale] && (
        <h3 style={{ fontSize: mobile ? 17 : 20, fontWeight: 800, color: PALETTE.secondary, textAlign: 'center', margin: '0 0 24px' }}>
          {block.title[locale]}
        </h3>
      )}
      {mobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', left: 17, top: 36, bottom: 0, borderLeft: `2px dashed ${PALETTE.primary}` }} />
              )}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#56B2FA,#317AE6)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 15,
                  flex: '0 0 auto',
                  zIndex: 1,
                  boxShadow: '0 4px 12px rgba(66,165,245,.35)',
                }}
              >
                {i + 1}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: PALETTE.secondary }}>{st.title[locale]}</div>
                {st.desc[locale] && <div style={{ fontSize: 13, color: '#5b6170' }}>{st.desc[locale]}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '8%', right: '8%', top: 26, borderTop: `2px dashed ${PALETTE.primary}`, zIndex: 0 }} />
          {steps.map((st, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 4px' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#56B2FA,#317AE6)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 20,
                  marginBottom: 12,
                  boxShadow: '0 6px 16px rgba(66,165,245,.35)',
                  border: `4px solid ${PALETTE.faint}`,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: PALETTE.secondary, lineHeight: 1.3 }}>{st.title[locale]}</div>
              {st.desc[locale] && <div style={{ fontSize: 12.5, color: '#5b6170', marginTop: 3, lineHeight: 1.4 }}>{st.desc[locale]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REBATE_STEPS_COPY = {
  th: {
    head: ['รับเงินคืน ', '100%', '* ใน 5 ขั้นตอนง่าย ๆ'],
    note: '* เป็นไปตามเงื่อนไขของแต่ละโบรกเกอร์และประเภทบัญชี',
    steps: [
      'สมัครใช้งานกับ Earnex',
      'เลือกโบรกเกอร์ที่คุณต้องการ',
      'เปิดบัญชีเทรดกับโบรกเกอร์ที่เลือก',
      'เชื่อมบัญชีเทรดของคุณกับ Earnex',
      'รับเงินคืนทุกครั้งที่คุณเทรด',
    ],
  },
  en: {
    head: ['Get ', '100%', '* Cashback in 5 easy steps'],
    note: '* Terms and conditions apply per broker and account type',
    steps: [
      'Sign up with Earnex for free',
      'Choose your preferred broker',
      'Open a trading account',
      'Link your account with Earnex',
      'Start trading and get cashback automatically',
    ],
  },
} as const;

const REBATE_ICONS = [User, Award, BarChart3, CreditCard, Wallet];

function RebateStepsView({ locale, mobile }: { locale: Locale; mobile: boolean }) {
  const T = REBATE_STEPS_COPY[locale];
  const heading = (
    <div style={{ textAlign: 'center', marginBottom: mobile ? 4 : 8 }}>
      <h3 style={{ margin: 0, fontSize: mobile ? 18 : 24, fontWeight: 800, color: PALETTE.secondary, letterSpacing: -0.3, lineHeight: 1.3 }}>
        {T.head[0]}
        <span style={{ color: PALETTE.primary, textDecoration: 'underline', fontWeight: 800 }}>{T.head[1]}*</span>
        {T.head[2].replace(/^\*/, '')}
      </h3>
    </div>
  );

  if (mobile) {
    return (
      <div style={{ margin: 0, background: 'linear-gradient(180deg,#F5FAFF,#EAF3FF)', borderRadius: 18, padding: '24px 18px' }}>
        {heading}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 14 }}>
          {T.steps.map((s, i) => {
            const Icon = REBATE_ICONS[i];
            return (
              <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: i < 4 ? 20 : 0 }}>
                {i < 4 && <div style={{ position: 'absolute', left: 23, top: 48, bottom: 0, borderLeft: `2px dashed ${PALETTE.primary}`, opacity: 0.5 }} />}
                <div style={{ position: 'relative', flex: '0 0 auto' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PALETTE.primary, boxShadow: '0 6px 18px rgba(66,165,245,.3)', position: 'relative', zIndex: 1 }}>
                    <Icon size={24} />
                  </div>
                  <span style={{ position: 'absolute', right: -4, top: -6, width: 22, height: 22, borderRadius: '50%', background: PALETTE.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, zIndex: 2 }}>
                    {i + 1}
                  </span>
                </div>
                <div style={{ paddingTop: 12, fontSize: 15, fontWeight: 600, color: PALETTE.secondary, lineHeight: 1.4 }}>{s}</div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11.5, color: '#9aa0ad', marginTop: 16 }}>{T.note}</div>
      </div>
    );
  }

  const xs = [10, 30, 50, 70, 90];
  const down = 230, up = 130;
  const ys = [down, up, down, up, down];
  return (
    <div style={{ margin: 0, background: 'linear-gradient(180deg,#F5FAFF 0%,#EAF3FF 100%)', borderRadius: 20, padding: '28px 24px 26px' }}>
      {heading}
      <div style={{ position: 'relative', marginTop: 8 }}>
        <svg viewBox="0 0 1000 360" width="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
          <path
            d="M100,230 C170,230 230,130 300,130 C370,130 430,230 500,230 C570,230 630,130 700,130 C770,130 830,230 900,230"
            fill="none"
            stroke="url(#exgrad)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="2 10"
            opacity={0.9}
          />
          <defs>
            <linearGradient id="exgrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#56B2FA" />
              <stop offset="100%" stopColor="#317AE6" />
            </linearGradient>
          </defs>
        </svg>
        {xs.map((x, i) => {
          const Icon = REBATE_ICONS[i];
          return (
            <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${(ys[i] / 360) * 100}%`, transform: 'translate(-50%,-50%)', zIndex: 2 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PALETTE.primary, boxShadow: '0 10px 26px rgba(66,165,245,.35), 0 0 0 6px rgba(255,255,255,.6)' }}>
                <Icon size={30} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 6 }}>
        {T.steps.map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '0 6px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: PALETTE.primary, color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: PALETTE.secondary, lineHeight: 1.4 }}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12.5, color: '#9aa0ad', marginTop: 14 }}>{T.note}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// cta
// ---------------------------------------------------------------------------

const CTA_VARIANT_STYLES: Record<CtaVariant, { grad: string; shadow: string }> = {
  sky: { grad: 'linear-gradient(135deg,#56B2FA,#317AE6)', shadow: '0 10px 26px rgba(66,165,245,.4)' },
  navy: { grad: 'linear-gradient(135deg,#2A4FA0,#1E3A8A)', shadow: '0 10px 26px rgba(30,58,138,.4)' },
  green: { grad: 'linear-gradient(135deg,#4FC97D,#2E9E57)', shadow: '0 10px 26px rgba(46,158,87,.4)' },
};

function CtaView({ block, locale, mobile }: { block: CtaBlock; locale: Locale; mobile: boolean }) {
  const { grad, shadow } = CTA_VARIANT_STYLES[block.variant];
  const href = isSafeHref(block.url) ? block.url : undefined;
  return (
    <div style={{ textAlign: 'center', margin: 0 }}>
      <a
        href={href || '#'}
        onClick={href ? undefined : (e) => e.preventDefault()}
        target={href && href.startsWith('http') ? '_blank' : undefined}
        rel={href && href.startsWith('http') ? 'noopener noreferrer' : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: mobile ? '14px 28px' : '16px 40px',
          borderRadius: 16,
          fontSize: mobile ? 15 : 17,
          fontWeight: 700,
          textDecoration: 'none',
          color: '#fff',
          background: grad,
          boxShadow: shadow,
          cursor: href ? 'pointer' : 'default',
        }}
      >
        {block.text[locale]}
        <ArrowRight size={20} />
      </a>
      {block.caption[locale] && block.caption[locale].trim() && (
        <div style={{ marginTop: 16, fontSize: mobile ? 13 : 14.5, color: '#5b6170', lineHeight: 1.6, ...textColorStyle(block.color) }}>
          {renderInline(block.caption[locale])}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// faq
// ---------------------------------------------------------------------------

function FaqView({ block, locale, mobile }: { block: FaqBlock; locale: Locale; mobile: boolean }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div style={{ margin: 0 }}>
      <h3 style={{ fontSize: mobile ? 18 : 22, fontWeight: 800, color: PALETTE.secondary, textAlign: 'center', margin: '0 0 18px' }}>
        {locale === 'en' ? 'Frequently asked questions' : 'คำถามที่พบบ่อย'}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {block.items.map((it, i) => {
          const isOpen = !!open[i];
          return (
            <div key={i} style={{ border: `1px solid ${PALETTE.divider}`, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [i]: !isOpen }))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: mobile ? '13px 15px' : '15px 18px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, fontSize: mobile ? 14 : 15.5, fontWeight: 600, color: PALETTE.secondary }}>{it.q[locale]}</span>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: PALETTE.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={PALETTE.primary} strokeWidth={2.6} strokeLinecap="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.2s' }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              {isOpen && (
                <div
                  style={{
                    padding: mobile ? '0 15px 14px' : '0 18px 16px',
                    fontSize: mobile ? 13.5 : 15,
                    color: '#5b6170',
                    lineHeight: 1.7,
                    ...textColorStyle(it.color),
                  }}
                >
                  {renderInline(it.a[locale])}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// sources
// ---------------------------------------------------------------------------

function SourcesView({ block, locale, mobile }: { block: SourcesBlock; locale: Locale; mobile: boolean }) {
  return (
    <div style={{ margin: 0, borderTop: '1px solid #eef1f5', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <FileCheck size={18} color={PALETTE.primary} />
        <span style={{ fontSize: mobile ? 15 : 17, fontWeight: 800, color: PALETTE.secondary }}>
          {locale === 'en' ? 'Fact Check · Sources' : 'Fact Check · ที่มา'}
        </span>
      </div>
      <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {block.items.map((it, i) => {
          const href = isSafeHref(it.url) ? it.url : '#';
          return (
            // Body typography, not footnote typography: a source is something a reader is meant
            // to actually read, so it matches `paragraph` in size/colour and `intro` in weight
            // and line height. It was 12.5/13.5 and near-invisible next to the text it backs up.
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                fontSize: mobile ? 15 : 16.5,
                lineHeight: 1.7,
                fontWeight: 500,
              }}
            >
              <span style={{ fontWeight: 700, color: PALETTE.primary, flex: '0 0 auto' }}>[{i + 1}]</span>
              <a
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                style={{ color: '#3a3f4b', textDecoration: 'none', borderBottom: '1px dotted #b6bcc8' }}
              >
                {it.text[locale]}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// lineBanner
// ---------------------------------------------------------------------------

function LineGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.2c-5.1 0-9.2 3.3-9.2 7.4 0 3.7 3.3 6.8 7.7 7.3.3.1.7.2.8.5.1.2.1.6 0 .9l-.1.8c0 .2-.2.9.8.5s5.4-3.2 7.4-5.5c1.3-1.5 2-3 2-4.9 0-4.1-4.1-7.4-9.4-7.5z"
        fill={color}
      />
    </svg>
  );
}

function LineBannerView({ block, locale, mobile }: { block: LineBannerBlock; locale: Locale; mobile: boolean }) {
  const valid = isSafeHref(block.buttonUrl) && block.buttonUrl.startsWith('http');
  return (
    <div
      style={{
        margin: 0,
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        alignItems: 'center',
        gap: mobile ? 16 : 20,
        textAlign: mobile ? 'center' : 'left',
        background: 'linear-gradient(120deg,#F1FBF4 0%,#E3F6EA 100%)',
        border: '1px solid #cfeede',
        borderRadius: 20,
        padding: mobile ? '22px 20px' : '22px 28px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, justifyContent: mobile ? 'center' : 'flex-start' }}>
        <span
          style={{
            width: mobile ? 0 : 46,
            height: 46,
            borderRadius: 12,
            background: PALETTE.lineGreen,
            display: mobile ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
            boxShadow: '0 8px 18px rgba(6,199,85,.3)',
          }}
        >
          <LineGlyph size={28} color="#fff" />
        </span>
        <div style={{ fontSize: mobile ? 16 : 18, fontWeight: 700, color: PALETTE.lineGreenDark, lineHeight: 1.5 }}>
          {block.message[locale]}
        </div>
      </div>
      <a
        href={valid ? block.buttonUrl : '#'}
        target={valid ? '_blank' : undefined}
        rel={valid ? 'noopener noreferrer' : undefined}
        onClick={valid ? undefined : (e) => e.preventDefault()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          flex: '0 0 auto',
          padding: mobile ? '11px 22px' : '13px 26px',
          borderRadius: 999,
          background: '#fff',
          border: `2px solid ${PALETTE.lineGreen}`,
          color: PALETTE.lineGreenDark,
          fontSize: mobile ? 14.5 : 16,
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 6px 16px rgba(6,199,85,.2)',
          cursor: 'pointer',
          opacity: valid ? 1 : 0.85,
        }}
      >
        <span style={{ width: 24, height: 24, borderRadius: 7, background: PALETTE.lineGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          <LineGlyph size={16} color="#fff" />
        </span>
        {block.buttonLabel[locale]}
        <ArrowRight size={16} />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// related / relatedPromos
//
// `related` in MANUAL mode is the one case the preview can resolve for real: the
// ids name articles that live in this same CMS, so it reads them back from
// `/api/articles` and draws the actual covers and titles. Everything else stays a
// placeholder grid on purpose — `auto` is picked by the live site at request time,
// and promotions are not modelled here.
// ---------------------------------------------------------------------------

/** The article list, fetched once per mount and only when a manual `related` block needs it.
 *  `null` means "still loading", so the caller can keep showing skeletons rather than flashing
 *  an empty grid. A failure resolves to `[]` — the preview falls back to placeholders, it never
 *  blocks editing. Note the setState lives in the promise callback, not the effect body: the
 *  `react-hooks/set-state-in-effect` rule rejects the synchronous form. */
function useArticleList(enabled: boolean): Article[] | null {
  const [list, setList] = useState<Article[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch('/api/articles')
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => [])
      .then((json: Article[]) => {
        if (!cancelled) setList(json);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return list;
}

/** One swipeable rail at every width — plain CSS overflow with scroll snapping, no carousel
 *  library, no arrows, no JS: every platform already knows how to fling a scroll container.
 *
 *  Only the card width changes: one card at a time on a phone, three at a time on desktop and
 *  tablet. Both stop just short of a whole number of cards so the next one peeks in and advertises
 *  that there is more to the right. With three or fewer articles the rail simply does not overflow
 *  and reads as the row it always was. */
const relatedRailStyle = (): CSSProperties => ({
  display: 'flex',
  gap: 14,
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  paddingBottom: 6,
});

const relatedCardStyle = (mobile: boolean): CSSProperties => ({
  background: '#fff',
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 4px 16px rgba(66,165,245,.08)',
  flex: mobile ? '0 0 82%' : '0 0 31%',
  scrollSnapAlign: 'start',
});

function RelatedCard({ item, locale, mobile }: { item: Article; locale: Locale; mobile: boolean }) {
  return (
    <div style={relatedCardStyle(mobile)}>
      <div style={{ height: mobile ? 120 : 110, background: 'radial-gradient(120% 120% at 30% 0%, #24408a, #0B1E3D)', position: 'relative' }}>
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover} alt={item.title[locale] || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <BookOpen size={22} color="rgba(255,255,255,.5)" style={{ position: 'absolute', left: 14, bottom: 12 }} />
        )}
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.gold, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .3 }}>
          {item.category || '—'}
        </div>
        <div style={{ fontSize: mobile ? 14 : 15, fontWeight: 700, color: PALETTE.secondary, lineHeight: 1.4 }}>
          {item.title[locale] || item.title.th || item.title.en}
        </div>
      </div>
    </div>
  );
}

function RelatedSkeletonCard({ mobile }: { mobile: boolean }) {
  return (
    <div style={relatedCardStyle(mobile)}>
      <div style={{ height: mobile ? 120 : 110, background: 'radial-gradient(120% 120% at 30% 0%, #24408a, #0B1E3D)', position: 'relative' }}>
        <BookOpen size={22} color="rgba(255,255,255,.5)" style={{ position: 'absolute', left: 14, bottom: 12 }} />
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ height: 10, width: '40%', background: PALETTE.divider, borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 12, width: '90%', background: '#eef1f5', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 12, width: '65%', background: '#eef1f5', borderRadius: 4 }} />
      </div>
    </div>
  );
}

function RelatedView({ block, article, locale, mobile }: { block: RelatedBlock; article: Article; locale: Locale; mobile: boolean }) {
  const manual = block.mode === 'manual' && block.ids.length > 0;
  const all = useArticleList(manual);
  // Ordered by the ids as picked, not by the order they happen to sit in the store. An id with no
  // article behind it (deleted since it was picked) simply drops out — same as it would on the site.
  const picked = manual && all ? block.ids.map((id) => all.find((a) => a.id === id)).filter((a): a is Article => !!a) : [];

  const note =
    block.mode === 'manual'
      ? `${block.ids.length} ${locale === 'en' ? 'article(s) selected' : 'บทความที่เลือกไว้'}`
      : `${locale === 'en' ? 'Auto-selected from category' : 'เลือกอัตโนมัติจากหมวดหมู่'}: ${article.category || '—'}`;
  // Only the unresolved cases are still a promise about the live site; resolved ones ARE the data.
  const hint =
    picked.length > 0 ? '' : ` · ${locale === 'en' ? 'resolved on the live site' : 'จะถูกดึงข้อมูลจริงบนหน้าเว็บ'}`;

  return (
    <div style={{ background: PALETTE.faint, padding: mobile ? '26px 18px' : '36px 40px', borderTop: `1px solid ${PALETTE.divider}` }}>
      <h3 style={{ fontSize: mobile ? 18 : 22, fontWeight: 800, color: PALETTE.secondary, margin: '0 0 6px' }}>
        {locale === 'en' ? 'Related articles' : 'บทความที่เกี่ยวข้อง'}
      </h3>
      <div style={{ fontSize: 12, color: '#9aa0ad', marginBottom: 16 }}>{note}{hint}</div>
      <div style={relatedRailStyle()}>
        {picked.length > 0
          ? picked.map((item) => <RelatedCard key={item.id} item={item} locale={locale} mobile={mobile} />)
          : [0, 1, 2].map((i) => <RelatedSkeletonCard key={i} mobile={mobile} />)}
      </div>
    </div>
  );
}

function RelatedPromosView({ block, locale, mobile }: { block: RelatedPromosBlock; locale: Locale; mobile: boolean }) {
  const note =
    block.mode === 'manual'
      ? `${block.ids.length} ${locale === 'en' ? 'promotion(s) selected' : 'โปรโมชั่นที่เลือกไว้'}`
      : locale === 'en'
        ? 'Auto-selected by matching broker'
        : 'เลือกอัตโนมัติตามโบรกเกอร์เดียวกัน';
  return (
    <div style={{ margin: 0 }}>
      <h3 style={{ fontSize: mobile ? 18 : 22, fontWeight: 800, color: PALETTE.secondary, margin: '0 0 6px' }}>
        {locale === 'en' ? 'Related promotions' : 'โปรโมชั่นที่เกี่ยวข้อง'}
      </h3>
      <div style={{ fontSize: 12, color: '#9aa0ad', marginBottom: 16 }}>{note} · {locale === 'en' ? 'resolved on the live site' : 'จะถูกดึงข้อมูลจริงบนหน้าเว็บ'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${PALETTE.divider}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(66,165,245,.08)' }}>
            <div style={{ height: mobile ? 130 : 104, background: 'radial-gradient(120% 120% at 30% 0%, #24408a, #0B1E3D)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.15)' }} />
              <span
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 10,
                  background: 'linear-gradient(135deg,#F0CD6B,#D4AF37)',
                  color: '#3a2c00',
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 20,
                }}
              >
                {locale === 'en' ? 'Reward' : 'รางวัล'}
              </span>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ height: 10, width: '35%', background: PALETTE.divider, borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 12, width: '90%', background: '#eef1f5', borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 12, width: '55%', background: '#eef1f5', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
