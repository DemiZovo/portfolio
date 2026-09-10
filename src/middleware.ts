import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // 跳过 api/_next/_vercel 与任何带点路径（rss.xml、sitemap.xml、search-index.json 保持无前缀）。
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
