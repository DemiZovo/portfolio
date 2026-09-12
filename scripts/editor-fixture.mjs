// Local-only Supabase protocol fixture backed by real PostgreSQL (PGlite).
// Never imported by application code. No production authentication bypass exists.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import { createServer } from 'node:http';
const owner = '00000000-0000-4000-8000-000000000001';
const visitor = '00000000-0000-4000-8000-000000000002';
export async function createDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${owner}'), ('${visitor}');`);
  await db.exec(fs.readFileSync(new URL('../supabase-editor.sql', import.meta.url), 'utf8'));
  await db.query('insert into public.site_admins(user_id) values ($1)', [owner]);
  return db;
}
export async function asUser(db, user, action) {
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
    await tx.exec('set local role authenticated');
    return action(tx);
  });
}
export { owner, visitor };

export async function startFixture(port = 54329) {
  const db = await createDatabase();
  if (fs.existsSync('.test-output/import.sql')) await db.exec(fs.readFileSync('.test-output/import.sql', 'utf8'));
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const token = req.headers.authorization?.replace('Bearer ', '');
    const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    try {
      if (url.pathname === '/auth/v1/token') {
        if (body.email !== 'owner@example.test' || body.password !== 'local-test-only') return send(401, {});
        return send(200, { access_token: 'fixture-owner', expires_in: 3600 });
      }
      if (url.pathname === '/auth/v1/user') return send(token === 'fixture-owner' || token === 'fixture-visitor' ? 200 : 401, { id: token === 'fixture-owner' ? owner : visitor });
      if (url.pathname === '/auth/v1/logout') return send(200, {});
      if (url.pathname === '/rest/v1/rpc/is_site_admin') return send(200, token === 'fixture-owner');
      if (url.pathname === '/rest/v1/rpc/edit_article') {
        const result = await asUser(db, token === 'fixture-owner' ? owner : visitor, tx => tx.query(
          'select * from public.edit_article($1,$2,$3,$4,$5,$6)',
          [body.action, body.article_id, body.expected_version, body.article_kind, body.article_slug, body.document],
        ));
        return send(200, result.rows[0]);
      }
      if (url.pathname === '/rest/v1/editor_articles') {
        if (req.headers.apikey === 'sb_secret_fixture') {
          const result = await db.query('select kind,slug,published from public.editor_articles where deleted_at is null and published is not null order by id limit $1 offset $2', [Number(url.searchParams.get('limit') || 100), Number(url.searchParams.get('offset') || 0)]);
          return send(200, result.rows);
        }
        if (token !== 'fixture-owner') return send(403, {});
        const id = url.searchParams.get('id')?.replace('eq.', '');
        const result = id ? await db.query('select kind,slug from public.editor_articles where id=$1', [id]) : await db.query('select * from public.editor_articles order by updated_at desc,id limit $1 offset $2', [Number(url.searchParams.get('limit') || 100), Number(url.searchParams.get('offset') || 0)]);
        return send(200, result.rows);
      }
      send(404, {});
    } catch (e) { send(400, { code: e.code, message: e.message }); }
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return { db, server };
}
if (process.argv.includes('--serve')) {
  await startFixture();
  console.log('Local editor fixture listening on 127.0.0.1:54329 (disposable, in-memory PostgreSQL).');
}
