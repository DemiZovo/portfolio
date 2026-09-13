import { getLocale, getTranslations } from 'next-intl/server';
import type { BlogEntry } from '@/lib/content';
import { entryPath } from '@/lib/content';
import { entryDescription, entryTitle } from '@/lib/localize';
import { categoryLabel } from '@/lib/categories';
import { Link } from '@/i18n/navigation';

interface Props {
  entry: BlogEntry;
  showCategory?: boolean;
}

export default async function ArticleRow({ entry, showCategory = false }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('blog');
  const { published, category, tags, featured } = entry.data;
  const date = published.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');
  const title = entryTitle(entry, locale);
  const description = entryDescription(entry, locale);

  return (
    <article className="article-row">
      <time className="article-row__date" dateTime={published.toISOString()}>{date}</time>
      <div className="article-row__body">
        <h2 className="article-row__title">
          {featured && <span className="article-row__featured" aria-hidden="true">{t('featuredBadge')}</span>}
          <Link href={entryPath(entry) as never}>{title}</Link>
        </h2>
        {description && <p className="article-row__desc">{description}</p>}
        <p className="article-row__meta">
          {showCategory && category && <Link className="article-row__category" href={`/blog/${category}/` as never}>{categoryLabel(category)}</Link>}
          {tags.length > 0 && (
            <span className="article-row__tags">{tags.slice(0, 3).map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}/` as never}>{tag}</Link>)}</span>
          )}
        </p>
      </div>
      <span className="article-row__arrow" aria-hidden="true">↗</span>
    </article>
  );
}
