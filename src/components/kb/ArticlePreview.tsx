'use client';

import { Clock, Eye } from 'lucide-react';
import { Article, ArticleBlock, BRAND, CATEGORIES, Locale, heroBadgeText } from '@/types/article';
import { readTime } from '@/lib/blocks';
import BlockView from './BlockView';
import TableOfContents, { headingAnchorId } from './TableOfContents';

// ---------------------------------------------------------------------------
// automatic block spacing — single source of truth, ported 1:1 from the
// Earnex prototype (author never sets margins by hand).
// ---------------------------------------------------------------------------

const SPACE = { toHeading: 18, fromH2: 24, fromH3: 16, default: 16 };

type BlockKind = string | null;

function blockKind(b: ArticleBlock | undefined): BlockKind {
  if (!b) return null;
  if (b.type === 'heading') return b.level === 3 ? 'h3' : 'h2';
  if (b.type === 'intro') return 'paragraph';
  return b.type;
}

function bodyBlocks(article: Article): ArticleBlock[] {
  return article.blocks.filter((b) => b.type !== 'related');
}

function getBlockSpacing(prevKind: BlockKind, nextKind: BlockKind): number {
  if (!prevKind) return 0; // first block: no top spacing
  const isH = (k: BlockKind) => k === 'h2' || k === 'h3';
  if (nextKind === 'h2' && !isH(prevKind)) return SPACE.toHeading; // enter new section
  if (isH(prevKind) && nextKind === 'highlight') return SPACE.default; // heading -> highlight card
  if (prevKind === 'h2') return SPACE.fromH2; // H2 binds to its content
  if (prevKind === 'h3' && nextKind === 'h2') return SPACE.toHeading; // H3 -> H2 = new section
  if (prevKind === 'h3') return SPACE.fromH3; // after H3
  return SPACE.default; // default rhythm
}

// ---------------------------------------------------------------------------

function fmtDate(iso: string, locale: Locale): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function nfmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
}

function catLabel(category: string, locale: Locale): string {
  const found = CATEGORIES.find((c) => c.value === category);
  return found ? found.label[locale] : category || '—';
}

interface ArticlePreviewProps {
  article: Article;
  locale: Locale;
  device: 'desktop' | 'tablet' | 'mobile';
  /** Overlay the automatic gap between blocks (dashed rule + a px pill). Read-only: authors
      never set margins, `getBlockSpacing` is the single source of truth. */
  showSpacing?: boolean;
}

/**
 * Tablet is not a third layout — it's the desktop layout (`mobile === false`)
 * shown in a narrower, bezeled frame. Only the shell wrapper below varies by
 * device; `mobile` itself, and everything it's threaded into, only ever
 * distinguishes mobile from non-mobile, exactly like the ported prototype.
 */
export default function ArticlePreview({ article, locale, device, showSpacing = false }: ArticlePreviewProps): React.ReactElement {
  const mobile = device === 'mobile';

  let frameStyle: React.CSSProperties;
  if (device === 'mobile') {
    frameStyle = {
      width: 390,
      maxWidth: '100%',
      borderRadius: 28,
      overflow: 'hidden',
      border: '8px solid #0d1f3d',
      boxShadow: '0 16px 44px rgba(16,42,89,.28)',
      background: '#fff',
    };
  } else if (device === 'tablet') {
    frameStyle = {
      width: 700,
      maxWidth: '100%',
      borderRadius: 20,
      overflow: 'hidden',
      border: '10px solid #0d1f3d',
      boxShadow: '0 16px 44px rgba(16,42,89,.28)',
      background: '#fff',
    };
  } else {
    frameStyle = {
      width: '100%',
      maxWidth: 900,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(16,42,89,.14)',
      background: '#fff',
    };
  }

  return (
    <div
      className="w-full flex justify-center transition-colors"
      style={{ background: '#eef1f6', padding: mobile ? '24px 12px' : '32px 24px', borderRadius: 16 }}
    >
      <div style={frameStyle}>
        <ArticleBody article={article} locale={locale} mobile={mobile} showSpacing={showSpacing} />
      </div>
    </div>
  );
}

