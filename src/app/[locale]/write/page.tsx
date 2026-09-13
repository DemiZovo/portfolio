import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ArticleEditor from '@/components/ArticleEditor';
export const metadata: Metadata = { title: '文章管理 | DemiZ', robots: { index: false, follow: false } };
export default async function WritePage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ kind?: string; slug?: string; category?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { kind, slug, category, new: newArticle } = await searchParams;
  const configured = process.env.CONTENT_SOURCE === 'supabase' && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return <ArticleEditor key={`${kind}:${slug}:${category}:${newArticle}`} configured={configured} initialKind={kind} initialSlug={slug} initialCategory={category} createNew={newArticle === '1'} />;
}
