'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { projectsSchema, type WorkshopProject, type ProjectSnapshot } from '@/lib/workshop-model';
import styles from './project-editor.module.css';
import { editorRequest } from '@/lib/editor-client';

const blank = (): WorkshopProject => ({ name: '', url: 'https://github.com/', description: { zh: '', en: '' }, language: '', art: 'portfolio', symbol: '✧', coverLabel: '', coverFooter: '' });
async function request(value?: ProjectSnapshot): Promise<ProjectSnapshot> {
  return editorRequest('projects', value ? 'POST' : 'GET', value);
}

export default function ProjectEditor({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const locale = useLocale();
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [projects, setProjects] = useState<WorkshopProject[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [undo, setUndo] = useState<WorkshopProject[] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = snapshot !== null && JSON.stringify(projects) !== JSON.stringify(snapshot.projects);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => {
    let cancelled = false;
    request().then(row => { if (!cancelled) { setSnapshot(row); setProjects(row.projects); } }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (pendingDelete !== null) { dialog.current?.showModal(); dialog.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus(); }
    else dialog.current?.close();
  }, [pendingDelete]);
  const project = active === null ? undefined : projects[active];
  function change(patch: Partial<WorkshopProject>) { setProjects(rows => rows.map((p, i) => i === active ? { ...p, ...patch } : p)); setMessage(''); }
  function move(index: number, direction: number) {
    const rows = [...projects];
    [rows[index], rows[index + direction]] = [rows[index + direction], rows[index]];
    setProjects(rows); setMessage('');
    if (active === index) setActive(index + direction); else if (active === index + direction) setActive(index);
  }
  async function reload() {
    if (dirty && !window.confirm('重新加载会放弃未保存的项目修改，是否继续？')) return;
    setBusy(true); setError('');
    try { const row = await request(); setSnapshot(row); setProjects(row.projects); setActive(null); setUndo(null); setMessage('已加载最新列表。'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save(e: FormEvent) {
    e.preventDefault(); if (!snapshot) return;
    const parsed = projectsSchema.safeParse(projects);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (typeof issue.path[0] === 'number') setActive(issue.path[0]);
      setError(`请检查第 ${Number(issue.path[0] ?? 0) + 1} 个项目：${issue.message}`); return;
    }
    setBusy(true); setError(''); setMessage('');
    try { const row = await request({ version: snapshot.version, projects: parsed.data }); setSnapshot(row); setProjects(row.projects); setUndo(null); setMessage('项目已保存，工坊页面已更新。'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function exportInput() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'workshop-projects.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className={styles.manager}>
    <p className={styles.hint}>管理工坊中的 GitHub 项目卡片。新增、删除和排序后，点击「保存并更新工坊」统一生效。</p>
    {error && <p className="editor-error" role="alert">{error}</p>}
    {message && <p className="editor-message" role="status">{message}</p>}
    <div className="editor-actions">
      <button type="button" disabled={busy || !snapshot || projects.length >= 60} onClick={() => { setProjects([...projects, blank()]); setActive(projects.length); setMessage(''); }}>＋ 新增项目</button>
      <button form="project-manager-form" type="submit" disabled={busy || !snapshot || !dirty}>{busy ? '处理中…' : '保存并更新工坊'}</button>
      <button type="button" disabled={busy} onClick={() => void reload()}>重新加载</button>
      <button type="button" disabled={!snapshot || busy} onClick={exportInput}>导出当前输入</button>
      <a href={`/${locale}/workshop`} target="_blank" rel="noopener noreferrer">查看工坊 ↗</a>
      <span role="status">{dirty ? '有未保存的修改' : snapshot ? '与已保存列表一致' : ''}</span>
    </div>
    {undo && <p className={styles.hint}>卡片已从当前列表移除，保存后生效。<button type="button" disabled={busy} onClick={() => { setProjects(undo); setUndo(null); setActive(null); }}>撤销删除</button></p>}
    {busy && !snapshot && <p role="status">正在读取项目…</p>}
    {snapshot && <div className={styles.workspace}>
      <aside aria-label="项目列表" className={styles.list}>
        <p className={styles.hint}>{projects.length} 个项目 · 按列表顺序展示</p>
        <ol>{projects.map((p, i) => <li key={i}>
          <button type="button" className={styles.select} disabled={busy} aria-current={active === i ? 'true' : undefined} onClick={() => setActive(i)}><strong>{p.name || '未命名项目'}</strong><small>{p.language || 'GitHub'}</small></button>
          <div className={styles.rowActions}>
            <button type="button" disabled={busy || i === 0} aria-label={`上移 ${p.name || '未命名项目'}`} onClick={() => move(i, -1)}>↑</button>
            <button type="button" disabled={busy || i === projects.length - 1} aria-label={`下移 ${p.name || '未命名项目'}`} onClick={() => move(i, 1)}>↓</button>
            <button type="button" disabled={busy} aria-label={`删除 ${p.name || '未命名项目'}`} onClick={() => setPendingDelete(i)}>删除</button>
          </div>
        </li>)}</ol>
        {!projects.length && <p>暂无项目，可以新增；保存空列表会清空工坊展示。</p>}
      </aside>
      <form id="project-manager-form" onSubmit={save} className={styles.form}>
        {project ? <fieldset disabled={busy}>
          <div className="editor-fields">
            <label>项目名称<input required maxLength={80} value={project.name} onChange={e => change({ name: e.target.value })} /></label>
            <label>技术 / 语言<input maxLength={40} value={project.language ?? ''} onChange={e => change({ language: e.target.value })} placeholder="例如 TypeScript" /></label>
            <label className="editor-wide">GitHub 仓库地址<input type="url" required maxLength={200} value={project.url} onChange={e => change({ url: e.target.value })} placeholder="https://github.com/用户名/仓库名" /></label>
            <label className="editor-wide">中文简介<textarea required rows={3} maxLength={240} value={project.description.zh} onChange={e => change({ description: { ...project.description, zh: e.target.value } })} /></label>
            <label className="editor-wide">英文简介（选填）<textarea rows={2} maxLength={240} value={project.description.en} onChange={e => change({ description: { ...project.description, en: e.target.value } })} /><small>留空时英文页面使用中文简介。</small></label>
            <label>封面风格<select value={project.art} onChange={e => change({ art: e.target.value as WorkshopProject['art'] })}><option value="portfolio">樱粉纸页</option><option value="site">浅蓝代码</option><option value="notebook">暖金笔记</option><option value="experiment">粉色实验</option></select></label>
            <label>封面符号<input required maxLength={8} value={project.symbol} onChange={e => change({ symbol: e.target.value })} /></label>
            <label>封面上标（选填）<input maxLength={40} value={project.coverLabel} onChange={e => change({ coverLabel: e.target.value })} /></label>
            <label>封面下标（选填）<input maxLength={40} value={project.coverFooter} onChange={e => change({ coverFooter: e.target.value })} /></label>
          </div>
          <div className={styles.preview} aria-label="卡片文字预览"><span aria-hidden="true">{project.symbol}</span><div><strong>{project.name || '项目名称'}</strong><p>{project.description.zh || '项目简介会显示在这里。'}</p><small>{project.language || 'GitHub'}</small></div></div>
        </fieldset> : <p className="editor-empty">选择左侧项目进行编辑，或点击「新增项目」。</p>}
      </form>
    </div>}
    <dialog ref={dialog} className="editor-confirm" aria-labelledby="project-delete-title" onCancel={() => setPendingDelete(null)}>
      <h2 id="project-delete-title">删除项目卡片</h2><p>从列表移除「{pendingDelete === null ? '' : projects[pendingDelete]?.name || '未命名项目'}」？保存后工坊不再展示这张卡片，GitHub 仓库不受影响。</p>
      <button type="button" disabled={busy} onClick={() => { setUndo(projects); setProjects(projects.filter((_, i) => i !== pendingDelete)); setActive(null); setPendingDelete(null); setMessage(''); }}>删除卡片</button>
      <button type="button" data-cancel onClick={() => setPendingDelete(null)}>取消</button>
    </dialog>
  </div>;
}