function ArticleBody({
  article,
  locale,
  mobile,
  showSpacing,
}: {
  article: Article;
  locale: Locale;
  mobile: boolean;
  showSpacing: boolean;
}) {
  const body = bodyBlocks(article);
  const related = article.blocks.find((b) => b.type === 'related');
  const time = readTime(article, locale);

  return (
    <div style={{ fontFamily: 'var(--font-sans, sans-serif)', color: '#2f2f2f', lineHeight: 1.75 }}>
      {/* header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: mobile ? '14px 18px' : '18px 40px',
          borderBottom: '1px solid #eef1f5',
        }}
      >
        <span style={{ fontWeight: 800, letterSpacing: 1, color: BRAND.navy, fontSize: mobile ? 15 : 17 }}>EARNEX</span>
        <span style={{ marginLeft: 'auto', fontSize: mobile ? 11 : 12, color: '#8a8f9c', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={14} />
            {nfmt(article.views)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} />
            {time} min
          </span>
        </span>
      </div>

      {/* meta */}
      <div style={{ padding: mobile ? '18px 18px 0' : '30px 40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {article.showNew !== false && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'linear-gradient(135deg,#33C13B,#0EAB16)',
                color: '#fff',
                padding: '4px 11px',
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: 0.4,
                boxShadow: '0 4px 12px rgba(14,171,22,.3)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
              NEW
            </span>
          )}
          <span style={{ background: '#E4EFFF', color: '#3157C8', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {catLabel(article.category, locale)}
          </span>
          {/* Owners are CMS-side metadata (who maintains the article), not a public byline —
              deliberately not rendered here. They still show on the list cards. */}
          <span style={{ fontSize: 12, color: '#9aa0ad' }}>{fmtDate(article.pubDate || article.updated, locale)}</span>
        </div>
      </div>

      {/* hero */}
      <Hero article={article} locale={locale} mobile={mobile} />

      {/* TOC */}
      <TableOfContents article={article} locale={locale} mobile={mobile} />

      {/* body */}
      <div style={{ padding: mobile ? '8px 18px 40px' : '12px 40px 56px' }}>
        {body.map((b, i, arr) => {
          const gap = getBlockSpacing(blockKind(arr[i - 1]), blockKind(b));
          return (
            <div
              key={b.id}
              id={b.type === 'heading' ? headingAnchorId(article, b.id) : undefined}
              style={{
                position: 'relative',
                scrollMarginTop: 20,
                marginTop: gap,
                outline: showSpacing ? '1px dashed rgba(66,165,245,.35)' : undefined,
                outlineOffset: showSpacing ? 2 : undefined,
                borderRadius: showSpacing ? 4 : undefined,
              }}
            >
              {showSpacing && gap > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -gap,
                    left: 0,
                    right: 0,
                    height: gap,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 5,
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed #42A5F5', opacity: 0.55 }} />
                  <span
                    style={{
                      position: 'relative',
                      background: '#42A5F5',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 20,
                      boxShadow: '0 2px 6px rgba(66,165,245,.4)',
                    }}
                  >
                    {gap}px
                  </span>
                </div>
              )}
              <BlockView block={b} article={article} locale={locale} mobile={mobile} />
            </div>
          );
        })}
      </div>

      {/* related (full-bleed footer) */}
      {related && <BlockView block={related} article={article} locale={locale} mobile={mobile} />}

      {/* footer */}
      <div style={{ background: BRAND.navy, padding: mobile ? '22px 18px' : '28px 40px', textAlign: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 800, letterSpacing: 1, fontSize: 15, opacity: 0.9 }}>EARNEX</div>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 10 }}>
          © 2026 Earnex · {locale === 'en' ? 'Trade with confidence · Trading involves risk' : 'เทรดอย่างมั่นใจ · การลงทุนมีความเสี่ยง'}
        </div>
      </div>
    </div>
  );
}

