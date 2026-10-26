import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import BlogArticle, { articleMetadata } from '@/components/BlogArticle';
import { getBlogBySlug, getPublicBlog } from '@/lib/content';
import { getNoteCategories } from '@/lib/note-categories';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const blog = (await getPublicBlog());
  const categories = (await getNoteCategories());
  const slugs = [
    ...blog.map((entry) => ({ slug: entry.data.slug })),
    ...categories.map((category) => ({ slug: category.slug })),
  ];
  return routing.locales.flatMap((locale) => slugs.map((item) => ({ locale, ...item })));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = (await getBlogBySlug(slug));
  if (entry) return articleMetadata(entry);
  const category = (await getNoteCategories()).find((item) => item.slug === slug);
  if (category) {
    return {
      title: `${category.name} | DemiZ`,
      description: category.description,
    };
  }
  return { title: 'Blog | DemiZ' };
}

export default async function BlogSlugPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // 分类路由优先，避免与文章短链接冲突。
  const category = (await getNoteCategories()).find((c) => c.slug === slug);
  if (category) permanentRedirect('/'+locale+'/categories#category-'+category.slug);

  const blog = (await getPublicBlog());
  const index = blog.findIndex((entry) => entry.data.slug === slug);
  if (index === -1) notFound();
  return <BlogArticle entry={blog[index]} previous={blog[index - 1] ?? null} next={blog[index + 1] ?? null} />;
}
