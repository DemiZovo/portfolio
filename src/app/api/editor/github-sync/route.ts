import { editorFailure, privateJson, requireOwner, requireSameOrigin } from '@/lib/editor-server';
import { flushGitHubQueue } from '@/lib/editor-github-sync';

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const token = await requireOwner();
    return privateJson(await flushGitHubQueue(token));
  } catch (error) { return editorFailure(error); }
}
