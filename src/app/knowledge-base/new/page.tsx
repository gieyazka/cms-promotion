'use client';

import { useMemo } from 'react';
import { newArticle } from '@/lib/blocks';
import ArticleEditor from '@/components/kb/ArticleEditor';

export default function NewArticlePage() {
  const initial = useMemo(() => newArticle(), []);
  return <ArticleEditor initial={initial} isNew />;
}
