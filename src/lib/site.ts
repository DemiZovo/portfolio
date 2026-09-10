import { siteConfig } from '../config/site';

/** 拼出绝对站点 URL（用于 canonical / OG / RSS / sitemap）。 */
export function siteUrl(path = '/'): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url).replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