function Hero({ article, locale, mobile }: { article: Article; locale: Locale; mobile: boolean }) {
  const overlay = !!article.cover && article.coverOverlay === true;

  // Cover set, overlay off (the default) — the image IS the hero. Covers are
  // finished banner artwork (title already baked in by the author), so
  // nothing is drawn on top. The page still needs exactly one <h1> for
  // SEO/a11y, so the heading *is* the image, via its alt text, with UA h1
  // margin/font-size reset so it's pixel-identical to a plain wrapper div.
  if (article.cover && !overlay) {
    return (
      <h1 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', borderRadius: mobile ? 16 : 20, overflow: 'hidden', marginLeft: mobile ? 18 : 40, marginRight: mobile ? 18 : 40 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={article.cover} alt={article.title[locale] || ''} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </h1>
    );
  }

  // No cover, or cover with overlay on — the gradient-hero shell with the
  // badge + <h1> title (HeroTitleBlock is the single source of that markup,
  // shared by both cases so they stay pixel-identical typography-wise). When
  // overlay is on, a photo backdrop + scrim are layered in behind everything
  // else so white text stays legible over any photo.
  return (
    <div
      style={{
        margin: mobile ? '0 18px' : '0 40px',
        borderRadius: mobile ? 16 : 20,
        overflow: 'hidden',
        position: 'relative',
        background: overlay ? '#0B1E3D' : 'radial-gradient(120% 120% at 20% 0%, #24408a 0%, #0B1E3D 55%, #081428 100%)',
        padding: mobile ? '26px 22px 30px' : '44px 40px 48px',
        minHeight: mobile ? 200 : 260,
        display: 'flex',
        flexDirection: 'column',
        // The photo is the point in overlay mode, so the text sits at the bottom, where the
        // scrim is darkest — that keeps the upper part of the image clean and unobscured.
        justifyContent: overlay ? 'flex-end' : 'center',
      }}
    >
      {overlay && (
        <>
          {/* The cover, shown at full strength. alt="" because the real, accessible title
              is the <h1> text below — the image must not announce it a second time. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.cover}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* No scrim, by the author's explicit choice: the cover shows exactly as uploaded.
              The title's own text-shadow is all that carries it, so a bright cover can make
              the headline hard to read — that is the accepted trade-off here. */}
        </>
      )}
      {/* Decorative glows belong to the gradient hero. Over a photo they would just be
          coloured smudges on someone's artwork, so they are suppressed in overlay mode. */}
      {!overlay && (
        <>
          <div
            style={{
              position: 'absolute',
              right: -40,
              top: -40,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(122,90,248,.5),transparent 65%)',
              filter: 'blur(10px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 20,
              bottom: -30,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(66,165,245,.4),transparent 65%)',
            }}
          />
        </>
      )}
      <div style={{ position: 'relative' }}>
        {/* Dark text is only ever allowed over a cover. The gradient hero is near-black
            navy, so honouring 'dark' there would erase the title. */}
        <HeroTitleBlock
          article={article}
          locale={locale}
          mobile={mobile}
          dark={overlay && article.heroTitleColor === 'dark'}
        />
      </div>
    </div>
  );
}

/** Badge + <h1> title, shared verbatim by the no-cover and cover-with-overlay Hero branches. */
function HeroTitleBlock({
  article, locale, mobile, dark,
}: { article: Article; locale: Locale; mobile: boolean; dark: boolean }) {
  const fallback = locale === 'en' ? 'New article' : 'บทความใหม่';
  const title = article.title[locale] || fallback;
  const words = title.split(' ');
  const badge = heroBadgeText(article);

  return (
    <>
      {badge && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            // On a pale cover the translucent gold chip vanishes, so dark mode gives the
            // badge its own light plate to sit on.
            background: dark ? 'rgba(255,255,255,.72)' : 'rgba(212,175,55,.16)',
            border: `1px solid rgba(212,175,55,${dark ? '.6' : '.4'})`,
            marginBottom: 16,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: BRAND.gold }} />
          <span
            style={{
              color: dark ? BRAND.navy : BRAND.goldLight,
              fontSize: mobile ? 11 : 12,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            {badge}
          </span>
        </div>
      )}
      <h1
        style={{
          margin: 0,
          color: dark ? BRAND.navy : '#fff',
          fontSize: mobile ? 26 : 40,
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: -0.5,
          // The shadow is what carries the text now that there is no scrim: it lifts white
          // off a dark patch, and dark off a bright one, so it has to invert with the colour.
          textShadow: dark ? '0 2px 18px rgba(255,255,255,.75)' : '0 2px 20px rgba(0,0,0,.3)',
        }}
      >
        {words.map((w, i) =>
          i % 3 === 1 ? (
            <span
              key={i}
              style={{
                // The pale gold gradient is unreadable on a light cover — dark mode drops
                // to the solid, deeper brand gold instead.
                color: dark ? BRAND.gold : BRAND.goldLight,
                background: dark ? 'none' : `linear-gradient(180deg,${BRAND.goldLight},${BRAND.gold})`,
                WebkitBackgroundClip: dark ? 'border-box' : 'text',
                WebkitTextFillColor: dark ? BRAND.gold : 'transparent',
              }}
            >
              {w + ' '}
            </span>
          ) : (
            w + ' '
          ),
        )}
      </h1>
    </>
  );
}
