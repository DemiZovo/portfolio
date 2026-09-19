import { createHash } from 'node:crypto';
import type { ArticleDocument } from './editor-model';

export interface GitHubJob { kind: 'blog' | 'life'; slug: string; document: ArticleDocument | null; revision: number }
export function githubConfig() {
  const token = process.env.WRITER_GITHUB_TOKEN;
  const repo = process.env.WRITER_GITHUB_REPOSITORY;
  const branch = process.env.WRITER_GITHUB_BRANCH || 'main';
  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('GitHub 同步尚未配置，请设置 Writer 的 GitHub 环境变量。');
  return { token, repo, branch };
}
export function articleMarkdown(job: GitHubJob) {
  if (!job.document) return null;
  return `---\n${JSON.stringify({ ...job.document.data, slug: job.slug, draft: false }, null, 2)}\n---\n\n${job.document.body}\n`;
}
export async function syncGitHubArticle(job: GitHubJob) {
  const { token, repo, branch } = githubConfig();
  if (!['blog', 'life'].includes(job.kind) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.slug)) throw new Error('同步文章路径无效。');
  const path = `src/content/${job.kind}/${job.slug}.md`;
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const request = (target: string, init: RequestInit = {}) => fetch(target, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(8_000),
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  const current = await request(`${url}?ref=${encodeURIComponent(branch)}`);
  if (!current.ok && current.status !== 404) throw new Error(`GitHub 读取失败（${current.status}），请检查仓库和写入权限。`);
  const file = current.ok ? await current.json() as { sha: string; type: string } : null;
  if (file && file.type !== 'file') throw new Error('GitHub 目标路径不是文件。');
  const markdown = articleMarkdown(job);
  if (markdown === null && !file) return;
  const bytes = markdown === null ? null : Buffer.from(markdown, 'utf8');
  // Git blob hashes make timeout retries idempotent, including large files.
  if (bytes && file?.sha === createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')) return;
  const result = await request(url, { method: bytes ? 'PUT' : 'DELETE', body: JSON.stringify({
    branch, message: `writer: ${bytes ? 'publish' : 'remove'} ${job.kind}/${job.slug}`,
    ...(file ? { sha: file.sha } : {}), ...(bytes ? { content: bytes.toString('base64') } : {}),
  }) });
  if (!result.ok) throw new Error(`GitHub 同步失败（${result.status}），待同步记录已保留，请重试。`);
}
