'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export default function LanguageSwitch() {
  const t = useTranslations('header');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = locale === 'zh' ? 'en' : 'zh';

  const switchLanguage = () => {
    try {
      document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000`;
    } catch {}
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button type="button" className="lang-button" aria-label={t('language')} onClick={switchLanguage}>
      <svg aria-hidden="true"><use href="#nav-globe" /></svg>
      <span>{nextLocale === 'zh' ? '中' : 'EN'}</span>
    </button>
  );
}
