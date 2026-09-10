'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface Props {
  entryKey: string;
  headings?: Heading[];
  showToc?: boolean;
}

const STORAGE = {
  likes: 'demiz:article-likes',
  reads: 'demiz:article-reads',
} as const;

function readSet(key: string): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set<string>(Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeSet(key: string, value: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...value])); } catch {}
}

export default function ArticleReaderTools({ entryKey, headings = [], showToc = true }: Props) {
  const t = useTranslations('reader');
  const rootRef = useRef<HTMLElement>(null);
  const tocHeadings = showToc ? headings.filter(({ depth }) => depth >= 2 && depth <= 4) : [];
  // 仅日常手账（life）自动已读；博客（blog）只支持手动标记。
  const autoMarkRead = entryKey.startsWith('life:');

  useEffect(() => {
    const tools = rootRef.current;
    if (!tools) return;
    const article = document.querySelector<HTMLElement>('[data-article-content]');
    const likeButton = tools.querySelector<HTMLButtonElement>('[data-like-button]');
    const likeLabel = tools.querySelector<HTMLElement>('[data-like-label]');
    const readButton = tools.querySelector<HTMLButtonElement>('[data-read-button]');
    const readLabel = tools.querySelector<HTMLElement>('[data-read-label]');
    const topButton = tools.querySelector<HTMLButtonElement>('[data-back-to-top]');
    const progress = tools.querySelector<HTMLElement>('[data-reader-progress]');
    const status = tools.querySelector<HTMLElement>('[data-reader-status]');
    const topBar = document.querySelector<HTMLElement>('[data-article-progress-bar]');
    const topProgress = document.querySelector<HTMLElement>('[data-article-progress]');
    if (!article || !likeButton || !likeLabel || !readButton || !readLabel || !topButton || !progress || !status) return;

    const likes = readSet(STORAGE.likes);
    const reads = readSet(STORAGE.reads);

    const updateLike = () => {
      const liked = likes.has(entryKey);
      likeButton.classList.toggle('is-active', liked);
      likeButton.setAttribute('aria-pressed', String(liked));
      likeLabel.textContent = liked ? t('liked') : t('like');
    };

    const updateRead = () => {
      const read = reads.has(entryKey);
      readButton.classList.toggle('is-active', read);
      readButton.setAttribute('aria-pressed', String(read));
      readLabel.textContent = read ? t('read') : t('markRead');
    };

    const setRead = (read: boolean, announce = true) => {
      read ? reads.add(entryKey) : reads.delete(entryKey);
      writeSet(STORAGE.reads, reads);
      updateRead();
      if (announce) status.textContent = read ? t('readAnnounce') : t('unreadAnnounce');
    };

    const onLikeClick = () => {
      const liked = !likes.has(entryKey);
      liked ? likes.add(entryKey) : likes.delete(entryKey);
      writeSet(STORAGE.likes, likes);
      updateLike();
      status.textContent = liked ? t('thanks') : t('unliked');
    };

    const onReadClick = () => setRead(!reads.has(entryKey));
    const onTopClick = () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

    likeButton.addEventListener('click', onLikeClick);
    readButton.addEventListener('click', onReadClick);
    topButton.addEventListener('click', onTopClick);

    const tocLinks = [...tools.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
    const sections = tocLinks.map((link) => document.getElementById(link.dataset.tocLink ?? '')).filter((section): section is HTMLElement => Boolean(section));
    let automaticallyMarked = reads.has(entryKey);

    const onScroll = () => {
      const articleTop = article.offsetTop;
      const available = Math.max(article.scrollHeight - window.innerHeight, 1);
      const ratio = Math.min(Math.max((window.scrollY - articleTop + 120) / available, 0), 1);
      progress.style.width = `${ratio * 100}%`;
      topButton.classList.toggle('is-visible', window.scrollY > 420);

      if (topBar && topProgress) {
        topBar.style.width = `${ratio * 100}%`;
        topProgress.classList.toggle('is-visible', ratio > 0.005 && window.scrollY > 32);
      }

      if (autoMarkRead && !automaticallyMarked && ratio >= 0.7) {
        automaticallyMarked = true;
        setRead(true, false);
      }

      let activeId = '';
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= 150) activeId = section.id;
      }
      for (const link of tocLinks) {
        const active = link.dataset.tocLink === activeId;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    };

    updateLike();
    updateRead();
    onScroll();
    document.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      likeButton.removeEventListener('click', onLikeClick);
      readButton.removeEventListener('click', onReadClick);
      topButton.removeEventListener('click', onTopClick);
      document.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryKey]);

  return (
    <>
      <div className="article-progress" aria-hidden="true" data-article-progress><span data-article-progress-bar /></div>
      <aside className="reader-tools" data-reader-tools data-entry-key={entryKey} aria-label={t('toolsAria')} ref={rootRef}>
        <div className="reader-progress" aria-hidden="true"><span data-reader-progress /></div>

        {tocHeadings.length > 0 && (
          <>
            <nav className="reader-toc" aria-label={t('tocAria')}>
              <p className="reader-tools__title">{t('toc')}</p>
              <ol>
                {tocHeadings.map((heading) => (
                  <li key={heading.slug} style={{ ['--toc-depth' as string]: heading.depth - 2 }}>
                    <a href={`#${heading.slug}`} data-toc-link={heading.slug}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
            <details className="reader-toc-mobile">
              <summary>{t('toc')}<span aria-hidden="true">⌄</span></summary>
              <nav aria-label={t('tocAria')}>
                <ol>
                  {tocHeadings.map((heading) => (
                    <li key={heading.slug} style={{ ['--toc-depth' as string]: heading.depth - 2 }}>
                      <a href={`#${heading.slug}`} data-toc-link={heading.slug}>{heading.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>
          </>
        )}

        <div className="reader-actions" aria-label={t('actionsAria')}>
          <button type="button" data-like-button aria-pressed="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4 10.55 19.1C5.4 14.5 2 11.45 2 7.7 2 4.65 4.4 2.25 7.45 2.25c1.72 0 3.38.8 4.55 2.05a6.2 6.2 0 0 1 4.55-2.05C19.6 2.25 22 4.65 22 7.7c0 3.75-3.4 6.8-8.55 11.42L12 20.4Z" /></svg>
            <span data-like-label>{t('like')}</span>
          </button>
          <button type="button" data-read-button aria-pressed="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            <span data-read-label>{t('markRead')}</span>
          </button>
          <button type="button" data-back-to-top aria-label={t('topAria')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 11 6-6 6 6M12 5v14" /></svg>
            <span>{t('top')}</span>
          </button>
        </div>
        <p className="reader-status" role="status" aria-live="polite" data-reader-status />
      </aside>
    </>
  );
}
