import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDatabase, asUser, owner, visitor } from './editor-fixture.mjs';
const db=await createDatabase();
try {
 const sql=await readFile(new URL('../supabase-note-categories.sql',import.meta.url),'utf8');
 await db.exec(sql); await db.exec(sql);
 const save=(user,version,categories)=>asUser(db,user,tx=>tx.query('select * from public.save_note_categories($1,$2)',[version,JSON.stringify(categories)]));
 await assert.rejects(save(visitor,1,[]),e=>e.code==='42501');
 const list=[{slug:'test',name:'测试',description:'',links:[{title:'Note',url:'/blog/test-note'}]}];
 let result=await save(owner,1,list);assert.deepEqual(result.rows[0].categories,list);
 await assert.rejects(save(owner,1,[]),e=>e.code==='40001');
 result=await save(owner,2,[]);assert.deepEqual(result.rows[0].categories,[]);
 await assert.rejects(asUser(db,owner,tx=>tx.exec('delete from public.note_categories')),e=>e.code==='42501');
 console.log('PASS: category SQL is repeatable; owner-only writes, persisted links, conflict detection, empty-list deletion, direct-write protection.');
} finally {await db.close()}
