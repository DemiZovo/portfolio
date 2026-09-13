import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { workshopProjects } from '@/data/workshop';
import { projectsSchema } from '@/lib/workshop-model';
import { EditorError, editorFailure, privateJson, readBody, requireOwner, requireSameOrigin, supabaseRequest } from '@/lib/editor-server';

export async function GET() {
  try {
    const token = await requireOwner();
    const response = await supabaseRequest('/rest/v1/workshop_projects?id=eq.true&select=projects,version', token);
    if (!response.ok) throw new EditorError('项目管理尚未就绪，请先执行 supabase-workshop.sql 初始化项目表。', 503);
    const [row] = await response.json();
    if (!row) throw new EditorError('项目表尚未初始化，请执行 supabase-workshop.sql。', 503);
    return privateJson({ projects: projectsSchema.parse(row.projects ?? workshopProjects), version: row.version });
  } catch (error) { return editorFailure(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const token = await requireOwner();
    const parsed = z.object({ version: z.number().int().positive(), projects: projectsSchema }).safeParse(await readBody(request));
    if (!parsed.success) throw new EditorError(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('；'));
    const response = await supabaseRequest('/rest/v1/rpc/save_workshop_projects', token, {
      method: 'POST', body: JSON.stringify({ expected_version: parsed.data.version, project_list: parsed.data.projects }),
    });
    if (!response.ok) {
      const issue = await response.json().catch(() => ({}));
      if (issue.code === '40001') throw new EditorError('项目已在其他窗口修改。请先导出当前输入，再重新加载最新列表。', 409);
      throw new EditorError('保存失败，请检查项目表配置后重试。当前输入已保留。', 503);
    }
    const row = await response.json();
    for (const locale of ['zh', 'en']) revalidatePath(`/${locale}/workshop`);
    return privateJson({ projects: row.projects, version: row.version });
  } catch (error) { return editorFailure(error); }
}
