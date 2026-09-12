import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE = 'demiz-owner';
export class EditorError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function editorConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || process.env.CONTENT_SOURCE !== 'supabase') throw new EditorError('文章管理尚未启用，请先完成 EDITOR_SETUP.md 中的配置。', 503);
  return { url, key };
}
export async function supabaseRequest(path: string, token?: string, init: RequestInit = {}) {
  const { url, key } = editorConfig();
  return fetch(`${url}${path}`, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(15_000),
    headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...init.headers },
  });
}
export async function requireOwner(token?: string) {
  token ??= (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new EditorError('请登录站长账号。', 401);
  // Verify with Auth, never trust a decoded browser token or an IP address.
  const user = await supabaseRequest('/auth/v1/user', token);
  if (!user.ok) throw new EditorError('登录已过期，请重新登录；编辑内容会保留。', 401);
  const admin = await supabaseRequest('/rest/v1/rpc/is_site_admin', token, { method: 'POST', body: '{}' });
  if (!admin.ok || await admin.json() !== true) throw new EditorError('此账号没有站长权限。', 403);
  return token;
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new EditorError('请求来源不匹配。', 403);
}
export async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new EditorError('请求内容为空。');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_000_000) { await reader.cancel(); throw new EditorError('文章内容过大。', 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new EditorError('请求格式无效。'); }
}
export function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
export function editorFailure(error: unknown) {
  if (error instanceof EditorError) return privateJson({ error: error.message }, error.status);
  return privateJson({ error: '操作失败，请稍后重试；当前输入不会清空。' }, 500);
}
