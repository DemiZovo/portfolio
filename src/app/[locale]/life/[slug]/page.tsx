import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getLifeBySlug, getPublicLife } from '@/lib/content';
import { entryDescription, entryTitle } from '@/lib/localize';
import { readingMinutes } from '@/lib/reading';
import { renderMarkdown } from '@/lib/markdown';
import { Link } from '@/i18n/navigation';
import ArticleNavigation from '@/components/ArticleNavigation';
import ArticleReaderTools from '@/components/ArticleReaderTools';
import ArticleHeader from '@/components/ArticleHeader';
import ArticleEnding from '@/components/ArticleEnding';
import JsonLd from '@/components/JsonLd';
import { ArticleEditLink } from '@/components/OwnerTools';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const entries = await getPublicLife();
  return routing.locales.flatMap((locale) => entries.map((entry) => ({ locale, slug: entry.data.slug })));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = (await getLifeBySlug(slug));
  if (!entry) return { title: '日常手账' };
  const title = entryTitle(entry, locale);
  const description = entryDescription(entry, locale);
  const url = `/${locale}/life/${entry.data.slug}`;
  const image = entry.data.cover ?? '/images/brand/default-og.png';
  return {
    title: `${title} | 日常手账`,
    description,
    alternates: {
      canonical: url,
      languages: {
        zh: `/zh/life/${entry.data.slug}`,
        en: `/en/life/${entry.data.slug}`,
        'x-default': `/zh/life/${entry.data.slug}`,
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

export default async function LifeSlugPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const entries = (await getPublicLife());
  const index = entries.findIndex((entry) => entry.data.slug === slug);
  if (index === -1) notFound();
  const entry = entries[index]!;
  const { html, headings } = await renderMarkdown(entry.body);
  const minutes = readingMinutes(entry.body);
  const t = await getTranslations('life');
  const title = entryTitle(entry, locale);
  const description = entryDescription(entry, locale);

  return (
    <>
      <div className="article-layout">
        <article className="article" data-article-content>
          <p className="article-back"><Link href="/life/">← {t('title')}</Link></p>
          <ArticleHeader
            title={title}
            description={description}
            publishedAt={entry.data.published}
            minutes={minutes}
            updatedAt={entry.data.updated}
            tags={entry.data.tags}
          />
          <ArticleEditLink kind="life" slug={entry.data.slug} />
          <div className="article-content" dangerouslySetInnerHTML={{ __html: html }} />
          <ArticleEnding seed={entry.data.slug} />
          <ArticleNavigation
            previous={entries[index - 1] ? { title: entryTitle(entries[index - 1]!, locale), path: `/life/${entries[index - 1]!.data.slug}` } : undefined}
            next={entries[index + 1] ? { title: entryTitle(entries[index + 1]!, locale), path: `/life/${entries[index + 1]!.data.slug}` } : undefined}
            indexPath="/life"
            indexLabel={t('backToJournal')}
          />
        </article>
        <ArticleReaderTools entryKey={`life:${entry.data.slug}`} headings={headings} />
      </div>
      <JsonLd
        type="article"
        title={title}
        description={description}
        image={entry.data.cover}
        url={`/${locale}/life/${entry.data.slug}`}
        publishedTime={entry.data.published.toISOString()}
        updatedTime={entry.data.updated?.toISOString()}
        tags={entry.data.tags}
      />
    </>
  );
}
