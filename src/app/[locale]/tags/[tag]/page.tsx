import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { entryPath, getPublicContent } from '@/lib/content';
import { sitePath } from '@/lib/urls';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string; tag: string }>;
}

export async function generateStaticParams() {
  const entries = getPublicContent();
  const tags = [...new Set(entries.flatMap((entry) => entry.data.tags))];
  return routing.locales.flatMap((locale) => tags.map((tag) => ({ locale, tag })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `标签：${tag}` };
}

export default async function TagPage({ params }: Props) {
  const { locale, tag } = await params;
  setRequestLocale(locale);
  const decoded = decodeURIComponent(tag);
  const entries = getPublicContent().filter((entry) => entry.data.tags.includes(decoded));
  if (entries.length === 0) notFound();

  return (
    <>
      <section className="hero"><p className="eyebrow">Tag</p><h1>标签：{decoded}</h1></section>
      <ul className="list-clean">
        {entries.map((entry) => (
          <li key={`${entry.collection}:${entry.slug}`}>
            <a href={sitePath(entryPath(entry))}>{entry.data.title}</a> <span className="meta">{entry.data.published.toLocaleDateString('zh-CN')}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
