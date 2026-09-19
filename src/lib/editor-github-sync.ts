import { randomUUID } from 'node:crypto';
import { supabaseRequest } from './editor-server';
import { githubConfig, syncGitHubArticle, type GitHubJob } from './github-articles';

export async function flushGitHubQueue(token: string) {
  const lease = randomUUID();
  const rpc = async (operation: string, job?: GitHubJob) => {
    const response = await supabaseRequest('/rest/v1/rpc/article_github_batch', token, { method: 'POST', body: JSON.stringify({
      operation, lease_id: lease, job_kind: job?.kind ?? null, job_slug: job?.slug ?? null, job_revision: job?.revision ?? null,
    }) });
    if (!response.ok) throw new Error('无法读取同步队列，请确认已执行 supabase-github-sync.sql。');
    return response.json();
  };
  let claimed = false;
  try {
    githubConfig();
    const jobs: GitHubJob[] | null = await rpc('claim');
    if (!jobs) return { ok: false, message: 'GitHub 正在同步，请稍后点击同步按钮检查。' };
    claimed = true;
    // Keep each run bounded; remaining jobs are durable and retried on the next run.
    const deadline = Date.now() + 20_000;
    for (const job of jobs) {
      if (Date.now() > deadline) break;
      await syncGitHubArticle(job);
      await rpc('ack', job);
    }
    const remaining: number = await rpc('release');
    claimed = false;
    return { ok: remaining === 0, message: remaining ? `GitHub 还有 ${remaining} 篇待同步，请点击同步按钮继续。` : 'GitHub 已同步。' };
  } catch (error) {
    return { ok: false, message: error instanceof Error && !['TypeError', 'TimeoutError', 'AbortError'].includes(error.name)
      ? error.message : 'GitHub 暂时无法连接，请稍后重试同步。' };
  } finally {
    if (claimed) await rpc('release').catch(() => {});
  }
}
