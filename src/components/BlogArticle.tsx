import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { BlogEntry } from '@/lib/content';
import { categoryLabel } from '@/lib/categories';
import { entryDescription, entryTitle } from '@/lib/localize';
import { readingMinutes } from '@/lib/reading';
import { renderMarkdown } from '@/lib/markdown';
import { Link } from '@/i18n/navigation';
import ArticleNavigation from './ArticleNavigation';
import ArticleReaderTools from './ArticleReaderTools';
import ArticleHeader from './ArticleHeader';
import ArticleEnding from './ArticleEnding';
import JsonLd from './JsonLd';
import { ArticleEditLink } from './OwnerTools';

interface Props {
  entry: BlogEntry;
  previous: BlogEntry | null;
  next: BlogEntry | null;
}

export async function articleMetadata(entry: BlogEntry): Promise<Metadata> {
  const locale = await getLocale();
  const title = entryTitle(entry, locale);
  const description = entryDescription(entry, locale);
  const url = `/${locale}/blog/${entry.data.slug}`;
  const image = entry.data.cover ?? '/images/brand/default-og.png';
  return {
    title: `${title} | DemiZ`,
    description,
    alternates: {
      canonical: url,
      languages: {
        zh: `/zh/blog/${entry.data.slug}`,
        en: `/en/blog/${entry.data.slug}`,
        'x-default': `/zh/blog/${entry.data.slug}`,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      publishedTime: entry.data.published.toISOString(),
      modifiedTime: entry.data.updated?.toISOString(),
      tags: entry.data.tags,
      images: [{ url: image, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

const statusLabels: Record<string, string> = {
  seed: 'Seed · 刚种下',
  growing: 'Growing · 成长中',
  evergreen: 'Evergreen · 常青',
};

export default async function BlogArticle({ entry, previous, next }: Props) {
  const t = await getTranslations('blog');
  const locale = await getLocale();
  const { html, headings } = await renderMarkdown(entry.body);
  const minutes = readingMinutes(entry.body);
  const statusLabel = statusLabels[entry.data.status] ?? statusLabels.growing;
  const title = entryTitle(entry, locale);
  const description = entryDescription(entry, locale);

  return (
    <>
      <div className="article-layout">
        <article className="article" data-article-content>
          <p className="article-back"><Link href="/blog/">← {t('title')}</Link></p>
          <ArticleHeader
            title={title}
            description={description}
            publishedAt={entry.data.published}
            minutes={minutes}
            updatedAt={entry.data.updated}
            category={{ label: categoryLabel(entry.data.category), href: `/blog/${entry.data.category}/` }}
            status={statusLabel}
            tags={entry.data.tags}
          />
          <ArticleEditLink kind="blog" slug={entry.data.slug} />
          <div className="article-content" dangerouslySetInnerHTML={{ __html: html }} />
          <ArticleEnding seed={entry.data.slug} />
          <ArticleNavigation
            previous={previous ? { title: entryTitle(previous, locale), path: `/blog/${previous.data.slug}` } : undefined}
            next={next ? { title: entryTitle(next, locale), path: `/blog/${next.data.slug}` } : undefined}
            indexPath="/blog"
            indexLabel={t('backToNotes')}
          />
        </article>
        <ArticleReaderTools entryKey={`blog:${entry.data.slug}`} headings={headings} showToc={entry.data.toc} />
      </div>
      <JsonLd
        type="article"
        title={title}
        description={description}
        image={entry.data.cover}
        url={`/${locale}/blog/${entry.data.slug}`}
        publishedTime={entry.data.published.toISOString()}
        updatedTime={entry.data.updated?.toISOString()}
        tags={entry.data.tags}
      />
    </>
  );
}
