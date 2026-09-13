'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { getCategory } from '@/data/categories';
const OwnerContext = createContext(false);
export function OwnerProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const check = () => { void fetch('/api/editor/session', { cache: 'no-store' }).then(r => { if (!cancelled) setOwner(r.ok); }).catch(() => { if (!cancelled) setOwner(false); }); };
    check(); window.addEventListener('focus', check);
    window.addEventListener('editor-session-change', check);
    return () => { cancelled = true; window.removeEventListener('focus', check); window.removeEventListener('editor-session-change', check); };
  }, [pathname, enabled]);
  return <OwnerContext.Provider value={enabled && owner}>{children}</OwnerContext.Provider>;
}
export function ArticleEditLink({ kind, slug, category }: { kind: 'blog' | 'life'; slug?: string; category?: string }) {
  const owner = useContext(OwnerContext);
  if (!owner) return null;
  const query = new URLSearchParams({ kind, ...(slug ? { slug } : { new: '1' }), ...(category ? { category } : {}) });
  return <Link className="article-edit-link" href={`/write?${query}`}>{slug ? '编辑文章' : kind === 'life' ? '＋ 新增生活记录' : '＋ 新增文章'}</Link>;
}
export default function OwnerTools() {
  const pathname = usePathname();
  const owner = useContext(OwnerContext);
  if (!owner || pathname.startsWith('/write')) return null;
  const match = pathname.match(/^\/(blog|life)\/([^/]+)\/?$/);
  return <aside className="owner-tools" aria-label="站长文章操作">
    <Link href="/write">管理文章</Link>
    {match && !(match[1] === 'blog' && getCategory(match[2])) && <Link href={`/write?kind=${match[1]}&slug=${encodeURIComponent(match[2])}`}>编辑 / 删除此文章</Link>}
  </aside>;
}
