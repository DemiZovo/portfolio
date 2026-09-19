import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { flushGitHubQueue } from '@/lib/editor-github-sync';
export const maxDuration = 60;
import { type EditorArticle, validateDocument } from '@/lib/editor-model';
import { EditorError, editorFailure, privateJson, readBody, requireOwner, requireSameOrigin, supabaseRequest } from '@/lib/editor-server';

export async function GET() {
  try {
    const token = await requireOwner();
    const rows: EditorArticle[] = [];
    for (let offset = 0; ; offset += 100) {
      const response = await supabaseRequest(`/rest/v1/editor_articles?select=*&order=updated_at.desc,id.asc&limit=100&offset=${offset}`, token);
      if (!response.ok) throw new EditorError('无法读取文章，请检查数据库配置。', 503);
      const page: EditorArticle[] = await response.json();
      rows.push(...page);
      if (page.length < 100) break;
    }
    return privateJson(rows);
  } catch (error) { return editorFailure(error); }
}

const mutation = z.object({
  action: z.enum(['create', 'save', 'publish', 'unpublish', 'trash', 'restore', 'purge']),
  id: z.string().uuid().optional(), version: z.number().int().positive().optional(),
  kind: z.enum(['blog', 'life']).optional(), slug: z.string().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  document: z.unknown().optional(),
});
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const token = await requireOwner();
    const parsed = mutation.safeParse(await readBody(request));
    if (!parsed.success) throw new EditorError('文章参数无效。');
    const input = parsed.data;
    let kind = input.kind, slug = input.slug;
    if (input.action !== 'create') {
      if (!input.id || !input.version) throw new EditorError('缺少文章版本。');
      const response = await supabaseRequest(`/rest/v1/editor_articles?id=eq.${input.id}&select=kind,slug`, token);
      if (!response.ok) throw new EditorError('无法读取文章。', 503);
      const [row] = await response.json();
      if (!row) throw new EditorError('文章不存在。', 404);
      kind = row.kind; slug = row.slug;
    }
    if (!kind || !slug) throw new EditorError('缺少文章类型或短链接。');
    let document;
    if (['create', 'save', 'publish'].includes(input.action)) {
      try { document = validateDocument(kind, slug, input.document); }
      catch (error) { throw new EditorError(error instanceof z.ZodError ? error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('；') : (error as Error).message); }
    }
    const result = await supabaseRequest('/rest/v1/rpc/edit_article', token, { method: 'POST', body: JSON.stringify({
      action: input.action, article_id: input.id ?? null, expected_version: input.version ?? null,
      article_kind: kind, article_slug: slug, document: document ?? null,
    }) });
    if (!result.ok) {
      const issue = await result.json().catch(() => ({}));
      if (issue.code === '40001') throw new EditorError('文章已在其他窗口修改，请先导出当前输入，再重新打开最新版本。', 409);
      if (issue.code === '23505') throw new EditorError('短链接已存在（包括回收站），请更换。', 409);
      throw new EditorError('文章操作失败，请检查数据库配置后重试。', 503);
    }
    const article = await result.json();
    revalidateTag('public-articles');
    revalidatePath('/', 'layout');
    for (const path of ['/rss.xml', '/sitemap.xml', '/search-index.json']) revalidatePath(path);
    const githubSync = ['publish', 'unpublish', 'trash', 'restore', 'purge'].includes(input.action)
      ? await flushGitHubQueue(token) : undefined;
    return privateJson({ ...article, githubSync });
  } catch (error) { return editorFailure(error); }
}
