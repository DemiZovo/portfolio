import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import GuestbookThread from '@/components/GuestbookThread';
import { siteConfig } from '@/config/site';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guestbook' });
  return {
    title: `${t('thread')} | ${siteConfig.name}`,
  };
}

export default async function GuestbookThreadPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('guestbook');
  const numericId = Number(id);

  return (
    <article className="article guestbook">
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1>{t('thread')}</h1>
      {Number.isInteger(numericId) ? <GuestbookThread id={numericId} /> : <p className="empty">{t('notFoundMessage')}</p>}
    </article>
  );
}
