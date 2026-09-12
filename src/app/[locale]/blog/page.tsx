import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ArticleRow from '@/components/ArticleRow';
import CategoryCard from '@/components/CategoryCard';
import { getBlogCategories } from '@/lib/categories';
import { getPublicBlog } from '@/lib/content';
import { Link } from '@/i18n/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return {
    title: `${t('title')} | DemiZ`,
    description: t('description'),
  };
}

export default async function BlogIndexPage() {
  const t = await getTranslations('blog');
  const categories = (await getBlogCategories());
  const latest = (await getPublicBlog()).slice(0, 8);

  return (
    <>
      <section className="blog-categories" aria-labelledby="explore">
        <h2 id="explore" className="section-title">{t('explore')}</h2>
        <div className="category-grid">
          {categories.map((category) => <CategoryCard key={category.slug} {...category} />)}
        </div>
      </section>

      <section className="blog-latest" aria-labelledby="latest">
        <div className="blog-latest__head">
          <h2 id="latest" className="section-title">{t('recent')}</h2>
          <Link className="blog-latest__more" href="/archives/">{t('viewArchive')} →</Link>
        </div>
        <div className="article-list">
          {latest.map((entry) => <ArticleRow key={entry.slug} entry={entry} showCategory />)}
        </div>
      </section>
    </>
  );
}
