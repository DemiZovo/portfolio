import { z } from 'zod';
import { blogSchema, lifeSchema } from './schemas';
import { categories } from '../data/categories';

export const documentSchema = z.object({
  data: z.record(z.unknown()),
  body: z.string().max(200_000),
});
export type ArticleDocument = z.infer<typeof documentSchema>;
export interface EditorArticle {
  id: string;
  kind: 'blog' | 'life';
  slug: string;
  working: ArticleDocument;
  published: ArticleDocument | null;
  version: number;
  deleted_at: string | null;
  updated_at: string;
}

export function validateDocument(kind: 'blog' | 'life', slug: string, input: unknown): ArticleDocument {
  const doc = documentSchema.parse(input);
  const data = (kind === 'blog' ? blogSchema : lifeSchema).parse({
    ...doc.data, slug, draft: false,
    tags: Array.isArray(doc.data.tags) ? doc.data.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
  });
  if (kind === 'blog' && categories.some((c) => c.slug === slug)) throw new Error('短链接与分类地址冲突');
  if (kind === 'blog' && !categories.some((c) => c.slug === (data as { category: string }).category)) throw new Error('请选择已有分类');
  // JSON normalizes dates across API, database and public-reader boundaries.
  return JSON.parse(JSON.stringify({ data, body: doc.body })) as ArticleDocument;
}
