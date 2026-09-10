import { getPublicContent } from '@/lib/content';
import { siteConfig } from '@/config/site';
import { siteUrl } from '@/lib/site';

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function GET() {
  const entries = getPublicContent();
  const items = entries.map((entry) => {
    const link = siteUrl(`/zh/${entry.collection}/${entry.data.slug}`);
    return `<item>
  <title>${escapeXml(entry.data.title)}</title>
  <link>${escapeXml(link)}</link>
  <guid isPermaLink="true">${escapeXml(link)}</guid>
  <description>${escapeXml(entry.data.description)}</description>
  <pubDate>${entry.data.published.toUTCString()}</pubDate>
</item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(siteUrl('/'))}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>zh-CN</language>
    <atom:link href="${escapeXml(siteUrl('/rss.xml'))}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
