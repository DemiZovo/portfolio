const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3000');
const failures = [];

async function request(url, label = url.pathname) {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) failures.push(`${label}: HTTP ${response.status}`);
    return response;
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function localUrl(value) {
  if (!value || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(value)) return null;
  try {
    const url = new URL(value, base);
    if (url.origin !== base.origin && url.hostname !== 'localhost') return null;
    url.protocol = base.protocol;
    url.host = base.host;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

const sitemapResponse = await request(new URL('/sitemap.xml', base), 'sitemap');
const sitemap = sitemapResponse ? await sitemapResponse.text() : '';
const pageUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => localUrl(match[1]))
  .filter(Boolean);

if (!pageUrls.length) failures.push('sitemap: no public URLs found');

const discovered = new Map();
for (let offset = 0; offset < pageUrls.length; offset += 8) {
  const batch = pageUrls.slice(offset, offset + 8);
  await Promise.all(batch.map(async (url) => {
    const response = await request(url, url.pathname);
    if (!response) return;
    const html = await response.text();
    if (html.includes('\uFFFD')) failures.push(`${url.pathname}: contains replacement character`);
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const target = localUrl(match[1]);
      if (!target || target.pathname.startsWith('/_next/')) continue;
      discovered.set(target.href, target);
    }
  }));
}

const resourceUrls = [...discovered.values()];
for (let offset = 0; offset < resourceUrls.length; offset += 12) {
  await Promise.all(resourceUrls.slice(offset, offset + 12).map((url) => request(url, `resource ${url.pathname}`)));
}

const [robotsResponse, rssResponse, indexResponse] = await Promise.all([
  request(new URL('/robots.txt', base), 'robots'),
  request(new URL('/rss.xml', base), 'rss'),
  request(new URL('/search-index.json', base), 'search index'),
]);

const robots = robotsResponse ? await robotsResponse.text() : '';
if (!/Sitemap:\s+https?:\/\//i.test(robots)) failures.push('robots: missing absolute sitemap URL');

const rss = rssResponse ? await rssResponse.text() : '';
if (!rss.includes('<guid isPermaLink="true">') || !rss.includes('atom:link')) failures.push('rss: missing GUID or Atom self-link');

if (indexResponse) {
  try {
    const index = await indexResponse.json();
    if (!Array.isArray(index) || !index.length) failures.push('search index: empty or invalid');
    else if (index.some((item) => !item.title || !item.description || !item.url || !item.collection)) failures.push('search index: required field missing');
  } catch {
    failures.push('search index: invalid JSON');
  }
}

if (failures.length) {
  console.error(`Site verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Site verification passed: ${pageUrls.length} sitemap URLs and ${resourceUrls.length} internal targets.`);
