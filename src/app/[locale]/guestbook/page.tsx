import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import GuestbookChat from '@/components/GuestbookChat';
import { siteConfig } from '@/config/site';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guestbook' });
  return {
    title: `${t('title')} | ${siteConfig.name}`,
    description: `在 ${siteConfig.name} 的访客留言板分享想法、建议或问候。`,
  };
}

export default async function GuestbookPage() {
  const t = await getTranslations('guestbook');
  return (
    <article className="article guestbook">
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1>{t('title')}</h1>
      <p className="guestbook-intro">
        {t('intro')}
      </p>
      <aside className="guestbook-note" aria-label={t('noteLabel')}>
        {t('note')}
      </aside>
      <GuestbookChat />
      <noscript><p className="empty">{t('noJs')}</p></noscript>
    </article>
  );
}
