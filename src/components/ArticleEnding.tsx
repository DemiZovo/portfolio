import { getTranslations } from 'next-intl/server';

interface Props {
  /** 用于稳定取一条收尾语，SSR 一致（传 slug 即可）。 */
  seed: string;
}

export default async function ArticleEnding({ seed }: Props) {
  const t = await getTranslations('ending');
  const endings = [t('e1'), t('e2'), t('e3'), t('e4')];
  const ending = endings[[...seed].reduce((sum, ch) => sum + ch.codePointAt(0)!, 0) % endings.length];
  return (
    <footer className="article-ending" aria-label={t('aria')}>
      <p className="article-ending__mark" aria-hidden="true">✦</p>
      <p className="article-ending__title">{t('title')}</p>
      <p className="article-ending__note">{ending}</p>
    </footer>
  );
}
