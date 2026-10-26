import { cache } from 'react';
import { getOrderedCategories } from '@/data/categories';
import { noteCategoriesSchema, type NoteCategory } from './note-category-model';
export const defaultNoteCategories = (): NoteCategory[] => getOrderedCategories().map(c => ({ slug:c.slug,name:c.zh,description:c.description,links:[] }));
export const getNoteCategories = cache(async (): Promise<NoteCategory[]> => {
 if(process.env.CONTENT_SOURCE !== 'supabase') return defaultNoteCategories();
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url || !key) throw new Error('分类配置不完整');
 const response = await fetch(url.replace(/\/$/,'') + '/rest/v1/note_categories?id=eq.true&select=categories', {cache:'no-store',headers:{apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key})},signal:AbortSignal.timeout(15000)});
 if(!response.ok) throw new Error('分类读取失败，请先执行 supabase-note-categories.sql');
 const [row] = await response.json();
 if(!row) throw new Error('分类尚未初始化');
 return row.categories === null ? defaultNoteCategories() : noteCategoriesSchema.parse(row.categories);
});
