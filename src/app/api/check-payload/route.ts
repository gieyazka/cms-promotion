import { NextResponse } from 'next/server';
import { readArticles } from '@/lib/articles-store';
import { toApiPayload } from '@/lib/article-api-format';

const REQUIRED = ['tags', 'read_time', 'category', 'seo_path', 'show_new', 'status', 'translations', 'blocks'];
const T_REQUIRED = ['locale', 'title', 'detail'];

export async function GET() {
  const bad: unknown[] = [];
  for (const a of await readArticles()) {
    try {
      const p = JSON.parse(JSON.stringify(toApiPayload(a))) as Record<string, unknown>;
      const missing = REQUIRED.filter((k) => p[k] === undefined);
      const tMissing = (p.translations as Record<string, unknown>[]).flatMap((t) =>
        T_REQUIRED.filter((k) => t[k] === undefined).map((k) => `translations.${t.locale}.${k}`)
      );
      if (missing.length || tMissing.length) bad.push({ id: a.id, missing: [...missing, ...tMissing] });
    } catch (e) {
      bad.push({ id: a.id, threw: String(e) });
    }
  }
  return NextResponse.json({ ok: bad.length === 0, bad });
}
