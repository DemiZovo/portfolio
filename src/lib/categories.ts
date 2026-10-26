import { getNoteCategories } from './note-categories';
export async function categoryLabel(slug: string): Promise<string> {
  return (await getNoteCategories()).find(category => category.slug === slug)?.name ?? slug;
}
