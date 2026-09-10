'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { sitePath } from '@/lib/urls';

const outfits = [
  { id: 'clow', src: sitePath('/images/character/magic-companion-pink.webp') },
  { id: 'star', src: sitePath('/images/character/magic-companion-night.webp') },
  { id: 'school', src: sitePath('/images/character/magic-companion-school.webp') },
  { id: 'casual', src: sitePath('/images/character/magic-companion-casual.webp') },
  { id: 'formal', src: sitePath('/images/character/magic-companion-pink.webp') },
];

export default function MagicCompanion() {
  const t = useTranslations('companion');
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('magic-companion-outfit');
      const index = outfits.findIndex((item) => item.id === saved);
      if (index >= 0) setCurrent(index);
    } catch {}
  }, []);

  const cycle = () => {
    const next = (current + 1) % outfits.length;
    setCurrent(next);
    try { localStorage.setItem('magic-companion-outfit', outfits[next].id); } catch {}
  };

  const outfit = outfits[current] ?? outfits[0];
  return (
    <aside className="magic-companion" data-magic-companion aria-label={t('aria')}>
      <button className="companion-character" type="button" data-companion-cycle onClick={cycle} aria-label={t('cycle')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={outfit.src} alt={t('alt')} loading="lazy" decoding="async" data-companion-image />
      </button>
      <span className="companion-hint">{t('hint')}</span>
    </aside>
  );
}
