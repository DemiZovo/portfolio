import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { cache } from 'react';
import { blogSchema, lifeSchema, type BlogData, type LifeData } from './schemas';

export interface BlogEntry {
  collection: 'blog';
  slug: string;
  data: BlogData;
  body: string;
}

export interface LifeEntry {
  collection: 'life';
  slug: string;
  data: LifeData;
  body: string;
}

export type PublicEntry = BlogEntry | LifeEntry;

const CONTENT_DIR = join(process.cwd(), 'src', 'content');

function loadDir(dir: string, schema: z.ZodTypeAny): Array<BlogEntry | LifeEntry> {
  const fullDir = join(CONTENT_DIR, dir);
  let files: string[];
  try {
    files = readdirSync(fullDir).filter((name) => name.endsWith('.md') || name.endsWith('.mdx'));
  } catch {
    return [];
  }
  return files.map((file) => {
    const raw = readFileSync(join(fullDir, file), 'utf8');
    const { data, content } = matter(raw);
    const parsed = schema.parse(data);
    return {
      collection: dir as 'blog' | 'life',
      slug: parsed.slug,
      data: parsed,
      body: content,
    };
  });
}

// 唯一的公开内容边界：生产环境永远排除 draft。
const isPublic = (entry: PublicEntry): boolean =>
  process.env.NODE_ENV === 'development' || !entry.data.draft;

const newestFirst = (a: PublicEntry, b: PublicEntry) => b.data.published.getTime() - a.data.published.getTime();

const loadPublished = cache(async (): Promise<PublicEntry[]> => {
  if (process.env.CONTENT_SOURCE !== 'supabase') {
    return [...loadDir('blog', blogSchema), ...loadDir('life', lifeSchema)].filter(isPublic).sort(newestFirst);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase content configuration is incomplete');
  const entries: PublicEntry[] = [];
  for (let offset = 0; ; offset += 100) {
    const response = await fetch(`${url}/rest/v1/editor_articles?select=kind,slug,published&deleted_at=is.null&published=not.is.null&order=id.asc&limit=100&offset=${offset}`, {
      headers: { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }) },
      next: { revalidate: 300, tags: ['public-articles'] }, signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('Unable to read published articles');
    const rows: Array<{ kind: 'blog' | 'life'; slug: string; published: { data: Record<string, unknown>; body: string } }> = await response.json();
    for (const row of rows) {
      const data = (row.kind === 'blog' ? blogSchema : lifeSchema).parse({ ...row.published.data, slug: row.slug, draft: false });
      entries.push({ collection: row.kind, slug: row.slug, data, body: row.published.body } as PublicEntry);
    }
    if (rows.length < 100) break;
  }
  // No Markdown fallback: withdrawn/deleted entries must stay absent.
  return entries.sort(newestFirst);
});

export const getPublicBlog = cache(async (): Promise<BlogEntry[]> => (await loadPublished()).filter((entry): entry is BlogEntry => entry.collection === 'blog'));
export const getPublicLife = cache(async (): Promise<LifeEntry[]> => (await loadPublished()).filter((entry): entry is LifeEntry => entry.collection === 'life'));
export const getPublicContent = loadPublished;
export async function getBlogBySlug(slug: string) { return (await getPublicBlog()).find((entry) => entry.slug === slug); }
export async function getLifeBySlug(slug: string) { return (await getPublicLife()).find((entry) => entry.slug === slug); }

export const entryPath = (entry: PublicEntry) => `/${entry.collection}/${entry.data.slug}` as const;
