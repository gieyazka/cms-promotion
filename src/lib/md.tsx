import React from 'react';

/**
 * Markdown-lite used inside article block text. Deliberately tiny — it supports
 * exactly what the prototype's authors use and nothing else:
 *
 *   **bold**   *italic*   [label](https://url)
 *
 * Returns React nodes, never HTML strings, so nothing here can inject markup.
 */

const PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]*\))/g;

const isSafeHref = (href: string) => {
  const h = href.trim();
  if (h === '#' || h.startsWith('/') || h.startsWith('#')) return true;
  return /^https?:\/\//i.test(h);
};

export function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];

  return text.split(PATTERN).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }

    const link = /^\[([^\]]+)\]\(([^)]*)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (!isSafeHref(href)) return <span key={i}>{label}</span>;
      return (
        <a
          key={i}
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="underline underline-offset-2 decoration-[#D4AF37] hover:text-[#D4AF37]"
        >
          {label}
        </a>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/** Same as renderInline, but blank lines become paragraph breaks. */
export function renderBlockText(text: string): React.ReactNode {
  const paragraphs = (text || '').split(/\n{2,}/).filter((p) => p.trim());
  if (paragraphs.length <= 1) return renderInline(text);

  return paragraphs.map((p, i) => (
    <p key={i} className={i > 0 ? 'mt-4' : undefined}>
      {renderInline(p)}
    </p>
  ));
}

/** Strip markers — for previews, meta descriptions and word counts. */
export function stripMarkers(text: string): string {
  return (text || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}
