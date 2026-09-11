import localFont from 'next/font/local';
import { getLocale, getTranslations } from 'next-intl/server';
import HomeLikeButton from '@/components/HomeLikeButton';
import HomeStats from '@/components/HomeStats';
import MagicCompanion from '@/components/MagicCompanion';
import MagicSymbolLoop from '@/components/MagicSymbolLoop';
import { entryPath, getPublicContent } from '@/lib/content';
import { entryDescription, entryTitle } from '@/lib/localize';
import { siteConfig } from '@/config/site';
import { Link } from '@/i18n/navigation';

const introFont = localFont({
  src: '../../assets/fonts/chill-round.woff2',
  variable: '--font-intro',
  weight: '400',
  display: 'swap',
});

export default async function HomePage() {
  const t = await getTranslations('home');
  const locale = await getLocale();
  const allEntries = getPublicContent();
  const featuredEntries = allEntries.filter((entry) => entry.data.featured);
  const entries = allEntries.slice(0, 6);
  const dateFormat = (d: Date) => d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');

  return (
    <>
      <section className="hero home-magic-hero">
        <div className="hero-magic-copy">
          <MagicSymbolLoop />
          <HomeStats />
          <p className={`hero-intro ${introFont.variable}`}>
            {t.rich('intro', { name: siteConfig.name, highlight: (chunks) => <strong>{chunks}</strong> })}
          </p>
          <div className="hero-links">
            <p>
              <a className="copy-email__button" href={siteConfig.author.github} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.01-.02-1.99-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.66.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" /></svg>
                <span>GitHub</span>
              </a>
              <a className="copy-email__button" href={siteConfig.author.leetcode} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'currentColor', stroke: 'none' }}><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" /></svg>
                <span>LeetCode</span>
              </a>
            </p>
          </div>
        </div>
        <MagicCompanion />
      </section>
      <HomeLikeButton />
      {featuredEntries.length > 0 && (
        <section className="home-updates" aria-labelledby="featured">
          <p className="eyebrow">{t('featured')}</p>
          <h2 id="featured">{t('featuredTitle')}</h2>
          <div className="grid">{featuredEntries.map((entry) => (
            <article className="card" key={`${entry.collection}:${entry.slug}`}>
              <p className="meta">{t('featuredLabel')}{dateFormat(entry.data.published)}</p>
              <h3><Link className="card-link" href={entryPath(entry) as never}>{entryTitle(entry, locale)}</Link></h3>
              <p>{entryDescription(entry, locale)}</p>
              <ul className="tags">{entry.data.tags.map((tag) => <li key={tag}><Link className="tag" href={`/tags/${encodeURIComponent(tag)}/` as never}>{tag}</Link></li>)}</ul>
            </article>
          ))}</div>
        </section>
      )}
      <section className="home-updates" aria-labelledby="recent">
        <h2 id="recent">{t('recentTitle')}</h2>
        <div className="grid">{entries.map((entry) => (
          <article className="card" key={`${entry.collection}:${entry.slug}`}>
            <p className="meta">{dateFormat(entry.data.published)}</p>
            <h3><Link className="card-link" href={entryPath(entry) as never}>{entryTitle(entry, locale)}</Link></h3>
            <p>{entryDescription(entry, locale)}</p>
            <ul className="tags">{entry.data.tags.map((tag) => <li key={tag}><Link className="tag" href={`/tags/${encodeURIComponent(tag)}/` as never}>{tag}</Link></li>)}</ul>
          </article>
        ))}</div>
      </section>
    </>
  );
}
