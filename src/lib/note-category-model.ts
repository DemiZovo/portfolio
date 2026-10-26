import { z } from 'zod';
export const noteCategoriesSchema = z.array(z.object({
 slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '分类标识须为小写英文、数字和连字符').max(100),
 name: z.string().trim().min(1).max(80), description: z.string().trim().max(240),
 links: z.array(z.object({ title: z.string().trim().min(1).max(120), url: z.string().trim().max(500).refine(v => /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(v) || (() => { try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } })(), '使用 /blog/笔记标识 或完整 HTTPS 链接') })).max(200),
})).max(60).superRefine((rows, ctx) => { const seen = new Set<string>(); rows.forEach((row,i) => { if(seen.has(row.slug)) ctx.addIssue({code:'custom',path:[i,'slug'],message:'分类标识重复'}); seen.add(row.slug); }); });
export type NoteCategory = z.infer<typeof noteCategoriesSchema>[number];
export type CategorySnapshot = { categories: NoteCategory[]; version: number };
