'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

const readStorage = (storage: Storage, key: string) => {
  try { return storage.getItem(key); } catch { return null; }
};
const writeStorage = (storage: Storage, key: string, value: string) => {
  try { storage.setItem(key, value); } catch {}
};

export default function MagicEffects() {
  const t = useTranslations('magic');
  const pathname = usePathname();
  const isHome = pathname.split('/').filter(Boolean).length <= 1;

  // 代码复制按钮由 markdown 渲染（服务端）注入；复制委托需要在文章页保留。
  useEffect(() => {
    const onCopyClick = async (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest('[data-code-copy]') : null;
      if (!(button instanceof HTMLElement)) return;
      const pre = button.closest('pre');
      if (!pre) return;
      const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
      try {
        await navigator.clipboard.writeText(code);
        if (button.lastElementChild) button.lastElementChild.textContent = t('copied');
      } catch {
        if (button.lastElementChild) button.lastElementChild.textContent = t('copyFailed');
      }
      setTimeout(() => { if (button.lastElementChild) button.lastElementChild.textContent = t('copy'); }, 1600);
    };
    document.addEventListener('click', onCopyClick);
    return () => document.removeEventListener('click', onCopyClick);
  }, [t]);

  useEffect(() => {
    if (!isHome) {
      document.documentElement.dataset.effects = 'off';
      document.documentElement.style.removeProperty('--magic-scroll');
      return;
    }
    const root = document.documentElement;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sparkleLayer = document.querySelector('[data-sparkle-layer]');

    const setEffects = (enabled: boolean) => {
      root.dataset.effects = enabled ? 'on' : 'off';
      document.querySelectorAll('[data-hero-seal-key]').forEach((button) => {
        button.setAttribute('aria-pressed', String(enabled));
        button.setAttribute('aria-label', enabled ? t('seal') : t('unseal'));
        button.setAttribute('title', enabled ? t('sealTitle') : t('unsealTitle'));
      });
    };

    let enabled = isHome && !reduceMotion && readStorage(localStorage, 'magic-effects') !== 'off';
    setEffects(enabled);

    const burstAt = (x: number, y: number) => {
      if (!enabled || reduceMotion || !(sparkleLayer instanceof HTMLElement)) return;
      for (let index = 0; index < 9; index += 1) {
        const burst = document.createElement('span');
        burst.className = 'click-spark magic-burst';
        burst.style.left = `${x}px`;
        burst.style.top = `${y}px`;
        burst.style.setProperty('--burst-angle', `${index * 40}deg`);
        sparkleLayer.append(burst);
        setTimeout(() => burst.remove(), 850);
      }
    };

    const onClick = (event: MouseEvent) => {
      const key = event.target instanceof Element ? event.target.closest('[data-hero-seal-key]') : null;
      if (!(key instanceof HTMLElement)) return;
      const box = key.getBoundingClientRect();
      if (key.hasAttribute('data-hero-seal-key')) {
        enabled = !enabled;
        setEffects(enabled);
        writeStorage(localStorage, 'magic-effects', enabled ? 'on' : 'off');
        if (enabled) burstAt(box.left + box.width / 2, box.top + box.height / 2);
      }
    };

    let scrollFrame = 0;
    const updateParallax = () => {
      scrollFrame = 0;
      if (enabled && !reduceMotion) root.style.setProperty('--magic-scroll', `${Math.min(scrollY * 0.08, 72)}px`);
    };
    const onScroll = () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateParallax);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!enabled || reduceMotion || !(sparkleLayer instanceof HTMLElement)) return;
      const burst = document.createElement('span');
      burst.className = 'click-spark';
      burst.style.left = `${event.clientX}px`;
      burst.style.top = `${event.clientY}px`;
      sparkleLayer.append(burst);
      setTimeout(() => burst.remove(), 650);
    };

    document.addEventListener('click', onClick);
    addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('click', onClick);
      removeEventListener('scroll', onScroll);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isHome, t]);

  return (
    <>
      {isHome && (
        <>
          <div className="magic-effects" aria-hidden="true" data-magic-effects>
            {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ ['--i' as string]: index }} />)}
          </div>
          <div className="sparkle-layer" aria-hidden="true" data-sparkle-layer />
        </>
      )}
    </>
  );
}
