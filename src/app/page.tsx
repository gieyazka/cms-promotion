'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, BookOpen, ChevronRight } from 'lucide-react';

import { Promotion } from '@/types/promotion';
import { Article } from '@/types/article';

interface Stats {
  promotions: { total: number; active: number; drafts: number };
  articles: { total: number; published: number; drafts: number };
}

const EMPTY: Stats = {
  promotions: { total: 0, active: 0, drafts: 0 },
  articles: { total: 0, published: 0, drafts: 0 },
};

export default function Home() {
  const [stats, setStats] = useState<Stats>(EMPTY);

  useEffect(() => {
    const load = async () => {
      const [promoRes, articleRes] = await Promise.allSettled([
        fetch('/api/promotions').then((r) => r.json() as Promise<Promotion[]>),
        fetch('/api/articles').then((r) => r.json() as Promise<Article[]>),
      ]);

      const promotions = promoRes.status === 'fulfilled' && Array.isArray(promoRes.value) ? promoRes.value : [];
      const articles = articleRes.status === 'fulfilled' && Array.isArray(articleRes.value) ? articleRes.value : [];

      // Trashed articles are not part of any headline count.
      const live = articles.filter((a) => a.status !== 'trash');

      setStats({
        promotions: {
          total: promotions.length,
          active: promotions.filter((p) => p.status === 'active').length,
          drafts: promotions.filter((p) => p.status === 'draft').length,
        },
        articles: {
          total: live.length,
          published: live.filter((a) => a.status === 'published').length,
          drafts: live.filter((a) => a.status === 'draft').length,
        },
      });
    };

    load().catch(console.error);
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-1 dark:text-white">Dashboard</h1>
      <p className="text-gray-500 mb-8">Promotions and knowledge base at a glance</p>

      <section className="mb-10">
        <SectionHeader
          icon={<FileText size={18} />}
          title="Promotions"
          href="/promotions"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total" value={stats.promotions.total} />
          <StatCard label="Active" value={stats.promotions.active} tone="green" />
          <StatCard label="Drafts" value={stats.promotions.drafts} tone="muted" />
        </div>
      </section>

      <section>
        <SectionHeader
          icon={<BookOpen size={18} />}
          title="Knowledge Base"
          href="/knowledge-base"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Articles" value={stats.articles.total} />
          <StatCard label="Published" value={stats.articles.published} tone="green" />
          <StatCard label="Drafts" value={stats.articles.drafts} tone="muted" />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon, title, href }: { icon: React.ReactNode; title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2 text-lg font-bold dark:text-white">
        <span className="text-gray-400">{icon}</span>
        {title}
      </h2>
      <Link
        href={href}
        className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
      >
        View all
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'green' | 'muted';
}) {
  const toneClass =
    tone === 'green'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'muted'
        ? 'text-gray-400 dark:text-gray-500'
        : 'text-gray-900 dark:text-white';

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</h3>
      <p className={`text-3xl font-bold mt-2 ${toneClass}`}>{value.toLocaleString('en-US')}</p>
    </div>
  );
}
