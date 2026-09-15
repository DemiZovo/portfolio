import type { MetadataRoute } from 'next';
import { getPublicContent } from '@/lib/content';
import { getBlogCategories } from '@/lib/categories';
import { siteUrl } from '@/lib/site';
import { routing } from '@/i18n/routing';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ['', '/archives', '/blog', '/tags', '/life', '/workshop', '/guestbook', '/privacy'];
  const entries = (await getPublicContent());
  const categories = (await getBlogCategories());
  const tags = [...new Set(entries.flatMap((entry) => entry.data.tags))].sort((a, b) => a.localeCompare(b));
  const alternates = (path: string): MetadataRoute.Sitemap[number]['alternates'] => ({
    languages: {
      zh: siteUrl(`/zh${path}`),
      en: siteUrl(`/en${path}`),
      'x-default': siteUrl(`/zh${path}`),
    },
  });

  return [
    ...routing.locales.flatMap((locale) =>
      staticPages.map((path) => ({
        url: siteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: alternates(path),
      })),
    ),
    ...routing.locales.flatMap((locale) =>
      entries.map((entry) => ({
        url: siteUrl(`/${locale}/${entry.collection}/${entry.data.slug}`),
        lastModified: entry.data.updated ?? entry.data.published,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
        alternates: alternates(`/${entry.collection}/${entry.data.slug}`),
      })),
    ),
    ...routing.locales.flatMap((locale) =>
      categories.map((category) => ({
        url: siteUrl(`/${locale}/blog/${category.slug}`),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
        alternates: alternates(`/blog/${category.slug}`),
      })),
    ),
    ...routing.locales.flatMap((locale) =>
      tags.map((tag) => ({
        url: siteUrl(`/${locale}/tags/${encodeURIComponent(tag)}`),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
        alternates: alternates(`/tags/${encodeURIComponent(tag)}`),
      })),
    ),
  ];
}
