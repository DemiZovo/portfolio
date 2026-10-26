import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import ArticleRow from '@/components/ArticleRow';
import { getNoteCategories } from '@/lib/note-categories';
import { getPublicBlog } from '@/lib/content';
import { Link } from '@/i18n/navigation';
import { entryTitle } from '@/lib/localize';
import './notes.css';
export async function generateMetadata(): Promise<Metadata> { const t=await getTranslations('blog'); return {title:t('title')+' | DemiZ',description:t('description')}; }
export default async function BlogIndexPage() {
 const locale=await getLocale(); const zh=locale==='zh'; const categories=await getNoteCategories(); const entries=await getPublicBlog();
 return <div className="notes-page"><header><p className="eyebrow">NOTES</p><h1>{zh?'笔记':'Notes'}</h1><p>{zh?'按分类整理学习记录，也收集值得回看的链接。':'Learning notes and links, organized by topic.'}</p></header>
 <section aria-label={zh?'笔记分类':'Note categories'} className="note-category-list">{categories.map(c=><section id={`category-${c.slug}`} key={c.slug} className="note-category"><h2>{c.name}</h2>{c.description && <p>{c.description}</p>}<ul>{entries.filter(e=>e.data.category===c.slug).map(e=><li key={e.slug}><Link href={'/blog/'+e.slug}>{entryTitle(e,locale)}</Link></li>)}{c.links.map((l,i)=><li key={i}>{l.url.startsWith('/')?<Link href={l.url}>{l.title}</Link>:<a href={l.url} target="_blank" rel="noopener noreferrer">{l.title} ↗</a>}</li>)}</ul>{!c.links.length && !entries.some(e=>e.data.category===c.slug) && <p className="note-empty">{zh?'暂无笔记链接':'No notes yet'}</p>}</section>)}</section>
 <section aria-labelledby="all-notes"><h2 id="all-notes">{zh?'全部笔记':'All notes'}</h2><div className="article-list">{entries.map(entry=><ArticleRow key={entry.slug} entry={entry} />)}</div>{!entries.length && <p>{zh?'暂无笔记。':'No notes yet.'}</p>}</section></div>;
}
