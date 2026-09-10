'use client';

import { useEffect, useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function PerformanceInsights() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const browser = navigator as Navigator & { globalPrivacyControl?: boolean };
    const legacyWindow = window as Window & { doNotTrack?: string };
    setEnabled(browser.doNotTrack !== '1' && legacyWindow.doNotTrack !== '1' && browser.globalPrivacyControl !== true);
  }, []);

  if (!enabled) return null;

  return <SpeedInsights beforeSend={(event) => {
    const url = new URL(event.url);
    url.search = '';
    url.hash = '';
    return { ...event, url: url.href };
  }} />;
}
