import type { MetadataRoute } from 'next';
import { getPublicContent } from '@/lib/content';
import { siteUrl } from '@/lib/site';
import { routing } from '@/i18n/routing';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ['', '/blog', '/categories', '/workshop', '/guestbook', '/privacy'];
  const entries = (await getPublicContent());
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
  ];
}
