'use client';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { getCategory } from '@/data/categories';
export default function OwnerTools() {
  const pathname = usePathname();
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    const check = () => { void fetch('/api/editor/session', { cache: 'no-store' }).then(r => setOwner(r.ok)).catch(() => setOwner(false)); };
    check(); window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [pathname]);
  if (!owner || pathname.startsWith('/write')) return null;
  const match = pathname.match(/^\/(blog|life)\/([^/]+)\/?$/);
  return <aside className="owner-tools" aria-label="站长文章操作">
    <Link href="/write">＋ 新增 / 管理文章</Link>
    {match && !(match[1] === 'blog' && getCategory(match[2])) && <Link href={`/write?kind=${match[1]}&slug=${encodeURIComponent(match[2])}`}>编辑 / 删除此文章</Link>}
  </aside>;
}
