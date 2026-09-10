'use client';

import { useEffect } from 'react';

export default function MagicScrollEffects() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = [
      ...document.querySelectorAll('.site-main > section, .site-footer'),
    ];

    if (reduceMotion) return;
    document.documentElement.classList.add('magic-motion-ready');
    targets.forEach((target, index) => {
      if (!(target instanceof HTMLElement)) return;
      target.classList.add('magic-reveal');
      target.style.setProperty('--reveal-order', String(Math.min(index, 5)));
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return null;
}
