'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { siteConfig } from '@/config/site';
import { usePathname, useRouter, Link } from '@/i18n/navigation';
import LanguageSwitch from './LanguageSwitch';
import MusicPlayer from './MusicPlayer';

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [darkTheme, setDarkTheme] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const menuTriggerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const syncQuery = () => setSearchValue(new URL(window.location.href).searchParams.get('q') ?? '');
    syncQuery();
    window.addEventListener('popstate', syncQuery);
    return () => window.removeEventListener('popstate', syncQuery);
  }, [pathname]);

  useEffect(() => {
    setDarkTheme(document.documentElement.dataset.theme === 'dark');
  }, []);

  useEffect(() => {
    const menu = menuRef.current;
    if (menu) menu.open = false;
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (menuRef.current) menuRef.current.open = false;
      setMenuOpen(false);
      menuTriggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      menuRef.current!.open = false;
      setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const current = (href: string) => {
    const normalized = (p: string) => (p === '/' ? p : p.replace(/\/+$/, ''));
    const target = normalized(href);
    return target === '/' ? normalized(pathname) === '/' : normalized(pathname).startsWith(target);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = searchValue.trim();
    if (!value) return;
    router.push(`/search?q=${encodeURIComponent(value)}` as never);
  };

  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    document.querySelector('meta[data-theme-color]')?.setAttribute('content', next === 'dark' ? '#211a1d' : '#f8f2ef');
    try { localStorage.setItem('theme', next); } catch {}
    setDarkTheme(next === 'dark');
  };

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
    setMenuOpen(false);
  };

  return (
    <>
      <svg className="icon-sprite" aria-hidden="true">
        <symbol id="nav-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></symbol>
        <symbol id="nav-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></symbol>
        <symbol id="nav-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></symbol>
        <symbol id="nav-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></symbol>
        <symbol id="nav-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></symbol>
        <symbol id="nav-pause" viewBox="0 0 24 24"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></symbol>
        <symbol id="nav-next" viewBox="0 0 24 24"><path d="M6 5.5v13l9-6.5z" /><rect x="17" y="5" width="2.5" height="14" rx="1" /></symbol>
        <symbol id="nav-prev" viewBox="0 0 24 24"><path d="M18 5.5v13l-9-6.5z" /><rect x="4.5" y="5" width="2.5" height="14" rx="1" /></symbol>
      </svg>
      <div className="browser-bar-glow">
        <div className="browser-bar-glow__content">
        <header className="browser-bar">
          <Link className="browser-bar__brand" href="/" aria-label={siteConfig.name}>
            {siteConfig.name}
          </Link>

          <form className="browser-bar__search" role="search" onSubmit={submitSearch}>
            <svg aria-hidden="true"><use href="#nav-search" /></svg>
            <input
              ref={inputRef}
              type="search"
              placeholder={t('common.searchPlaceholder')}
              aria-label={t('header.searchAria')}
              autoComplete="off"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            {searchValue && (
              <button type="button" className="browser-bar__clear" aria-label={t('header.searchClose')} onClick={() => { setSearchValue(''); inputRef.current?.focus(); }}>
                ×
              </button>
            )}
          </form>

          <div className="browser-bar__actions">
            <LanguageSwitch />
            <button className="tool-button theme-button" type="button" data-theme-toggle aria-label={darkTheme ? t('common.themeLight') : t('common.themeDark')} aria-pressed={darkTheme} onClick={toggleTheme}>
              <svg className="moon-icon" aria-hidden="true"><use href="#nav-moon" /></svg>
              <svg className="sun-icon" aria-hidden="true"><use href="#nav-sun" /></svg>
            </button>
            <MusicPlayer />
            <details className="mobile-menu" ref={menuRef} onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
              <summary ref={menuTriggerRef} className="tool-button mobile-menu__trigger" aria-label={t('nav.main')} aria-expanded={menuOpen}>
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 8h14M5 12h14M5 16h14" /></svg>
              </summary>
              <nav className="mobile-menu__panel" aria-label={t('nav.main')}>
                <Link href="/" onClick={closeMenu} aria-current={current('/') ? 'page' : undefined}>{t('nav.home')}</Link>
                <Link href="/blog/" onClick={closeMenu} aria-current={current('/blog/') ? 'page' : undefined}>{t('nav.blog')}</Link>
                <Link href="/collection/" onClick={closeMenu} aria-current={current('/collection/') ? 'page' : undefined}>{t('nav.collection')}</Link>
                <Link href="/life/" onClick={closeMenu} aria-current={current('/life/') ? 'page' : undefined}>{t('nav.life')}</Link>
                <Link href="/archives/" onClick={closeMenu} aria-current={current('/archives/') ? 'page' : undefined}>{t('nav.archives')}</Link>
                <Link href="/about/" onClick={closeMenu} aria-current={current('/about/') ? 'page' : undefined}>{t('nav.about')}</Link>
                <Link href="/guestbook/" onClick={closeMenu} aria-current={current('/guestbook/') ? 'page' : undefined}>{t('nav.guestbook')}</Link>
              </nav>
            </details>
          </div>
        </header>
        </div>
      </div>

      <nav className="mobile-nav" aria-label={t('nav.main')}>
        <Link href="/" aria-current={current('/') ? 'page' : undefined}>{t('nav.home')}</Link>
        <Link href="/blog/" aria-current={current('/blog/') ? 'page' : undefined}>{t('nav.blog')}</Link>
        <Link href="/collection/" aria-current={current('/collection/') ? 'page' : undefined}>{t('nav.collection')}</Link>
        <Link href="/life/" aria-current={current('/life/') ? 'page' : undefined}>{t('nav.life')}</Link>
        <Link href="/archives/" aria-current={current('/archives/') ? 'page' : undefined}>{t('nav.archives')}</Link>
        <Link href="/about/" aria-current={current('/about/') ? 'page' : undefined}>{t('nav.about')}</Link>
        <Link href="/guestbook/" aria-current={current('/guestbook/') ? 'page' : undefined}>{t('nav.guestbook')}</Link>
      </nav>
    </>
  );
}
