import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getPublicContent } from '@/lib/content';
import { Link } from '@/i18n/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tags' });
  return { title: t('title') };
}

export default async function TagsIndexPage() {
  const t = await getTranslations('tags');
  const entries = getPublicContent();
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return (
    <>
      <header className="index-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p>{t('heroDesc')}</p>
      </header>
      <ul className="tags tags-index">
        {[...counts].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN')).map(([tag, count]) => (
          <li key={tag}><Link className="tag" href={`/tags/${encodeURIComponent(tag)}/` as never}>{tag}（{count}）</Link></li>
        ))}
      </ul>
    </>
  );
}
