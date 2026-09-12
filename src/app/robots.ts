import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/write', '/zh/write', '/en/write', '/login', '/callback', '/logout', '/api/'],
    },
    sitemap: siteUrl('/sitemap.xml'),
  };
}
