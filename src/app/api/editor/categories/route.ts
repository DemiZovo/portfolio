import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { noteCategoriesSchema } from '@/lib/note-category-model';
import { defaultNoteCategories } from '@/lib/note-categories';
import { getPublicBlog } from '@/lib/content';
import { EditorError, editorFailure, privateJson, readBody, requireOwner, requireSameOrigin, supabaseRequest } from '@/lib/editor-server';
export async function GET() { try {
 const token=await requireOwner(); const response=await supabaseRequest('/rest/v1/note_categories?id=eq.true&select=categories,version',token);
 if(!response.ok) throw new EditorError('请先执行 supabase-note-categories.sql 初始化分类管理。',503);
 const [row]=await response.json(); if(!row) throw new EditorError('分类尚未初始化。',503);
 return privateJson({categories:noteCategoriesSchema.parse(row.categories ?? defaultNoteCategories()),version:row.version});
} catch(e) { return editorFailure(e); } }
export async function POST(request:Request) { try {
 requireSameOrigin(request); const token=await requireOwner();
 const input=z.object({version:z.number().int().positive(),categories:noteCategoriesSchema}).safeParse(await readBody(request));
 if(!input.success) throw new EditorError(input.error.issues.map(i=>i.message).join('；'));
 const articles=await getPublicBlog();
 if(input.data.categories.some(c=>articles.some(a=>a.slug===c.slug))) throw new EditorError('分类标识不能与已发布笔记的短链接相同。');
 const response=await supabaseRequest('/rest/v1/rpc/save_note_categories',token,{method:'POST',body:JSON.stringify({expected_version:input.data.version,category_list:input.data.categories})});
 if(!response.ok) { const issue=await response.json().catch(()=>({})); throw new EditorError(issue.code==='40001'?'分类已在其他窗口修改，请导出输入后重新加载。':'分类保存失败，请检查数据库配置；当前输入已保留。',issue.code==='40001'?409:503); }
 const row=await response.json(); revalidatePath('/','layout');
 return privateJson({categories:row.categories,version:row.version});
} catch(e) { return editorFailure(e); } }
