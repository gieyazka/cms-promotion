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

/** A line that opens a list item: `- foo`, `• foo` (bullet) or `1. foo` / `1) foo` (ordered). */
export const BULLET_LINE = /^(\s*)[-•]\s+/;
export const ORDERED_LINE = /^(\s*)\d+[.)]\s+/;

type Chunk =
  | { kind: 'ul' | 'ol'; lines: string[] }
  | { kind: 'p'; lines: string[] };

/** Groups consecutive lines into paragraphs and list runs. A blank line closes whatever is open. */
function chunk(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      chunks.push({ kind: 'p', lines: [] }); // sentinel: forces the next line to open a new chunk
      continue;
    }
    const kind: Chunk['kind'] = BULLET_LINE.test(line) ? 'ul' : ORDERED_LINE.test(line) ? 'ol' : 'p';
    const item = line.replace(kind === 'ul' ? BULLET_LINE : kind === 'ol' ? ORDERED_LINE : /^/, '');
    const open = chunks[chunks.length - 1];
    if (open && open.kind === kind && open.lines.length > 0) open.lines.push(item);
    else chunks.push({ kind, lines: [item] });
  }
  return chunks.filter((c) => c.lines.length > 0);
}

/**
 * Same as renderInline, but line-aware: blank lines break paragraphs, `- ` lines become a
 * `<ul>` and `1. ` lines become an `<ol>`. Text with no line structure at all still returns
 * bare inline nodes (no wrapping `<p>`), which is what every caller rendered before lists existed.
 */
export function renderBlockText(text: string): React.ReactNode {
  const chunks = chunk(text || '');
  if (chunks.length === 0) return renderInline(text);
  if (chunks.length === 1 && chunks[0].kind === 'p' && chunks[0].lines.length === 1) {
    return renderInline(chunks[0].lines[0]);
  }

  return chunks.map((c, i) => {
    if (c.kind === 'p') {
      return (
        <p key={i} className={i > 0 ? 'mt-4' : undefined}>
          {c.lines.map((line, j) => (
            <React.Fragment key={j}>
              {j > 0 && <br />}
              {renderInline(line)}
            </React.Fragment>
          ))}
        </p>
      );
    }
    const List = c.kind === 'ul' ? 'ul' : 'ol';
    return (
      <List
        key={i}
        className={`${c.kind === 'ul' ? 'list-disc' : 'list-decimal'} pl-6 space-y-1 ${i > 0 ? 'mt-3' : ''}`}
      >
        {c.lines.map((line, j) => (
          <li key={j}>{renderInline(line)}</li>
        ))}
      </List>
    );
  });
}

/** Strip markers — for previews, meta descriptions and word counts. */
export function stripMarkers(text: string): string {
  return (text || '')
    .split('\n')
    .map((line) => line.replace(BULLET_LINE, '').replace(ORDERED_LINE, ''))
    .join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}
