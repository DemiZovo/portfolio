import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/config/site';
import { Link } from '@/i18n/navigation';

export default async function Footer() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');

  const exploreLinks = [
    { href: '/tags/', label: t('tags'), localized: true },
    { href: '/rss.xml', label: t('rss'), localized: false },
    { href: '/privacy/', label: t('privacy'), localized: true },
  ];

  return (
    <footer className="site-footer">
      <nav aria-label={tNav('footer')}>
        {exploreLinks.map(({ href, label, localized }) => localized
          ? <Link key={label} href={href as never}>{label}</Link>
          : <a key={label} href={href}>{label}</a>)}
      </nav>
      <p>{t('copyright', { year: new Date().getFullYear(), name: siteConfig.author.name })}</p>
      <p className="site-footer__note">{tCommon('tagline')}</p>
    </footer>
  );
}
