'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const configured = Boolean(supabaseUrl && publishableKey);

export default function HomeLikeButton() {
  const t = useTranslations('like');
  const [count, setCount] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState(t('loading'));
  const [disabled, setDisabled] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);
  const controlRef = useRef<HTMLDivElement>(null);

  const parseCount = useCallback((value: unknown) => {
    const normalized = String(value);
    return /^\d+$/.test(normalized) ? normalized : null;
  }, []);

  const callRpc = useCallback(async (name: 'get_home_like_count' | 'increment_home_like_count') => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) throw new Error(`Like RPC failed with ${response.status}`);
    const nextCount = parseCount(await response.json());
    if (nextCount === null) throw new Error('Like RPC returned an invalid count');
    return nextCount;
  }, [parseCount]);

  const updateCount = useCallback((nextCount: string) => {
    setCount(nextCount);
    setLoaded(true);
    setStatus(t('total', { count: nextCount }));
  }, [t]);

  const revealOnTouch = useCallback(() => {
    if (!matchMedia('(hover: none)').matches) return;
    window.clearTimeout(hideTimer.current);
    controlRef.current?.classList.add('is-visible');
    hideTimer.current = window.setTimeout(() => controlRef.current?.classList.remove('is-visible'), 2200);
  }, []);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      try {
        const nextCount = await callRpc('get_home_like_count');
        if (cancelled) return;
        updateCount(nextCount);
        setDisabled(false);
      } catch {
        if (cancelled) return;
        setStatus(t('unavailable'));
        setDisabled(false);
      }
    })();
    return () => { cancelled = true; window.clearTimeout(hideTimer.current); };
  }, [callRpc, updateCount, t]);

  const handleClick = async () => {
    const wasLoaded = loaded;
    setDisabled(true);
    setStatus(wasLoaded ? t('liking') : t('retrying'));
    try {
      const nextCount = await callRpc(wasLoaded ? 'increment_home_like_count' : 'get_home_like_count');
      updateCount(nextCount);
      if (!wasLoaded) return;
      const button = controlRef.current?.querySelector('[data-home-like-button]');
      if (button instanceof HTMLElement) {
        button.classList.remove('is-liked');
        void button.offsetWidth;
        button.classList.add('is-liked');
      }
      revealOnTouch();
    } catch {
      setStatus(count ? t('failed', { count }) : t('failedRetry'));
    } finally {
      setDisabled(false);
    }
  };

  if (!configured) return null;
  return (
    <div className="home-like" data-home-like ref={controlRef}>
      <button
        className="home-like-button"
        type="button"
        aria-label={count ? t('ariaTotal', { count }) : t('ariaLoading')}
        aria-describedby="home-like-status"
        disabled={disabled}
        data-home-like-button
        onClick={handleClick}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20.4 10.55 19.1C5.4 14.5 2 11.45 2 7.7 2 4.65 4.4 2.25 7.45 2.25c1.72 0 3.38.8 4.55 2.05a6.2 6.2 0 0 1 4.55-2.05C19.6 2.25 22 4.65 22 7.7c0 3.75-3.4 6.8-8.55 11.42L12 20.4Z" />
        </svg>
        {count && <span className="home-like-count" data-home-like-count>{count}</span>}
      </button>
      <span className="home-like-tooltip" id="home-like-status" role="status" aria-live="polite" data-home-like-status>
        {status}
      </span>
    </div>
  );
}
