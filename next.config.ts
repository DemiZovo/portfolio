import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { categories } from './src/data/categories';
import { legacyCategoryAliases } from './src/lib/categories';

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    const redirects: { source: string; destination: string; permanent: boolean }[] = [
      { source: '/', destination: '/zh', permanent: false },
      { source: '/projects', destination: '/zh/collection', permanent: true },
      { source: '/categories', destination: '/zh/blog', permanent: true },
    ];
    for (const category of categories) {
      redirects.push({ source: `/categories/${category.slug}`, destination: `/zh/blog/${category.slug}`, permanent: true });
    }
    for (const [legacy, target] of Object.entries(legacyCategoryAliases)) {
      redirects.push({ source: `/categories/${encodeURIComponent(legacy)}`, destination: `/zh/blog/${target}`, permanent: true });
    }
    return redirects;
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
