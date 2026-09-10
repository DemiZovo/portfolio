'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// body[data-section] 有 3 处 CSS 消费者（sakura-theme.css 的 blog/life/guestbook 背景），
// 必须用客户端恢复这个属性（Next 的服务端渲染无法在 body 上写路径相关的属性）。
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
