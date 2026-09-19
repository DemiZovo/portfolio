import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { createDatabase, asUser, owner, visitor } from './editor-fixture.mjs';
const source = fs.readFileSync('src/lib/github-articles.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { syncGitHubArticle, articleMarkdown } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
process.env.WRITER_GITHUB_TOKEN = 'test-only';
process.env.WRITER_GITHUB_REPOSITORY = 'fixture/repo';
const job = { kind: 'blog', slug: 'test-note', revision: 1, document: { data: { title: '中文: 标题', draft: true }, body: '公开正文' } };
let calls = [];
let replies = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  calls.push({ url, ...options });
  const [status, body] = replies.shift();
  return new Response(JSON.stringify(body), { status });
};
try {
  replies = [[404, {}], [201, {}]];
  await syncGitHubArticle(job);
  assert.equal(calls[1].method, 'PUT');
  const markdown = Buffer.from(JSON.parse(calls[1].body).content, 'base64').toString();
  assert.equal(markdown, articleMarkdown(job));
  assert.match(markdown, /"draft": false/);
  const bytes = Buffer.from(markdown);
  const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  calls = []; replies = [[200, { sha, type: 'file' }]];
  await syncGitHubArticle(job); assert.equal(calls.length, 1);
  calls = []; replies = [[200, { sha: 'old', type: 'file' }], [200, {}]];
  await syncGitHubArticle({ ...job, document: null });
  assert.equal(calls[1].method, 'DELETE'); assert.equal(JSON.parse(calls[1].body).sha, 'old');
  calls = []; replies = [[404, {}]];
  await syncGitHubArticle({ ...job, document: null }); assert.equal(calls.length, 1);
  replies = [[403, {}]]; await assert.rejects(syncGitHubArticle(job), /403/);
  replies = [[200, { sha: 'old', type: 'file' }], [409, {}]];
  await assert.rejects(syncGitHubArticle(job), /409/);
  await assert.rejects(syncGitHubArticle({ ...job, slug: '../secret' }), /路径/);
} finally { globalThis.fetch = originalFetch; }
const db = await createDatabase();
try {
  await db.exec(fs.readFileSync('supabase-github-sync.sql', 'utf8'));
  const mutate = (action, row, document = job.document) => asUser(db, owner, tx => tx.query(
    'select * from public.edit_article($1,$2,$3,$4,$5,$6)', [action, row?.id ?? null, row?.version ?? null, job.kind, job.slug, document],
  )).then(r => r.rows[0]);
  const lease = '00000000-0000-4000-8000-000000000003';
  const batch = (operation, revision = null, user = owner, leaseId = lease) => asUser(db, user, tx => tx.query(
    'select public.article_github_batch($1,$2,$3,$4,$5) as result', [operation, leaseId, job.kind, job.slug, revision],
  )).then(r => r.rows[0].result);
  let row = await mutate('create');
  assert.equal((await db.query('select * from article_github_queue')).rows.length, 0);
  row = await mutate('publish', row);
  row = await mutate('save', row, { ...job.document, body: 'PRIVATE' });
  await assert.rejects(batch('claim', null, visitor), e => e.code === '42501');
  const jobs = await batch('claim'); assert.equal(jobs[0].document.body, '公开正文');
  assert.equal(await batch('claim', null, owner, visitor), null);
  row = await mutate('trash', row);
  assert.equal(await batch('ack', jobs[0].revision), 1, 'old ack must not erase a newer deletion');
  await batch('release');
  const deletions = await batch('claim'); assert.equal(deletions[0].document, null);
  await batch('release'); // simulated network failure: job survives release
  assert.equal((await batch('claim'))[0].revision, deletions[0].revision);
  row = await mutate('purge', row);
  await batch('release');
  const purged = await batch('claim'); assert.equal(purged[0].document, null);
  assert.equal(await batch('ack', purged[0].revision), 0);
  await batch('release');
  await db.exec(fs.readFileSync('supabase-github-sync.sql', 'utf8'));
  assert.equal((await batch('claim')).length, 0);
  await batch('release');
  console.log('PASS: GitHub writes/deletes/idempotency/errors, safe paths, durable queue, permissions, concurrent claims, revision acknowledgements, draft isolation, purge tombstones, repeatable migration.');
} finally { await db.close(); }
