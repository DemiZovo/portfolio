'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

interface SearchItem {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  category: string;
  tags: string[];
  collection: 'blog' | 'life';
  published: string;
  url: string;
  searchableText: string;
}

interface Props { initialQuery: string; }

const normalize = (value: string) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ').trim();
const termsFor = (query: string) => normalize(query).split(' ').filter(Boolean);

function scoreItem(item: SearchItem, terms: string[]): number {
  const title = normalize(item.title);
  const tags = normalize(item.tags.join(' '));
  const category = normalize(item.category);
  const description = normalize(item.description);
  const body = normalize(item.searchableText);
  if (!terms.every((term) => [title, tags, category, description, body].some((value) => value.includes(term)))) return -1;
  return terms.reduce((score, term) => score
    + (title === term ? 100 : title.startsWith(term) ? 70 : title.includes(term) ? 50 : 0)
    + (tags.includes(term) ? 30 : 0) + (category.includes(term) ? 25 : 0)
    + (description.includes(term) ? 15 : 0) + (body.includes(term) ? 5 : 0), 0);
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return text;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'giu');
  return text.split(pattern).map((part, index) => (
    terms.some((term) => normalize(part) === term)
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>
  ));
}

export default function SearchBox({ initialQuery }: Props) {
  const t = useTranslations('search');
  const locale = useLocale();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = initialQuery.trim();
  const terms = useMemo(() => termsFor(query), [query]);

  const load = useCallback(async () => {
    setError(false);
    try {
      const response = await fetch('/search-index.json');
      if (!response.ok) throw new Error();
      setItems(await response.json());
      setReady(true);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const matched = useMemo(() => {
    if (!ready || !terms.length) return [];
    return items.map((item) => ({ item, score: scoreItem(item, terms) }))
      .filter((result) => result.score >= 0)
      .sort((a, b) => b.score - a.score || Date.parse(b.item.published) - Date.parse(a.item.published))
      .slice(0, 24);
  }, [items, ready, terms]);

  useEffect(() => { setActiveIndex(-1); }, [query, matched.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!matched.length || !['ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) return;
      const target = event.target as Element | null;
      if (!target?.closest('.browser-bar__search, #search-results')) return;
      if (event.key === 'Escape') {
        document.querySelector<HTMLInputElement>('.browser-bar__search input')?.focus();
        setActiveIndex(-1);
        return;
      }
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const next = activeIndex < 0
        ? (direction > 0 ? 0 : matched.length - 1)
        : (activeIndex + direction + matched.length) % matched.length;
      setActiveIndex(next);
      resultsRef.current?.querySelectorAll<HTMLAnchorElement>('.search-result__link')[next]?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, matched.length]);

  const status = error ? t('loadError')
    : !ready ? t('loading')
      : !terms.length ? t('hint')
        : matched.length ? t('found', { count: matched.length }) : t('noResult');

  return (
    <>
      <p id="search-status" className="muted" role="status" aria-live="polite">{status}</p>
      <div ref={resultsRef} id="search-results" className="search-results" aria-label={t('resultsAria')} aria-describedby={matched.length > 0 ? 'search-status search-keyboard-hint' : 'search-status'}>
        {error && <button className="secondary-button" type="button" onClick={() => void load()}>{t('retry')}</button>}
        {ready && terms.length > 0 && matched.length === 0 && (
          <div className="search-empty">
            <p>{t('emptySuggestions')}</p>
            <ul>
              <li>{t('emptyShorter')}</li>
              <li>{t('emptySpelling')}</li>
              <li>{t('emptyTopics')}</li>
            </ul>
          </div>
        )}
        {matched.map(({ item }, index) => {
          const displayTitle = locale === 'en' && item.titleEn ? item.titleEn : item.title;
          const displayDesc = locale === 'en' && item.descriptionEn ? item.descriptionEn : item.description;
          return (
            <article className="search-result" key={`${item.collection}:${item.url}`}>
              <p className="meta">{item.collection === 'blog' ? t('techArticle') : t('lifeLog')} · {new Date(item.published).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}</p>
              <h2>
                <a className={`card-link search-result__link${activeIndex === index ? ' is-active' : ''}`} href={`/${locale}${item.url}`} onFocus={() => setActiveIndex(index)}>
                  <Highlight text={displayTitle} terms={terms} />
                </a>
              </h2>
              <p><Highlight text={displayDesc} terms={terms} /></p>
            </article>
          );
        })}
      </div>
      {matched.length > 0 && <p id="search-keyboard-hint" className="search-keyboard-hint muted">{t('keyboardHint')}</p>}
    </>
  );
}
