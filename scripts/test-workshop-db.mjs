import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDatabase, asUser, owner, visitor } from './editor-fixture.mjs';
const db = await createDatabase();
try {
  const sql = fs.readFileSync(new URL('../supabase-workshop.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  const save = (user, version, projects) => asUser(db, user, tx => tx.query('select * from public.save_workshop_projects($1,$2)', [version, JSON.stringify(projects)])).then(r => r.rows[0]);
  const seed = (await db.query('select * from public.workshop_projects')).rows[0];
  assert.equal(seed.projects, null);
  await assert.rejects(save(visitor, 1, []), e => e.code === '42501');
  await assert.rejects(asUser(db, owner, tx => tx.exec('delete from public.workshop_projects')), e => e.code === '42501');
  await assert.rejects(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.exec("select public.save_workshop_projects(1,'[]')"); }), e => e.code === '42501');
  let row = await save(owner, 1, [{ name: 'A' }, { name: 'B' }]);
  await assert.rejects(save(owner, 1, []), e => e.code === '40001');
  row = await save(owner, row.version, [{ name: 'B' }, { name: 'A edited' }]);
  assert.deepEqual(row.projects.map(p => p.name), ['B', 'A edited']);
  row = await save(owner, row.version, []);
  assert.deepEqual(row.projects, []);
  await db.exec(sql);
  assert.deepEqual((await db.query('select projects from public.workshop_projects')).rows[0].projects, []);
  await db.transaction(async tx => { await tx.exec('set local role anon'); assert.equal((await tx.query('select * from public.workshop_projects')).rows.length, 1); });
  console.log('PASS: public reads, owner-only writes, conflicts, edits/reordering, intentional empty list, non-destructive migration rerun.');
} finally { await db.close(); }
