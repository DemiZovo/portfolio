import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SearchBox from '@/components/SearchBox';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'search' });
  return {
    title: `${t('title')} | DemiZ`,
    description: '搜索 DemiZ 的技术文章与生活日志',
    robots: { index: false, follow: false },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? '' : q ?? '';
  return <SearchBox key={query} initialQuery={query} />;
}
