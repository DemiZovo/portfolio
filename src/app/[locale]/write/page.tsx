import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ArticleEditor from '@/components/ArticleEditor';
export const metadata: Metadata = { title: '站长 Writer | DemiZ', robots: { index: false, follow: false } };
export default async function WritePage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ kind?: string; slug?: string; category?: string; new?: string; view?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { kind, slug, category, new: newArticle, view } = await searchParams;
  const configured = process.env.CONTENT_SOURCE === 'supabase' && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return <ArticleEditor key={`${view}:${kind}:${slug}:${category}:${newArticle}`} manageProjects={view === 'projects'} configured={configured} initialKind={kind} initialSlug={slug} initialCategory={category} createNew={newArticle === '1'} />;
}
