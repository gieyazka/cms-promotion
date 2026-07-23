import { NextRequest, NextResponse } from 'next/server';

import { readArticles, writeArticles } from '@/lib/articles-store';
import { actorFrom, articleLabel, diffArticles, recordAudit } from '@/lib/audit-log';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const articles = await readArticles();
    const article = articles.find((a) => a.id === id);

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch {
    return NextResponse.json({ error: 'Failed to read article' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const articles = await readArticles();

    const index = articles.findIndex((a) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const before = articles[index];
    articles[index] = {
      ...before,
      ...body,
      id,
      createdAt: before.createdAt,
      updated: new Date().toISOString(),
    };

    await writeArticles(articles);

    // A save that changed nothing (the Save button re-sending an unmodified article) leaves no
    // entry — the log is a record of edits, not of button presses.
    const changes = diffArticles(before, articles[index]);
    if (changes.length) {
      await recordAudit({
        at: articles[index].updated,
        actor: actorFrom(req),
        action: 'update',
        articleId: id,
        title: articleLabel(articles[index]),
        changes,
      });
    }

    return NextResponse.json(articles[index]);
  } catch {
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

/** Hard delete. Moving to trash is a status change and goes through PUT. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const articles = await readArticles();
    const deleted = articles.find((a) => a.id === id);
    const remaining = articles.filter((a) => a.id !== id);

    if (!deleted) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await writeArticles(remaining);

    // The article is gone from the store, so the log entry is the only surviving trace of it.
    await recordAudit({
      at: new Date().toISOString(),
      actor: actorFrom(req),
      action: 'delete',
      articleId: id,
      title: articleLabel(deleted),
      changes: [{ field: 'article', note: `ลบถาวร (สถานะก่อนลบ: ${deleted.status})` }],
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
