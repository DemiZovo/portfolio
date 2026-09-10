'use client';

import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Props {
  slug: string;
  name: string;
  zh: string;
  card: string;
  count: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const round = (v: number, precision = 3) => parseFloat(v.toFixed(precision));
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

export default function CategoryCard({ slug, name, zh, card, count }: Props) {
  const t = useTranslations('blog');
  const wrapRef = useRef<HTMLAnchorElement | null>(null);
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef({ cx: 0, cy: 0, tx: 0, ty: 0, lastTs: 0, running: false });

  const setVarsFromXY = useCallback((x: number, y: number) => {
    const wrap = wrapRef.current;
    const shell = shellRef.current;
    if (!wrap || !shell) return;
    const width = shell.clientWidth || 1;
    const height = shell.clientHeight || 1;
    const percentX = clamp((100 / width) * x, 0, 100);
    const percentY = clamp((100 / height) * y, 0, 100);
    const centerX = percentX - 50;
    const centerY = percentY - 50;
    const vars: Record<string, string> = {
      '--pointer-x': `${percentX}%`,
      '--pointer-y': `${percentY}%`,
      '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
      '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
      '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
      '--pointer-from-top': `${percentY / 100}`,
      '--pointer-from-left': `${percentX / 100}`,
      '--rotate-x': `${round(-(centerX / 5))}deg`,
      '--rotate-y': `${round(centerY / 4)}deg`,
    };
    for (const [k, v] of Object.entries(vars)) wrap.style.setProperty(k, v);
  }, []);

  const step = useCallback((ts: number) => {
    const s = stateRef.current;
    if (!s.running) return;
    if (s.lastTs === 0) s.lastTs = ts;
    const dt = (ts - s.lastTs) / 1000;
    s.lastTs = ts;
    const k = 1 - Math.exp(-dt / 0.14);
    s.cx += (s.tx - s.cx) * k;
    s.cy += (s.ty - s.cy) * k;
    setVarsFromXY(s.cx, s.cy);
    const stillFar = Math.abs(s.tx - s.cx) > 0.05 || Math.abs(s.ty - s.cy) > 0.05;
    if (stillFar || document.hasFocus()) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      s.running = false;
      s.lastTs = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [setVarsFromXY]);

  const start = useCallback(() => {
    const s = stateRef.current;
    if (s.running) return;
    s.running = true;
    s.lastTs = 0;
    rafRef.current = requestAnimationFrame(step);
  }, [step]);

  const setTarget = useCallback((x: number, y: number) => {
    stateRef.current.tx = x;
    stateRef.current.ty = y;
    start();
  }, [start]);

  const getOffsets = (evt: PointerEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    const shell = shellRef.current;
    if (!wrap || !shell) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const precisePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    setVarsFromXY(shell.clientWidth / 2, shell.clientHeight / 2);
    if (reduced || !precisePointer) return;

    const handlePointerMove = (event: PointerEvent) => {
      const { x, y } = getOffsets(event, shell);
      setTarget(x, y);
    };
    const handlePointerEnter = (event: PointerEvent) => {
      wrap.classList.add('active');
      shell.classList.add('entering');
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => shell.classList.remove('entering'), 180);
      const { x, y } = getOffsets(event, shell);
      setTarget(x, y);
    };
    const handlePointerLeave = () => {
      setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
      const settle = () => {
        const s = stateRef.current;
        const settled = Math.hypot(s.tx - s.cx, s.ty - s.cy) < 0.6;
        if (settled) wrap.classList.remove('active');
        else rafRef.current = requestAnimationFrame(settle);
      };
      rafRef.current = requestAnimationFrame(settle);
    };

    wrap.addEventListener('pointerenter', handlePointerEnter);
    wrap.addEventListener('pointermove', handlePointerMove);
    wrap.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      wrap.removeEventListener('pointerenter', handlePointerEnter);
      wrap.removeEventListener('pointermove', handlePointerMove);
      wrap.removeEventListener('pointerleave', handlePointerLeave);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [setTarget, setVarsFromXY]);

  const style = {
    '--behind-glow-color': 'rgba(177, 138, 76, 0.45)',
    '--behind-glow-size': '55%',
  } as CSSProperties;

  return (
    <Link
      ref={wrapRef}
      className="category-card pc-card-wrapper"
      href={`/blog/${slug}` as never}
      aria-label={t('categoryAria', { name, zh, count })}
      style={style}
    >
      <span className="pc-behind" aria-hidden="true" />
      <span className="category-card__shell pc-card-shell" ref={shellRef}>
        <span className="category-card__face pc-card">
          <span className="pc-glare" aria-hidden="true" />
          <span className="category-card__corner category-card__corner--tl" aria-hidden="true">✦</span>
          <span className="category-card__corner category-card__corner--tr" aria-hidden="true">✦</span>
          <span className="category-card__corner category-card__corner--bl" aria-hidden="true">✦</span>
          <span className="category-card__corner category-card__corner--br" aria-hidden="true">✦</span>
          <span className="category-card__content pc-avatar-content">
            <span className="category-card__card">{card}</span>
            <span className="category-card__sigil" aria-hidden="true">✦</span>
            <span className="category-card__name">{name}</span>
            <span className="category-card__zh">{zh}</span>
            <span className="category-card__count">{t('categoryCount', { count })}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}
