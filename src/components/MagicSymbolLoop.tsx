'use client';

import { useTranslations } from 'next-intl';
import LogoLoop, { type LogoItem } from './LogoLoop';

const SYMBOLS: LogoItem[] = [
  {
    node: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3c.9 2.4 3 4.5 5.4 5.4.9 2.4-1.2 5.1-3.9 5.1-2.4 0-4.5-1.8-4.5-4.2C9 6.9 10.2 4.8 12 3z"/></svg>',
    title: 'sakura',
  },
  {
    node: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>',
    title: 'sparkle',
  },
  {
    node: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>',
    title: 'star',
  },
  {
    node: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v18M3 12h18"/></svg>',
    title: 'cross',
  },
  {
    node: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 2l10 10-10 10L2 12z"/></svg>',
    title: 'diamond',
  },
];

export default function MagicSymbolLoop() {
  const t = useTranslations('home');
  return (
    <LogoLoop
      logos={SYMBOLS}
      speed={60}
      direction="left"
      logoHeight={22}
      gap={28}
      ariaLabel={t('symbolLoopAria')}
      className="magic-symbol-loop"
    />
  );
}
