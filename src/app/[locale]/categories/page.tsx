import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { getNoteCategories } from '@/lib/note-categories';
import { getPublicBlog } from '@/lib/content';
import { Link } from '@/i18n/navigation';
import { entryTitle } from '@/lib/localize';
import '../blog/notes.css';
export async function generateMetadata(): Promise<Metadata> { const locale=await getLocale();return {title:(locale==='zh'?'分类':'Categories')+' | DemiZ'}; }
export default async function CategoriesPage(){
 const locale=await getLocale();const zh=locale==='zh';const categories=await getNoteCategories();const entries=await getPublicBlog();
 return <div className="notes-page"><header><p className="eyebrow">CATEGORIES</p><h1>{zh?'分类':'Categories'}</h1><p>{zh?'按分类浏览笔记与收藏的链接。':'Browse notes and collected links by topic.'}</p></header>
  <section aria-label={zh?'分类':'Note categories'} className="note-category-list">{categories.map(c=><section id={`category-${c.slug}`} key={c.slug} className="note-category"><h2>{c.name}</h2>{c.description && <p>{c.description}</p>}<ul>{entries.filter(e=>e.data.category===c.slug).map(e=><li key={e.slug}><Link href={'/blog/'+e.slug}>{entryTitle(e,locale)}</Link></li>)}{c.links.map((l,i)=><li key={i}>{l.url.startsWith('/')?<Link href={l.url}>{l.title}</Link>:<a href={l.url} target="_blank" rel="noopener noreferrer">{l.title} ↗</a>}</li>)}</ul>{!c.links.length && !entries.some(e=>e.data.category===c.slug) && <p className="note-empty">{zh?'暂无笔记链接':'No notes yet'}</p>}</section>)}</section>

 {!categories.length && <p>{zh?'暂无分类。':'No categories yet.'}</p>}</div>;
}
