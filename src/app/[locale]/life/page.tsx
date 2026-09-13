import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { entryPath, getPublicLife } from '@/lib/content';
import { Link } from '@/i18n/navigation';
import { ArticleEditLink } from '@/components/OwnerTools';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'life' });
  return { title: t('title') };
}

export default async function LifeIndexPage() {
  const tArch = await getTranslations('archives');
  const locale = await getLocale();
  const entries = (await getPublicLife());
  const dateFormat = (d: Date) => d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');

  return (
    <>
      <ArticleEditLink kind="life" />
      <div className="grid journal-grid">
        {entries.map((entry) => (
          <article className="card article-card journal-card" key={entry.slug}>
            <p className="meta"><time dateTime={entry.data.published.toISOString()}>{dateFormat(entry.data.published)}</time></p>
            <h2><Link className="card-link" href={entryPath(entry) as never}>{entry.data.title}</Link></h2>
            <p>{entry.data.description}</p>
            <div className="card-footer"><span className="read-badge" data-read-marker={`life:${entry.data.slug}`} hidden>{tArch('read')}</span><ArticleEditLink kind="life" slug={entry.data.slug} /></div>
          </article>
        ))}
      </div>
    </>
  );
}
