import { z } from 'zod';
import { blogSchema, lifeSchema } from './schemas';

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
  });
  // JSON normalizes dates across API, database and public-reader boundaries.
  return JSON.parse(JSON.stringify({ data, body: doc.body })) as ArticleDocument;
}
