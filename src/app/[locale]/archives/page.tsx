import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { entryPath, getPublicContent } from '@/lib/content';
import { categoryLabel } from '@/lib/categories';
import { Link } from '@/i18n/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'archives' });
  return {
    title: `${t('title')} | DemiZ`,
    description: 'DemiZ 的全部公开记录，按年份归档。',
  };
}

export default async function ArchivesPage() {
  const t = await getTranslations('archives');
  const locale = await getLocale();
  const entries = getPublicContent();
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const year = String(entry.data.published.getFullYear());
    const list = groups.get(year) ?? [];
    list.push(entry);
    groups.set(year, list);
  }
  const dateFormat = (d: Date) => d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');

  return (
    <>
      <header className="index-head">
        <p className="eyebrow">Archive</p>
        <h1>{t('title')}</h1>
        <p>{t('description', { count: entries.length })}</p>
      </header>
      <div className="archive-book">
        {[...groups].map(([year, items]) => (
          <section aria-labelledby={`year-${year}`} className="archive-year" key={year}>
            <h2 id={`year-${year}`}>{year}</h2>
            <ul className="list-clean archive-list">
              {items.map((item) => (
                <li key={`${item.collection}:${item.slug}`}>
                  <time dateTime={item.data.published.toISOString()}>{dateFormat(item.data.published)}</time>
                  <span className="archive-item">
                    <Link href={entryPath(item) as never}>{item.data.title}</Link>
                    <span className="read-badge archive-read-badge" data-read-marker={`${item.collection}:${item.data.slug}`} hidden>[{t('read')}]</span>
                  </span>
                  {item.collection === 'blog' && (
                    <Link className="tag" href={`/blog/${item.data.category}/` as never}>{categoryLabel(item.data.category)}</Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
