import { entryPath, getPublicContent } from '@/lib/content';
import { categoryLabel } from '@/lib/categories';
import { sitePath } from '@/lib/urls';

export async function GET() {
  const entries = (await getPublicContent());
  return new Response(JSON.stringify(entries.map((entry) => ({
    title: entry.data.title,
    titleEn: 'titleEn' in entry.data ? entry.data.titleEn : undefined,
    description: entry.data.description,
    descriptionEn: 'descriptionEn' in entry.data ? entry.data.descriptionEn : undefined,
    category: entry.collection === 'blog' ? categoryLabel(entry.data.category) : '生活',
    tags: entry.data.tags,
    collection: entry.collection,
    published: entry.data.published.toISOString(),
    url: sitePath(entryPath(entry)),
    searchableText: (entry.body ?? '')
      .replace(/^---[\s\S]*?---/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`|<[^>]+>|[#>*_~\[\]()!-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000),
  }))), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
