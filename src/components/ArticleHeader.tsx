import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface Props {
  title: string;
  description: string;
  publishedAt: Date;
  minutes: number;
  updatedAt?: Date | undefined;
  /** 分类指示（blog 有，life 无）。href 已含 base。 */
  category?: { label: string; href: string } | undefined;
  /** note 状态（仅 blog）。 */
  status?: string | undefined;
  tags?: string[];
}

export default async function ArticleHeader({ title, description, publishedAt, minutes, updatedAt, category, status, tags = [] }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('article');
  const date = publishedAt.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const updated = updatedAt
    ? updatedAt.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <header className="article-header">
      {category && <p className="article-header__category"><Link href={category.href as never}>{category.label}</Link></p>}
      <h1>{title}</h1>
      <p className="article-header__desc">{description}</p>
      <p className="article-header__meta">
        <time dateTime={publishedAt.toISOString()}>{date}</time>
        <span aria-hidden="true">·</span>
        <span>{minutes} {t('min')}</span>
        {updated && (<><span aria-hidden="true">·</span><span>{t('updated')} {updated}</span></>)}
      </p>
      {status && <p className="article-header__status">{status}</p>}
      {tags.length > 0 && (
        <ul className="article-header__tags">
          {tags.map((tag) => <li key={tag}><Link href={`/tags/${encodeURIComponent(tag)}/` as never}>#{tag}</Link></li>)}
        </ul>
      )}
    </header>
  );
}
