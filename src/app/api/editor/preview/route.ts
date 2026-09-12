import { renderMarkdown } from '@/lib/markdown';
import { documentSchema } from '@/lib/editor-model';
import { EditorError, editorFailure, privateJson, readBody, requireOwner, requireSameOrigin } from '@/lib/editor-server';
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireOwner();
    const parsed = documentSchema.safeParse(await readBody(request));
    if (!parsed.success) throw new EditorError('预览内容无效。');
    return privateJson(await renderMarkdown(parsed.data.body));
  } catch (error) { return editorFailure(error); }
}
