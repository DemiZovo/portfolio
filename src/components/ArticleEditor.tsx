'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { categories } from '@/data/categories';
import type { ArticleDocument, EditorArticle } from '@/lib/editor-model';
import './article-editor.css';
import ProjectEditor from './ProjectEditor';
import { Link } from '@/i18n/navigation';

import { editorRequest as api } from '@/lib/editor-client';

const blankDocument = (): ArticleDocument => ({ data: {
  title: '', description: '', published: new Date().toISOString().slice(0, 10),
  category: 'other', tags: [], featured: false, toc: true, status: 'growing',
}, body: '' });

export default function ArticleEditor({ configured, initialKind, initialSlug, initialCategory, createNew, manageProjects = false }: {
  configured: boolean; initialKind?: string; initialSlug?: string; initialCategory?: string; createNew?: boolean; manageProjects?: boolean;
}) {
  const locale = useLocale();
  const [owner, setOwner] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  useEffect(() => { const onExpired = () => setAuthRequired(true); window.addEventListener('writer-auth-required', onExpired); return () => window.removeEventListener('writer-auth-required', onExpired); }, []);
  const [projectDirty, setProjectDirty] = useState(false);
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
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (confirmation) {
      confirmDialog.current?.showModal();
      confirmDialog.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
    }
    else confirmDialog.current?.close();
  }, [confirmation]);
  const snapshot = JSON.stringify({ kind, slug, doc });
  const dirty = projectDirty || (editing && snapshot !== saved);

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
    if (!row && categories.some(c => c.slug === initialCategory)) nextDoc.data.category = initialCategory;
    setActive(row); setKind(nextKind); setSlug(row?.slug ?? ''); setDoc(nextDoc);
    setSaved(JSON.stringify({ kind: nextKind, slug: row?.slug ?? '', doc: nextDoc }));
    setEditing(true); setHtml(null); setError(''); setMessage(''); setConfirmation(null);
    setSettingsOpen(!row);
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
      if (manageProjects) return;
      const result: EditorArticle[] = await api('articles');
      if (!cancelled) setRows(result);
    }).catch((e: Error) => { if (!cancelled) setMessage(e.message); }).finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [configured, manageProjects]);
  useEffect(() => {
    if (didOpen.current || !owner) return;
    if (createNew) { didOpen.current = true; open(null); return; }
    if (!initialSlug || rows.length === 0) return;
    didOpen.current = true;
    const row = rows.find(row => row.kind === initialKind && row.slug === initialSlug);
    if (row) open(row);
    // Initial URL selection only; editing state is intentionally independent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, rows, initialKind, initialSlug, createNew]);
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
    try { await api('session', 'POST', { email, password }); setPassword(''); setOwner(true); setAuthRequired(false); setMessage(''); if (!manageProjects) await reloadRows(); }
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
      else if (action === 'trash') { setEditing(false); setActive(null); try { sessionStorage.removeItem('demiz:editor-recovery'); } catch {} }
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
  const visibleRows = rows.filter(row => (filter === 'trash' ? !!row.deleted_at : !row.deleted_at && (filter === 'all' || (filter === 'published' ? !!row.published : !row.published))) && String(row.working.data.title).toLowerCase().includes(query.toLowerCase()));
  if (!configured) return <section className="editor-shell"><h1>{manageProjects ? '项目管理' : '文章管理'}</h1><p>站长 Writer 尚未启用。</p><p>请先完成数据库初始化、导入现有文章，并配置站长账号和内容来源。操作说明见项目中的 EDITOR_SETUP.md；管理工坊项目还需执行 supabase-workshop.sql。</p></section>;
  if (checking) return <p role="status">正在检查登录状态…</p>;

  return <section className="editor-shell">
    <header className="editor-heading"><div><p className="eyebrow">DEMiZ · WRITING ROOM</p><h1>{manageProjects ? '项目管理' : '文章管理'}</h1></div>
      {owner && <button disabled={busy} onClick={async () => {
        if (!mayLeave()) return;
        setBusy(true);
        try { await api('session', 'DELETE'); setOwner(false); setRows([]); setEditing(false); setDoc(blankDocument()); setActive(null); setRecovery(null); try { sessionStorage.removeItem('demiz:editor-recovery'); } catch {} }
        catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>退出登录</button>}
    </header>
    <nav className="editor-actions" aria-label="Writer 管理栏目"><Link href="/write" aria-current={!manageProjects ? 'page' : undefined}>文章管理</Link><Link href="/write?view=projects" aria-current={manageProjects ? 'page' : undefined}>项目管理</Link></nav>
    {message && <p role="status" className="editor-message">{message}</p>}
    {error && <p role="alert" className="editor-error">{error}</p>}
    {(!owner || authRequired) && <form onSubmit={login} className="editor-login">
      <p>使用站长账号登录，继续写下新的记录。</p>
      <label>邮箱<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>密码<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} type="submit">{busy ? '正在登录…' : '登录'}</button>
    </form>}
    {owner && <div hidden={authRequired}>{manageProjects ? <>
      <ProjectEditor onDirty={setProjectDirty} />
    </> : <>
      {recovery && <section className="editor-confirm" role="status"><p>发现本标签页未保存的内容：{String(recovery.doc.data.title || '未命名文章')}。</p>
        <button disabled={busy} onClick={() => {
          if (!mayLeave()) return;
          setActive(recovery.active); setKind(recovery.kind); setSlug(recovery.slug); setDoc(recovery.doc); setSaved(''); setEditing(true); setHtml(null); setRecovery(null);
        }}>恢复未保存内容</button>
        <button onClick={() => { setRecovery(null); try { sessionStorage.removeItem('demiz:editor-recovery'); } catch {} }}>忽略</button>
      </section>}
      <div className="editor-actions"><button disabled={busy} onClick={() => { if (mayLeave()) open(null); }}>＋ 新增文章</button>
        <button disabled={busy} onClick={async () => { setBusy(true); try { await reloadRows(); setMessage('列表已刷新，点击文章可打开最新版本。'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>刷新列表</button>
        </div>
      <div className={`editor-workspace ${editing ? 'editor-workspace--editing' : 'editor-workspace--browse'}`}>
        <aside className="editor-list" aria-label="文章列表">
          <div className="editor-list-filters"><label>查找文章<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <label>状态<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部文章</option><option value="draft">草稿</option><option value="published">已发布</option><option value="trash">回收站</option></select></label></div>
          <ul>{visibleRows.map(row =>
            <li key={row.id} className="editor-list-row"><button disabled={busy} aria-current={active?.id === row.id ? 'true' : undefined} onClick={() => { if (mayLeave()) open(row); }}>
              <strong>{String(row.working.data.title)}</strong><small>{row.kind === 'blog' ? '笔记' : '生活记录'} · {row.deleted_at ? '回收站' : row.published ? '已发布' : '草稿'}</small>
            </button><button className="editor-delete" disabled={busy} aria-label={'删除文章：' + String(row.working.data.title)} onClick={() => {
              if (active?.id !== row.id) { if (!mayLeave()) return; open(row); }
              setConfirmation(row.deleted_at ? 'purge' : 'trash');
            }}>{row.deleted_at ? '永久删除' : '删除'}</button></li>)}</ul>
          {visibleRows.length === 0 && <p>{filter === 'trash' ? '回收站为空。' : query ? '没有找到匹配的文章。' : '暂无文章，点击「新增文章」开始写作。'}</p>}
        </aside>
        <div className="editor-main" hidden={!editing}>
          {!editing ? <p className="editor-empty">选择一篇文章，或开始新的记录。</p> : <>
            <div className="editor-actions"><button type="button" disabled={busy} onClick={() => { if (mayLeave()) { setEditing(false); setActive(null); setHtml(null); try { sessionStorage.removeItem('demiz:editor-recovery'); } catch {} } }}>← 返回文章列表</button><span>{dirty ? '有未保存的修改' : active ? '内容已保存' : '尚未保存'}{active?.published ? ' · 有公开版本' : ' · 私有草稿'}</span>
              <details className="editor-secondary"><summary>更多</summary><button type="button" onClick={exportInput}>导出 Markdown</button></details>
              {active?.published && <a href={`/${locale}/${kind}/${slug}`} target="_blank" rel="noreferrer">查看公开文章 ↗</a>}
            </div>
                <div className="editor-actions editor-toolbar">
                  <button form="article-editor-form" disabled={busy || !!active?.deleted_at} type="submit">{busy ? '处理中…' : '保存草稿'}</button>
                  <button type="button" disabled={busy || !active || !!active?.deleted_at} onClick={() => void mutate('publish')}>发布当前内容</button>
                  <button type="button" disabled={busy} onClick={async () => {
                    setBusy(true); setError('');
                    try { const result = await api('preview', 'POST', doc); setHtml(result.html); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
                  }}>预览</button>
                </div>
                {!active && <small>首次保存后即可发布。</small>}

            <form id="article-editor-form" onInvalidCapture={() => setSettingsOpen(true)} onSubmit={e => { e.preventDefault(); void mutate('save'); }}>
              <fieldset disabled={busy || !!active?.deleted_at}>
                  <label className="editor-wide">标题<input required maxLength={100} value={String(doc.data.title ?? '')} onChange={e => change('title', e.target.value)} /></label>
                <label>Markdown 正文<textarea className="editor-body" spellCheck={false} value={doc.body} onChange={e => { setDoc({ ...doc, body: e.target.value }); setHtml(null); }} /></label>
                <details className="editor-settings" open={settingsOpen} onToggle={e => setSettingsOpen(e.currentTarget.open)}><summary>文章设置 <small>摘要、分类、标签与网址</small></summary>
                <div className="editor-fields">
                  <label>类型<select value={kind} disabled={!!active} onChange={e => setKind(e.target.value as 'blog' | 'life')}><option value="blog">魔法笔记</option><option value="life">日常手账</option></select></label>
                  <label>短链接<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} value={slug} disabled={!!active} onChange={e => setSlug(e.target.value)} /><small>保存后固定，保持文章地址稳定。</small></label>
                  <label className="editor-wide">摘要<textarea required maxLength={240} rows={2} value={String(doc.data.description ?? '')} onChange={e => change('description', e.target.value)} /></label>
                  <label>发布日期<input type="date" required value={String(doc.data.published ?? '').slice(0, 10)} onChange={e => change('published', e.target.value)} /></label>
                  {kind === 'blog' && <label>分类<select value={String(doc.data.category ?? 'other')} onChange={e => change('category', e.target.value)}>{categories.map(c => <option key={c.slug} value={c.slug}>{c.zh}</option>)}</select></label>}
                  <label className="editor-wide">标签（用英文逗号分隔）<input value={Array.isArray(doc.data.tags) ? doc.data.tags.join(',') : ''} onChange={e => change('tags', e.target.value.split(','))} /></label>
                  <details className="editor-wide editor-secondary"><summary>更多选项</summary><div className="editor-fields">
                  <label>英文标题<input maxLength={100} value={String(doc.data.titleEn ?? '')} onChange={e => change('titleEn', e.target.value || undefined)} /></label>
                  <label>英文摘要<input maxLength={240} value={String(doc.data.descriptionEn ?? '')} onChange={e => change('descriptionEn', e.target.value || undefined)} /></label>
                  <label className="editor-wide">封面图片路径<input value={String(doc.data.cover ?? '')} onChange={e => change('cover', e.target.value || undefined)} /></label>
                  </div></details>
                </div>
                </details>
              </fieldset>
            </form>
            {html !== null && <section aria-label="草稿预览" className="editor-preview"><h2>{String(doc.data.title)}</h2><p>{String(doc.data.description)}</p><div className="article-content" dangerouslySetInnerHTML={{ __html: html }} /></section>}
            {active && <div className="editor-actions editor-danger">
              {active.deleted_at ? <><button disabled={busy} onClick={() => void mutate('restore')}>恢复为草稿</button><button disabled={busy} onClick={() => setConfirmation('purge')}>永久删除</button></> : <>
                {active.published && <button disabled={busy} onClick={() => setConfirmation('unpublish')}>撤回为草稿</button>}
                <button disabled={busy} onClick={() => setConfirmation('trash')}>删除文章</button>
              </>}
            </div>}
            <dialog ref={confirmDialog} className="editor-confirm" aria-labelledby="delete-heading" onCancel={() => setConfirmation(null)}>
              <h2 id="delete-heading">{confirmation === 'purge' ? '永久删除文章' : confirmation === 'trash' ? '删除文章' : '撤回文章'}</h2>
              <p>确定{confirmation === 'purge' ? '永久删除' : confirmation === 'trash' ? '移入回收站' : '撤回'}《{String(active?.working.data.title)}》？{confirmation === 'purge' ? '此操作无法恢复。' : confirmation === 'trash' ? '文章将移入回收站，可以恢复；公开页面将不再展示。' : '公开页面将不再展示这篇文章。'}{dirty && '未保存的输入将被丢弃，可先取消并导出。'}</p>
              <button disabled={busy} onClick={() => confirmation && void mutate(confirmation)}>确认{confirmation === 'unpublish' ? '撤回' : '删除'}</button><button data-cancel disabled={busy} onClick={() => setConfirmation(null)}>取消</button>
            </dialog>
          </>}
        </div>
      </div>
    </>}</div>}
  </section>;
}
