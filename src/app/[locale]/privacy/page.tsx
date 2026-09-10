import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/config/site';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return {
    title: `${t('title')} | ${siteConfig.name}`,
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');
  return (
    <article className="article">
      <h1>{t('title')}</h1>
      <p className="meta">{t('updated', { date: '2026-09-10' })}</p>
      <h2>{t('statsTitle')}</h2>
      <p>{t('stats1')}</p>
      <p>{t('stats2')}</p>
      <p>{t('performance')}</p>
      <h2>{t('commentsTitle')}</h2>
      <p>{t('comments')}</p>
      <h2>{t('scopeTitle')}</h2>
      <p>{t('scope')}</p>
      <h2>{t('hostingTitle')}</h2>
      <p>{t('hosting')}</p>
      <h2>{t('contactTitle')}</h2>
      <p>{t.rich('contact', { address: siteConfig.author.email, email: (chunks) => <a href={`mailto:${siteConfig.author.email}`}>{chunks}</a> })}</p>
    </article>
  );
}
