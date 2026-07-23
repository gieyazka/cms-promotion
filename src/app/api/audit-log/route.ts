import { NextRequest, NextResponse } from 'next/server';

import { readAuditLog } from '@/lib/audit-log';

/**
 * Read-only: entries are written by the article routes, never posted from the browser.
 *
 * `?articleId=` narrows to one article — what the editor's history modal asks for. Omit it for
 * the whole log, which is what `/activity` shows.
 */
export async function GET(req: NextRequest) {
  try {
    const limitParam = Number(req.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 300;
    const articleId = req.nextUrl.searchParams.get('articleId')?.trim() || undefined;
    return NextResponse.json({ entries: await readAuditLog(limit, articleId) });
  } catch (error) {
    console.error('Failed to read audit log', error);
    return NextResponse.json({ error: 'Failed to read audit log' }, { status: 500 });
  }
}
