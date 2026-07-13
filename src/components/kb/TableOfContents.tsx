'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ListChecks, BookOpen, ChevronRight } from 'lucide-react';
import { Article, HeadingBlock, Locale } from '@/types/article';
import { tocHeadings } from '@/lib/blocks';
import { PALETTE } from './BlockView';

/** Same id scheme ArticlePreview stamps on heading-block wrappers: `h-{articleId}-{blockId}`. */
export function headingAnchorId(article: Article, blockId: string): string {
  return `h-${article.id || 'draft'}-${blockId}`;
}

/** Walk up from `el` to find the nearest actually-scrollable ancestor, else null (use window). */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  let c: HTMLElement | null = el.parentElement;
  while (c && c !== document.body) {
    const overflowY = getComputedStyle(c).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      if (c.scrollHeight > c.clientHeight) return c;
      return null;
    }
    c = c.parentElement;
  }
  return null;
}

function scrollToBlock(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const found = findScrollParent(el);

  let getY: () => number;
  let setY: (y: number) => void;
  let target: number;

  if (found) {
    const cr = found.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    target = found.scrollTop + (er.top - cr.top) - 16;
    getY = () => found.scrollTop;
    setY = (y) => {
      found.scrollTop = y;
    };
  } else {
    const er = el.getBoundingClientRect();
    target = window.scrollY + er.top - 80;
    getY = () => window.scrollY;
    setY = (y) => window.scrollTo(0, y);
  }

  const start = getY();
  const dist = target - start;
  const dur = 440;
  const t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    setY(start + dist * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

interface TableOfContentsProps {
  article: Article;
  locale: Locale;
  mobile: boolean;
}

export default function TableOfContents({ article, locale, mobile }: TableOfContentsProps): React.ReactElement | null {
  // tocHeadings filters to heading blocks with level 2 but the plain predicate
  // doesn't narrow the return type, so cast to the type we know it produces.
  const headings = tocHeadings(article) as HeadingBlock[];
  const [open, setOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headings.length === 0) return;
    const ids = headings.map((hd) => headingAnchorId(article, hd.id));
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const root = els[0] ? findScrollParent(els[0]) : null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { root, rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article, headings.length]);

  if (headings.length === 0) return null;

  return (
    <div
      ref={rootRef}
      style={{
        margin: mobile ? '22px 18px 4px' : '28px 40px 6px',
        border: `1px solid ${PALETTE.divider}`,
        borderRadius: 14,
        background: PALETTE.card,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: mobile ? '13px 16px' : '15px 20px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <span style={{ width: 30, height: 30, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PALETTE.primary, flex: '0 0 auto' }}>
          <ListChecks size={17} />
        </span>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontSize: mobile ? 13.5 : 15, fontWeight: 700, color: PALETTE.secondary }}>
            {locale === 'en' ? "In this article, Earnex will walk you through" : 'ในคอนเทนต์นี้ Earnex จะพาคุณไปดู'}
          </div>
          <div style={{ fontSize: 11.5, color: '#9aa0ad' }}>
            {headings.length} {locale === 'en' ? 'topics' : 'หัวข้อ'}
          </div>
        </div>
        <ChevronDown size={20} color={PALETTE.primary} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.2s', flex: '0 0 auto' }} />
      </button>
      {open && (
        <div style={{ padding: mobile ? '0 10px 10px' : '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {headings.map((hd) => {
            const id = headingAnchorId(article, hd.id);
            const active = activeId === id;
            return (
              <button
                key={hd.id}
                type="button"
                onClick={() => scrollToBlock(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: active ? '#fff' : 'transparent',
                  cursor: 'pointer',
                  padding: '9px 10px',
                  borderRadius: 9,
                  transition: 'background .12s',
                }}
              >
                <span style={{ color: PALETTE.primary, display: 'flex', flex: '0 0 auto' }}>
                  <BookOpen size={15} />
                </span>
                <span style={{ flex: 1, fontSize: mobile ? 13 : 14, color: active ? PALETTE.highlight : '#243b6b', fontWeight: active ? 700 : 600 }}>
                  {hd.text[locale]}
                </span>
                <ChevronRight size={16} color={PALETTE.primary} style={{ flex: '0 0 auto', opacity: 0.65 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
