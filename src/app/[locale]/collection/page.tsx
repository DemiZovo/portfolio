import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'collection' });
  return {
    title: `${t('title')} | DemiZ`,
    description: t('heroDesc'),
  };
}

export default async function CollectionPage() {
  const t = await getTranslations('collection');
  const empty = t('empty').split('\n');

  return (
    <>
      <div className="grid journal-grid">
        <article className="card article-card journal-card collection-empty-card">
          <p>{empty.map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</p>
        </article>
      </div>
    </>
  );
}
