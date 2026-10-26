import { getNoteCategories } from './note-categories';
import { getCategory, type Category } from '../data/categories';
import { getPublicBlog, type BlogEntry } from './content';

export interface CategoryWithCount extends Category {
  count: number;
}

/** 分类按 order 排序，附文章数；未在 categories.ts 注册的 category 会被忽略。 */
export async function getBlogCategories(): Promise<CategoryWithCount[]> {
  const counts = new Map<string, number>();
  for (const entry of (await getPublicBlog())) {
    const slug = entry.data.category;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return (await getNoteCategories()).map((category, order) => ({ ...category, zh: category.name, card: '', order, count: counts.get(category.slug) ?? 0 }));
}

/** 取某分类下所有公开文章（按时间倒序）。 */
export async function getBlogByCategory(slug: string): Promise<BlogEntry[]> {
  return (await getPublicBlog()).filter((entry) => entry.data.category === slug);
}

/** 文章分类的中文名；未注册的分类退回原文。 */
export async function categoryLabel(slug: string): Promise<string> {
  return (await getNoteCategories()).find(c => c.slug === slug)?.name ?? getCategory(slug)?.zh ?? slug;
}

/**
 * 旧分类名 → 新 slug 的迁移映射（v2 重构前的历史 URL，用于 301 重定向）。
 */
export { legacyCategoryAliases } from '../data/category-aliases';
