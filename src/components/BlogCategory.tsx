import { getTranslations } from 'next-intl/server';
import type { CategoryWithCount } from '@/lib/categories';
import { getBlogByCategory } from '@/lib/categories';
import { Link } from '@/i18n/navigation';
import ArticleRow from './ArticleRow';

interface Props {
  category: CategoryWithCount;
}

export default async function BlogCategory({ category }: Props) {
  const t = await getTranslations('blog');
  const entries = (await getBlogByCategory(category.slug));
  const tagCounts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.data.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTags = [...tagCounts].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag]) => tag);

  return (
    <>
      <section className="cat-head">
        <p><Link href="/blog/">← {t('title')}</Link></p>
        <p className="eyebrow">✦ {category.card}</p>
        <h1 className="cat-head__title">{category.name}</h1>
        <p className="cat-head__zh">{category.zh}</p>
        <p className="cat-head__desc">{category.description}</p>
        <p className="cat-head__count">{entries.length} note{entries.length === 1 ? '' : 's'}</p>
        {topTags.length > 0 && (
          <ul className="cat-head__tags">
            {topTags.map((tag) => <li key={tag}><Link href={`/tags/${encodeURIComponent(tag)}/` as never}>#{tag}</Link></li>)}
          </ul>
        )}
      </section>

      {entries.length > 0 ? (
        <section className="article-list" aria-label={`${category.name} 的文章列表`}>
          {entries.map((entry) => <ArticleRow key={entry.slug} entry={entry} />)}
        </section>
      ) : (
        <p className="empty">这里还没有留下记录。<br />魔法正在学习中。</p>
      )}
    </>
  );
}
