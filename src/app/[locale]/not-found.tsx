import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export const metadata: Metadata = {
  description: '请求的页面不存在',
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <section className="hero lost-card">
      <div className="lost-card-symbol" aria-hidden="true">?</div>
      <div>
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p>{t('message')}</p>
        <Link className="secondary-button" href="/">{t('back')}</Link>
      </div>
    </section>
  );
}
