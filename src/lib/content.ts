import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
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

export function getPublicBlog(): BlogEntry[] {
  return (loadDir('blog', blogSchema) as BlogEntry[]).filter(isPublic).sort(newestFirst);
}

export function getPublicLife(): LifeEntry[] {
  return (loadDir('life', lifeSchema) as LifeEntry[]).filter(isPublic).sort(newestFirst);
}

export function getPublicContent(): PublicEntry[] {
  return [...getPublicBlog(), ...getPublicLife()].sort(newestFirst);
}

export function getBlogBySlug(slug: string): BlogEntry | undefined {
  return getPublicBlog().find((entry) => entry.slug === slug);
}

export function getLifeBySlug(slug: string): LifeEntry | undefined {
  return getPublicLife().find((entry) => entry.slug === slug);
}

export const entryPath = (entry: PublicEntry) => `/${entry.collection}/${entry.data.slug}` as const;
