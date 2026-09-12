// Generates a reviewable SQL import; never contacts or changes the database.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/export-editor-import.mjs OUTPUT.sql');
const quote = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
const statements = ['begin;', 'set standard_conforming_strings = on;'];
let count = 0;
for (const kind of ['blog', 'life']) {
  const dir = path.join('src', 'content', kind);
  for (const file of fs.readdirSync(dir).filter(name => /\.mdx?$/.test(name))) {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error(`Invalid slug in ${file}`);
    const doc = { data: { ...data, draft: false }, body: content };
    statements.push(`insert into public.editor_articles(kind,slug,working,published) values ('${kind}','${data.slug}',${quote(doc)},${data.draft ? 'null' : quote(doc)}) on conflict (kind,slug) do nothing;`);
    count++;
  }
}
statements.push('commit;');
fs.writeFileSync(output, statements.join('\n') + '\n', { flag: 'wx' });
console.log(`Prepared ${count} Markdown entries in ${output}. Review before running in Supabase. Existing rows will not be overwritten.`);
