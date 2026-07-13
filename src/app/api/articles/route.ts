import { NextRequest, NextResponse } from 'next/server';

import { readArticles, writeArticles } from '@/lib/articles-store';
import { Article } from '@/types/article';

export async function GET() {
  try {
    const articles = await readArticles();
    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: 'Failed to read articles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const articles = await readArticles();
    const now = new Date().toISOString();

    const article: Article = {
      ...body,
      id: Date.now().toString(),
      views: body.views ?? 0,
      status: body.status ?? 'draft',
      createdAt: now,
      updated: now,
    };

    articles.push(article);
    await writeArticles(articles);

    return NextResponse.json(article, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
