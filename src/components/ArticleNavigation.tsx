import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface NavigationItem {
  title: string;
  path: string;
}

interface Props {
  previous?: NavigationItem | undefined;
  next?: NavigationItem | undefined;
  indexPath: string;
  indexLabel: string;
}

export default async function ArticleNavigation({ previous, next, indexPath, indexLabel }: Props) {
  const t = await getTranslations('article');
  return (
    <nav className="article-navigation" aria-label={t('navAria')}>
      <div className="article-navigation__item article-navigation__item--previous">
        {previous && <Link href={previous.path as never} rel="prev"><span className="article-navigation__label">{t('prevLabel')}</span><span className="article-navigation__title">{previous.title}</span></Link>}
      </div>
      <Link className="article-navigation__index" href={indexPath as never}>{indexLabel}</Link>
      <div className="article-navigation__item article-navigation__item--next">
        {next && <Link href={next.path as never} rel="next"><span className="article-navigation__label">{t('nextLabel')}</span><span className="article-navigation__title">{next.title}</span></Link>}
      </div>
    </nav>
  );
}
