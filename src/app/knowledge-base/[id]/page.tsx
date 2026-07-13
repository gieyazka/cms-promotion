'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion, Loader2 } from 'lucide-react';
import { Article } from '@/types/article';
import ArticleEditor from '@/components/kb/ArticleEditor';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Keyed on id so navigating between two articles remounts the loader with
  // fresh state, instead of resetting it from inside an effect.
  return <ArticleLoader key={id} id={id} />;
}

function ArticleLoader({ id }: { id: string }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [status, setStatus] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/articles/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setStatus('notfound');
          return;
        }
        if (!res.ok) throw new Error('failed to load article');
        const data: Article = await res.json();
        if (!cancelled) {
          setArticle(data);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-950 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-900 text-gray-400">
          <FileQuestion size={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {status === 'notfound' ? 'Article not found' : 'Failed to load article'}
        </h1>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {status === 'notfound'
            ? "This article doesn't exist or may have been deleted."
            : 'Something went wrong while loading this article. Please try again.'}
        </p>
        <Link
          href="/knowledge-base"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-all"
        >
          <ArrowLeft size={16} />
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return <ArticleEditor initial={article as Article} isNew={false} />;
}
