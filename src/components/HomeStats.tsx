'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

function formatNow(date: Date, locale: string) {
  const weekdays = locale === 'zh'
    ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    : undefined;
  const datePart = date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: weekdays ? undefined : 'long',
  });
  const weekday = weekdays ? weekdays[date.getDay()] : '';
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return { datePart, timePart: `${hour}:${minute}:${second}`, second, weekday };
}

export default function HomeStats() {
  const t = useTranslations('view');
  const locale = useLocale();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return null;
  const { datePart, timePart, second, weekday } = formatNow(now, locale);
  const [hh, mm] = timePart.split(':');

  return (
    <div className="home-view" data-home-view aria-label={t('ariaLabel')}>
      <span className="home-view-date">
        {weekday ? `${weekday} · ` : ''}{datePart}
      </span>
      <div className="home-view-ring">
        <svg className="home-view-ring__rune" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" className="home-view-ring__circle" />
          <circle cx="50" cy="50" r="38" className="home-view-ring__circle home-view-ring__circle--dashed" />
          <g className="home-view-ring__glyphs">
            <text x="50" y="7">✦</text>
            <text x="50" y="97">✦</text>
            <text x="7" y="56">✦</text>
            <text x="93" y="56">✦</text>
          </g>
        </svg>
        <span className="home-view-ring__time">
          {hh}:{mm}:<span className="home-view-ring__second" key={second}>{second}</span>
        </span>
      </div>
    </div>
  );
}
