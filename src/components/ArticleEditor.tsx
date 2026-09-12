'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { categories } from '@/data/categories';
import type { ArticleDocument, EditorArticle } from '@/lib/editor-model';
import './article-editor.css';

async function api(path: string, method = 'GET', value?: unknown) {
  const response = await fetch(`/api/editor/${path}`, {
    method, cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '请求失败，请重试。');
  return result;
}
const blankDocument = (): ArticleDocument => ({ data: {
  title: '', description: '', published: new Date().toISOString().slice(0, 10),
  category: 'other', tags: [], featured: false, toc: true, status: 'growing',
}, body: '' });

export default function ArticleEditor({ configured, initialKind, initialSlug }: {
  configured: boolean; initialKind?: string; initialSlug?: string;
}) {
  const locale = useLocale();
  const [owner, setOwner] = useState(false);
  const [checking, setChecking] = useState(configured);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<EditorArticle[]>([]);
  const [active, setActive] = useState<EditorArticle | null>(null);
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<'blog' | 'life'>(initialKind === 'life' ? 'life' : 'blog');
  const [slug, setSlug] = useState('');
  const [doc, setDoc] = useState<ArticleDocument>(blankDocument);
  const [saved, setSaved] = useState('');
  const [html, setHtml] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [confirmation, setConfirmation] = useState<'trash' | 'purge' | 'unpublish' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recovery, setRecovery] = useState<{ active: EditorArticle | null; kind: 'blog' | 'life'; slug: string; doc: ArticleDocument } | null>(null);
  const didOpen = useRef(false);
  const snapshot = JSON.stringify({ kind, slug, doc });
  const dirty = editing && snapshot !== saved;

  useEffect(() => {
    if (!owner) return;
    try {
      const raw = sessionStorage.getItem('demiz:editor-recovery');
      if (raw) {
        const value = JSON.parse(raw);
        if ((value.kind === 'blog' || value.kind === 'life') && typeof value.slug === 'string' && typeof value.doc?.body === 'string' && value.doc?.data) setRecovery(value);
      }
    } catch { /* Storage may be unavailable; manual export stays available. */ }
  }, [owner]);
  useEffect(() => {
    if (!editing || recovery) return;
    try {
      if (dirty) sessionStorage.setItem('demiz:editor-recovery', JSON.stringify({ active, kind, slug, doc }));
      else sessionStorage.removeItem('demiz:editor-recovery');
    } catch { /* Never discard the in-memory editor on storage failure. */ }
  }, [editing, dirty, active, kind, slug, doc, recovery]);

  function open(row: EditorArticle | null) {
    const nextKind = row?.kind ?? (initialKind === 'life' ? 'life' : 'blog');
    const nextDoc = row?.working ?? blankDocument();
    setActive(row); setKind(nextKind); setSlug(row?.slug ?? ''); setDoc(nextDoc);
    setSaved(JSON.stringify({ kind: nextKind, slug: row?.slug ?? '', doc: nextDoc }));
    setEditing(true); setHtml(null); setError(''); setMessage(''); setConfirmation(null);
  }
  async function reloadRows() {
    const result: EditorArticle[] = await api('articles');
    setRows(result);
    return result;
  }
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    api('session').then(async () => {
      if (cancelled) return;
      setOwner(true);
      const result: EditorArticle[] = await api('articles');
      if (!cancelled) setRows(result);
    }).catch((e: Error) => { if (!cancelled) setMessage(e.message); }).finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [configured]);
  useEffect(() => {
    if (didOpen.current || !owner || !initialSlug || rows.length === 0) return;
    didOpen.current = true;
    const row = rows.find(row => row.kind === initialKind && row.slug === initialSlug);
    if (row) open(row);
    // Initial URL selection only; editing state is intentionally independent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, rows, initialKind, initialSlug]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const leave = (e: MouseEvent) => {
      const link = (e.target as Element)?.closest('a[href], .lang-button');
      if (link && !window.confirm('还有未保存的修改，确定离开吗？')) { e.preventDefault(); e.stopPropagation(); }
    };
    const submit = (e: Event) => {
      if ((e.target as Element)?.closest('.browser-bar__search') && !window.confirm('还有未保存的修改，确定离开吗？')) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', leave, true);
    document.addEventListener('submit', submit, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', leave, true); document.removeEventListener('submit', submit, true); };
  }, [dirty]);
  const mayLeave = () => !dirty || window.confirm('还有未保存的修改，确定放弃吗？');
  const change = (key: string, value: unknown) => {
    setDoc(current => ({ ...current, data: { ...current.data, [key]: value } })); setHtml(null);
  };
  async function login(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api('session', 'POST', { email, password }); setPassword(''); setOwner(true); setMessage(''); await reloadRows(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function mutate(action: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const row: EditorArticle = await api('articles', 'POST', {
        action: !active && action === 'save' ? 'create' : action,
        id: active?.id, version: active?.version, kind, slug, document: doc,
      });
      if (action === 'purge') { setEditing(false); setActive(null); try { sessionStorage.removeItem('demiz:editor-recovery'); } catch {} }
      else { open(row); }
      // Update the local list immediately, even if a subsequent reload fails.
      setRows(current => action === 'purge' ? current.filter(r => r.id !== row.id) : [row, ...current.filter(r => r.id !== row.id)]);
      setMessage(({ save: '草稿已保存，公开版本未改变。', publish: '已发布，公开页面与索引已更新。', unpublish: '已撤回为草稿。', trash: '已移入回收站。', restore: '已恢复为草稿，可检查后发布。', purge: '已永久删除。' } as Record<string, string>)[action]);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); setConfirmation(null); }
  }
  function exportInput() {
    const blob = new Blob([`---\n${JSON.stringify({ ...doc.data, slug, draft: !active?.published }, null, 2)}\n---\n\n${doc.body}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${slug || 'untitled'}.md`; a.click(); URL.revokeObjectURL(url);
  }
  if (!configured) return <section className="editor-shell"><h1>文章管理</h1><p>文章管理尚未启用。</p><p>请先完成数据库初始化、导入现有文章，并配置站长账号和内容来源。操作说明见项目中的 EDITOR_SETUP.md。</p></section>;
  if (checking) return <p role="status">正在检查登录状态…</p>;

  return <section className="editor-shell">
    <header className="editor-heading"><div><p className="eyebrow">DEMiZ · WRITING ROOM</p><h1>文章管理</h1></div>
      {owner && <button disabled={busy} onClick={async () => {
        if (!mayLeave()) return;
        setBusy(true);
        try { await api('session', 'DELETE'); setOwner(false); setRows([]); setEditing(false); setDoc(blankDocument()); setActive(null); setRecovery(null); try { sessionStorage.removeItem('demiz:editor-recovery'); } catch {} }
        catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>退出登录</button>}
    </header>
    {message && <p role="status" className="editor-message">{message}</p>}
    {error && <p role="alert" className="editor-error">{error}</p>}
    {!owner ? <form onSubmit={login} className="editor-login">
      <p>使用站长账号登录，继续写下新的记录。</p>
      <label>邮箱<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>密码<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} type="submit">{busy ? '正在登录…' : '登录'}</button>
    </form> : <>
      {recovery && <section className="editor-confirm" role="status"><p>发现本标签页未保存的内容：{String(recovery.doc.data.title || '未命名文章')}。</p>
        <button disabled={busy} onClick={() => {
          if (!mayLeave()) return;
          setActive(recovery.active); setKind(recovery.kind); setSlug(recovery.slug); setDoc(recovery.doc); setSaved(''); setEditing(true); setHtml(null); setRecovery(null);
        }}>恢复未保存内容</button>
        <button onClick={() => { setRecovery(null); try { sessionStorage.removeItem('demiz:editor-recovery'); } catch {} }}>忽略</button>
      </section>}
      <div className="editor-actions"><button disabled={busy} onClick={() => { if (mayLeave()) open(null); }}>＋ 新增文章</button>
        <button disabled={busy} onClick={async () => { setBusy(true); try { await reloadRows(); setMessage('列表已刷新，点击文章可打开最新版本。'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>刷新列表</button>
        <details><summary>重新登录</summary><form className="editor-login" onSubmit={login}>
          <p>登录过期时可在此重新登录，当前输入会保留。</p>
          <label>邮箱<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>密码<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button disabled={busy}>重新登录</button>
        </form></details>
      </div>
      <div className="editor-workspace">
        <aside className="editor-list" aria-label="文章列表">
          <label>查找文章<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <label>状态<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部文章</option><option value="draft">草稿</option><option value="published">已发布</option><option value="trash">回收站</option></select></label>
          <ul>{rows.filter(row => (filter === 'trash' ? !!row.deleted_at : !row.deleted_at && (filter === 'all' || (filter === 'published' ? !!row.published : !row.published))) && String(row.working.data.title).toLowerCase().includes(query.toLowerCase())).map(row =>
            <li key={row.id}><button disabled={busy} aria-current={active?.id === row.id ? 'true' : undefined} onClick={() => { if (mayLeave()) open(row); }}>
              <strong>{String(row.working.data.title)}</strong><small>{row.kind === 'blog' ? '笔记' : '手账'} · {row.deleted_at ? '回收站' : row.published ? '已发布' : '草稿'} · v{row.version}</small>
            </button></li>)}</ul>
          {rows.length === 0 && <p>还没有文章。可以新增文章，或先导入已有内容。</p>}
        </aside>
        <div className="editor-main">
          {!editing ? <p className="editor-empty">选择一篇文章，或开始新的记录。</p> : <>
            <div className="editor-actions"><span>{dirty ? '有未保存的修改' : active ? '内容已保存' : '尚未保存'}{active?.published ? ' · 有公开版本' : ' · 私有草稿'}</span>
              <button type="button" onClick={exportInput}>导出当前 Markdown</button>
              {active?.published && <a href={`/${locale}/${kind}/${slug}`} target="_blank" rel="noreferrer">查看公开文章 ↗</a>}
            </div>
            <form onSubmit={e => { e.preventDefault(); void mutate('save'); }}>
              <fieldset disabled={busy || !!active?.deleted_at}>
                <div className="editor-fields">
                  <label>类型<select value={kind} disabled={!!active} onChange={e => setKind(e.target.value as 'blog' | 'life')}><option value="blog">魔法笔记</option><option value="life">日常手账</option></select></label>
                  <label>短链接<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} value={slug} disabled={!!active} onChange={e => setSlug(e.target.value)} /><small>保存后固定，保持文章地址稳定。</small></label>
                  <label className="editor-wide">标题<input required maxLength={100} value={String(doc.data.title ?? '')} onChange={e => change('title', e.target.value)} /></label>
                  <label className="editor-wide">摘要<textarea required maxLength={240} rows={2} value={String(doc.data.description ?? '')} onChange={e => change('description', e.target.value)} /></label>
                  <label>发布日期<input type="date" required value={String(doc.data.published ?? '').slice(0, 10)} onChange={e => change('published', e.target.value)} /></label>
                  {kind === 'blog' && <label>分类<select value={String(doc.data.category ?? 'other')} onChange={e => change('category', e.target.value)}>{categories.map(c => <option key={c.slug} value={c.slug}>{c.zh}</option>)}</select></label>}
                  <label className="editor-wide">标签（用英文逗号分隔）<input value={Array.isArray(doc.data.tags) ? doc.data.tags.join(',') : ''} onChange={e => change('tags', e.target.value.split(','))} /></label>
                  <label>英文标题<input maxLength={100} value={String(doc.data.titleEn ?? '')} onChange={e => change('titleEn', e.target.value || undefined)} /></label>
                  <label>英文摘要<input maxLength={240} value={String(doc.data.descriptionEn ?? '')} onChange={e => change('descriptionEn', e.target.value || undefined)} /></label>
                  <label className="editor-wide">封面图片路径<input value={String(doc.data.cover ?? '')} onChange={e => change('cover', e.target.value || undefined)} /></label>
                </div>
                <label>Markdown 正文<textarea className="editor-body" spellCheck={false} value={doc.body} onChange={e => { setDoc({ ...doc, body: e.target.value }); setHtml(null); }} /></label>
                <div className="editor-actions">
                  <button type="submit">{busy ? '处理中…' : '保存草稿'}</button>
                  <button type="button" disabled={!active} onClick={() => void mutate('publish')}>发布当前内容</button>
                  <button type="button" onClick={async () => {
                    setBusy(true); setError('');
                    try { const result = await api('preview', 'POST', doc); setHtml(result.html); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
                  }}>预览</button>
                </div>
                {!active && <small>首次保存后即可发布。</small>}
              </fieldset>
            </form>
            {html !== null && <section aria-label="草稿预览" className="editor-preview"><h2>{String(doc.data.title)}</h2><p>{String(doc.data.description)}</p><div className="article-content" dangerouslySetInnerHTML={{ __html: html }} /></section>}
            {active && <div className="editor-actions editor-danger">
              {active.deleted_at ? <><button disabled={busy} onClick={() => void mutate('restore')}>恢复为草稿</button><button disabled={busy} onClick={() => setConfirmation('purge')}>永久删除</button></> : <>
                {active.published && <button disabled={busy} onClick={() => setConfirmation('unpublish')}>撤回为草稿</button>}
                <button disabled={busy} onClick={() => setConfirmation('trash')}>移入回收站</button>
              </>}
            </div>}
            {confirmation && <section className="editor-confirm" role="alert" aria-label="确认文章操作">
              <p>确定{confirmation === 'purge' ? '永久删除' : confirmation === 'trash' ? '移入回收站' : '撤回'}《{String(active?.working.data.title)}》？{confirmation === 'purge' ? '此操作无法恢复。' : '公开页面将不再展示这篇文章。'}{dirty && '未保存的输入将被丢弃，可先取消并导出。'}</p>
              <button disabled={busy} onClick={() => void mutate(confirmation)}>确认操作</button><button disabled={busy} onClick={() => setConfirmation(null)}>取消</button>
            </section>}
          </>}
        </div>
      </div>
    </>}
  </section>;
}
