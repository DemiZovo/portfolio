import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import CopyEmail from '@/components/CopyEmail';
import { siteConfig } from '@/config/site';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: `${t('title')} | ${siteConfig.name}`,
  };
}

export default async function AboutPage() {
  const t = await getTranslations('about');
  return (
    <article className="article">
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1>{t('title')}</h1>
      <div className="portrait-card portrait-card--large">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="avatar-placeholder avatar-large" src="/images/profile/profile-sakura.jpeg" alt={t('avatarAlt')} />
      </div>
      <p>{t('intro', { name: siteConfig.author.name })}</p>
      <h2>{t('whatTitle')}</h2>
      <p>{t('whatDesc')}</p>
      <h2>{t('contact')}</h2>
      <div className="contact-links">
        <a className="copy-email__button" href={siteConfig.author.github} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.01-.02-1.99-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.66.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" /></svg>
          <span>GitHub</span>
        </a>
        <CopyEmail email={siteConfig.author.email} />
      </div>
    </article>
  );
}
