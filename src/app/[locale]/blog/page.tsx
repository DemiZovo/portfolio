import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import ArticleRow from '@/components/ArticleRow';
import { getPublicBlog } from '@/lib/content';
import './notes.css';
export async function generateMetadata(): Promise<Metadata> { const t=await getTranslations('blog'); return {title:t('title')+' | DemiZ',description:t('description')}; }
export default async function BlogIndexPage() {
 const locale=await getLocale(); const zh=locale==='zh'; const entries=await getPublicBlog();
 return <div className="notes-page"><header><p className="eyebrow">NOTES</p><h1>{zh?'笔记':'Notes'}</h1><p>{zh?'记录学习过程与实践。':'Notes on learning and practice.'}</p></header>
 <section aria-labelledby="all-notes"><h2 id="all-notes">{zh?'全部笔记':'All notes'}</h2><div className="article-list">{entries.map(entry=><ArticleRow key={entry.slug} entry={entry} />)}</div>{!entries.length && <p>{zh?'暂无笔记。':'No notes yet.'}</p>}</section></div>;
}
