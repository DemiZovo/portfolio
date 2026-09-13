'use client';

import { useMemo, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import OptionWheel, { type OptionWheelItem } from './OptionWheel';
import { usePathname, useRouter } from '@/i18n/navigation';

const navHrefs = ['/', '/blog/', '/workshop/', '/life/', '/archives/', '/about/', '/guestbook/'] as const;

function currentIndex(pathname: string): number {
  const normalized = (p: string) => (p === '/' ? p : p.replace(/\/+$/, ''));
  const currentPath = normalized(pathname);
  const index = navHrefs.findIndex((href) => {
    const h = normalized(href);
    return h === '/' ? currentPath === h : currentPath.startsWith(h);
  });
  return index >= 0 ? index : 0;
}

export default function NavWheel() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const selected = useMemo(() => currentIndex(pathname), [pathname]);

  const items: OptionWheelItem[] = useMemo(
    () => [
      { label: t('home'), href: '/', ariaLabel: t('home') },
      { label: t('blog'), href: '/blog/', ariaLabel: t('blog') },
      { label: t('workshop'), href: '/workshop/', ariaLabel: t('workshop') },
      { label: t('life'), href: '/life/', ariaLabel: t('life') },
      { label: t('archives'), href: '/archives/', ariaLabel: t('archives') },
      { label: t('about'), href: '/about/', ariaLabel: t('about') },
      { label: t('guestbook'), href: '/guestbook/', ariaLabel: t('guestbook') },
    ],
    [t],
  );

  if (pathname.startsWith('/write')) return null;
  return (
    <div className="ow-nav" aria-hidden="false">
      {pending && <span role="status" className="navigation-pending">{locale === 'zh' ? '正在打开…' : 'Opening…'}</span>}
      <OptionWheel
        items={items}
        ariaLabel={t('main')}
        selected={selected}
        onSelect={(_index, item) => {
          if (item.href) startTransition(() => router.push(item.href as never));
        }}
        onIntent={(item) => { if (item.href) router.prefetch(item.href as never); }}
        onIndexChange={(_index, item) => { if (item.href) router.prefetch(item.href as never); }}
        side="left"
        textColor="var(--muted)"
        activeColor="var(--accent)"
        fontSize={1.15}
        spacing={3}
        curve={0.55}
        tilt={7}
        blur={2}
        fade={0.24}
        minOpacity={0.16}
        smoothing={240}
        inset={20}
      />
    </div>
  );
}
