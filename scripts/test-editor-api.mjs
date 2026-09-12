// Run against a local production build configured with editor-fixture.mjs only.
import assert from 'node:assert/strict';
const origin = process.argv[2] || 'http://localhost:3100';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local test targets only');
let cookie = '';
async function call(path, value, headers = {}) {
  return fetch(origin + '/api/editor/' + path, {
    method: value === undefined ? 'GET' : 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie, ...headers },
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
}
assert.equal((await call('articles')).status, 401);
assert.equal((await call('preview', { data: {}, body: 'secret' })).status, 401);
assert.equal((await call('session', { email: 'owner@example.test', password: 'local-test-only' }, { Origin: 'https://invalid.example' })).status, 403);
const login = await call('session', { email: 'owner@example.test', password: 'local-test-only' });
assert.equal(login.status, 200);
cookie = login.headers.get('set-cookie').split(';')[0];
assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
assert.match(login.headers.get('set-cookie'), /Secure/i);
assert.match(login.headers.get('set-cookie'), /SameSite=strict/i);
assert.match((await call('articles')).headers.get('cache-control'), /no-store/);
const slug = `editor-test-${Date.now()}`;
const doc = { data: { title: 'Editor integration fixture', description: 'A local test article', category: 'other', published: '2026-09-11', tags: ['editor-fixture-tag'] }, body: 'PUBLIC ORIGINAL' };
let response = await call('articles', { action: 'create', kind: 'blog', slug: 'web', document: doc });
assert.equal(response.status, 400);
response = await call('articles', { action: 'create', kind: 'blog', slug, document: doc });
assert.equal(response.status, 200);
let row = await response.json();
const initial = row;
async function mutate(action, document = doc, version = row.version) {
  const result = await call('articles', { action, id: row.id, version, document });
  assert.equal(result.status, 200, `${action}: ${await result.clone().text()}`);
  row = await result.json();
}
async function publicContains(expected) {
  const article = await fetch(`${origin}/zh/blog/${slug}`);
  if (expected) assert.equal(article.status, 200);
  else {
    // Next's streamed notFound response can be HTTP 200 with a noindex boundary.
    const html = await article.text();
    assert.ok(article.status === 404 || (article.status === 200 && html.includes('noindex')));
    assert.ok(!html.includes('PUBLIC ORIGINAL') && !html.includes('PRIVATE UNPUBLISHED REVISION'));
  }
  for (const path of ['/search-index.json', '/rss.xml', '/sitemap.xml', '/zh', '/zh/blog', '/zh/archives', '/zh/blog/other']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.equal((await response.text()).includes(slug), expected, path);
  }
}
await publicContains(false);
await mutate('publish'); await publicContains(true);
const updated = { ...doc, body: 'PRIVATE UNPUBLISHED REVISION' };
await mutate('save', updated);
const live = await (await fetch(`${origin}/zh/blog/${slug}`)).text();
assert.ok(live.includes('PUBLIC ORIGINAL')); assert.ok(!live.includes('PRIVATE UNPUBLISHED REVISION'));
response = await call('articles', { action: 'save', id: row.id, version: initial.version, document: updated });
assert.equal(response.status, 409);
response = await call('preview', { data: {}, body: '[bad](javascript:alert%281%29)\n\n<script>alert(1)</script>\n\n# Safe heading' });
assert.equal(response.status, 200);
const preview = await response.json();
assert.ok(!preview.html.includes('javascript:')); assert.ok(!preview.html.includes('<script>')); assert.ok(preview.html.includes('Safe heading'));
await mutate('unpublish'); await publicContains(false);
await mutate('publish', updated); await publicContains(true);
await mutate('trash'); await publicContains(false);
await mutate('restore'); await publicContains(false);
assert.equal(row.working.body, updated.body);
await mutate('trash'); await mutate('purge');
assert.ok(!(await (await call('articles')).json()).some(item => item.id === row.id));
assert.equal((await call('articles', { action: 'publish', id: row.id, version: row.version, document: doc }, { Cookie: 'demiz-owner=fixture-visitor' })).status, 403);
console.log('PASS: login cookies, anonymous/visitor/CSRF rejection, private preview, slug validation, new URLs without rebuild, published snapshot isolation, cache/discovery invalidation, version conflicts, trash, restore and purge.');
