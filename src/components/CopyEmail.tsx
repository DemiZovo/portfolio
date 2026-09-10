'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';

export default function CopyEmail({ email }: { email: string }) {
  const t = useTranslations('copyEmail');
  const labelRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const controlRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const handleClick = async () => {
    window.clearTimeout(timer.current);
    const label = labelRef.current;
    const status = statusRef.current;
    const control = controlRef.current;
    if (!label || !status || !control) return;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      control.classList.add('is-copied');
      label.textContent = t('copied');
      status.textContent = t('copiedStatus', { email });
    } catch {
      label.textContent = t('label');
      status.textContent = t('failed');
    }
    timer.current = window.setTimeout(() => {
      control.classList.remove('is-copied');
      label.textContent = t('label');
      status.textContent = t('hint');
    }, 2200);
  };

  return (
    <span className="copy-email" ref={controlRef}>
      <button type="button" className="copy-email__button" aria-describedby="copy-email-status" onClick={handleClick}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 7.2 5.4a2 2 0 0 0 2.6 0L20.5 7" /></svg>
        <span ref={labelRef}>{t('label')}</span>
      </button>
      <span className="copy-email__status" id="copy-email-status" role="status" aria-live="polite" ref={statusRef}>{t('hint')}</span>
    </span>
  );
}
