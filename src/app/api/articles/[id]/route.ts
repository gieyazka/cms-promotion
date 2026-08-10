import { NextRequest, NextResponse } from 'next/server';

import { assertArticle, InvalidArticle, mutateArticles, readArticles } from '@/lib/articles-store';
import { actorFrom, articleLabel, diffArticles, recordAudit } from '@/lib/audit-log';
import { deactivateKnowledgeBase } from '@/lib/kb-api';
import { Article } from '@/types/article';

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

    const updated = await mutateArticles((articles) => {
      const index = articles.findIndex((a) => a.id === id);
      if (index === -1) return null;

      const before = articles[index];
      const after: Article = {
        ...before,
        ...body,
        id,
        createdAt: before.createdAt,
        updated: new Date().toISOString(),
      };

      // Renaming into a slug someone else already owns is the same collision as creating one,
      // so it is caught here too — `id` excludes the article from its own uniqueness check.
      assertArticle(articles, after, id);

      articles[index] = after;
      return { before, after };
    });

    if (!updated) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // A save that changed nothing (the Save button re-sending an unmodified article) leaves no
    // entry — the log is a record of edits, not of button presses.
    const changes = diffArticles(updated.before, updated.after);
    if (changes.length) {
      await recordAudit({
        at: updated.after.updated,
        actor: actorFrom(req),
        action: 'update',
        articleId: id,
        title: articleLabel(updated.after),
        changes,
      });
    }

    return NextResponse.json(updated.after);
  } catch (error) {
    if (error instanceof InvalidArticle) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

/**
 * Hard delete. Moving to trash is a status change and goes through PUT.
 *
 * A synced article lives in two places, and removing it from `data/articles.json` alone left
 * the backend record serving happily: gone from the CMS, still live in the app, and now
 * unreachable — the local row that carried its `backendId` was the only handle on it.
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  let deleted;
  try {
    deleted = await mutateArticles(async (articles) => {
      const index = articles.findIndex((a) => a.id === id);
      if (index === -1) return null;

      // Inside the mutation on purpose: a throw here skips the local write, so a backend that
      // refuses leaves the article sitting in the trash — still deletable once it recovers —
      // rather than making it vanish from the CMS while it is still being served.
      const { backendId } = articles[index];
      if (backendId) await deactivateKnowledgeBase(backendId);

      return articles.splice(index, 1)[0];
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Backend refused to deactivate the article: ${(error as Error).message}` },
      { status: 502 },
    );
  }

  if (!deleted) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // The article is gone from the store, so the log entry is the only surviving trace of it.
  await recordAudit({
    at: new Date().toISOString(),
    actor: actorFrom(req),
    action: 'delete',
    articleId: id,
    title: articleLabel(deleted),
    changes: [
      {
        field: 'article',
        note: `ลบถาวร (สถานะก่อนลบ: ${deleted.status})${
          deleted.backendId ? ` · ปิดการใช้งานบนเซิร์ฟเวอร์: ${deleted.backendId}` : ''
        }`,
      },
    ],
  });

  return NextResponse.json({ success: true });
}
