import { NextRequest, NextResponse } from 'next/server';

import { readArticles, writeArticles } from '@/lib/articles-store';

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

    articles[index] = {
      ...articles[index],
      ...body,
      id,
      createdAt: articles[index].createdAt,
      updated: new Date().toISOString(),
    };

    await writeArticles(articles);
    return NextResponse.json(articles[index]);
  } catch {
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

/** Hard delete. Moving to trash is a status change and goes through PUT. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const articles = await readArticles();
    const remaining = articles.filter((a) => a.id !== id);

    if (remaining.length === articles.length) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await writeArticles(remaining);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
