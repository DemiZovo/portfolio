'use client';

import { useEffect } from 'react';

export default function ReadMarkers() {
  useEffect(() => {
    const key = 'demiz:article-reads';
    let reads = new Set<string>();
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (Array.isArray(value)) reads = new Set(value.filter((item) => typeof item === 'string'));
    } catch {}

    for (const marker of document.querySelectorAll<HTMLElement>('[data-read-marker]')) {
      const entryKey = marker.dataset.readMarker;
      marker.hidden = !entryKey || !reads.has(entryKey);
    }
  }, []);

  return null;
}
