'use client';

let refreshing: Promise<boolean> | null = null;
async function refreshSession() {
  if (!refreshing) {
    const refresh = async () => {
      // A different tab may have renewed the shared HttpOnly cookies while we waited.
      if ((await fetch('/api/editor/session', { cache: 'no-store' })).ok) return true;
      const response = await fetch('/api/editor/session', { method: 'PUT', cache: 'no-store' });
      if (response.status === 401) return false;
      if (!response.ok) throw new Error('暂时无法续期，请稍后重试；当前输入已保留。');
      return true;
    };
    refreshing = (async () => await (typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('demiz-writer-session', refresh)
      : refresh()))().finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function editorRequest(path: string, method = 'GET', value?: unknown) {
  const send = () => fetch(`/api/editor/${path}`, {
    method, cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
  let response = await send();
  if (response.status === 401 && !(path === 'session' && method !== 'GET')) {
    if (await refreshSession()) response = await send();
    if (response.status === 401) window.dispatchEvent(new Event('writer-auth-required'));
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '请求失败，请重试。');
  return result;
}
