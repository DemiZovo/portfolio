'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// 为各页面的背景样式设置当前栏目。
export default function BodySection() {
  const pathname = usePathname();
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    // The first segment is the locale. A locale-only route is the homepage.
    const section = segments.length <= 1 ? 'home' : segments[1];
    document.body.dataset.section = section;
  }, [pathname]);
  return null;
}
