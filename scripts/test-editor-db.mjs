import assert from 'node:assert/strict';
import { createDatabase, asUser, owner, visitor } from './editor-fixture.mjs';
const db = await createDatabase();
try {
  const mutate = (user, action, row, document = { data: { title: 'Fixture' }, body: 'Original' }) => asUser(db, user, tx => tx.query(
    'select * from public.edit_article($1,$2,$3,$4,$5,$6)', [action, row?.id ?? null, row?.version ?? null, 'blog', 'fixture-note', document],
  )).then(result => result.rows[0]);
  await assert.rejects(mutate(visitor, 'create'), e => e.code === '42501');
  let row = await mutate(owner, 'create');
  assert.equal(row.published, null);
  await assert.rejects(mutate(owner, 'create'), e => e.code === '23505');
  const stale = row;
  row = await mutate(owner, 'publish', row);
  assert.equal(row.published.body, 'Original');
  await assert.rejects(mutate(owner, 'save', stale), e => e.code === '40001');
  row = await mutate(owner, 'save', row, { data: { title: 'Changed' }, body: 'PRIVATE DRAFT' });
  assert.equal(row.published.body, 'Original');
  assert.equal(row.working.body, 'PRIVATE DRAFT');
  const unauthorized = await asUser(db, visitor, tx => tx.query('select * from public.editor_articles'));
  assert.equal(unauthorized.rows.length, 0);
  await assert.rejects(asUser(db, owner, tx => tx.exec('delete from public.editor_articles')), e => e.code === '42501');
  await assert.rejects(mutate(owner, 'purge', row));
  row = await mutate(owner, 'unpublish', row); assert.equal(row.published, null);
  row = await mutate(owner, 'trash', row); assert.ok(row.deleted_at);
  await assert.rejects(mutate(owner, 'publish', row));
  row = await mutate(owner, 'restore', row); assert.equal(row.deleted_at, null); assert.equal(row.published, null);
  row = await mutate(owner, 'trash', row); await mutate(owner, 'purge', row);
  assert.equal((await db.query('select * from public.editor_articles')).rows.length, 0);
  console.log('PASS: owner/RLS permissions, duplicate slug, atomic version conflicts, draft isolation, publish, unpublish, trash, restore and purge.');
} finally { await db.close(); }
