import { cookies } from 'next/headers';
import { z } from 'zod';
import { EditorError, SESSION_COOKIE, editorFailure, privateJson, readBody, requireOwner, requireSameOrigin, supabaseRequest } from '@/lib/editor-server';

const REFRESH_COOKIE = 'demiz-owner-refresh';
const refreshPath = '/api/editor/session';
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const };
const sessionSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().positive() });

function sessionResponse(session: z.infer<typeof sessionSchema>) {
  const response = privateJson({ owner: true });
  response.cookies.set(SESSION_COOKIE, session.access_token, { ...cookieOptions, path: '/', maxAge: Math.min(session.expires_in, 3600) });
  // Browser-session cookie. Never expose refresh credentials to JavaScript or other API routes.
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, path: refreshPath });
  return response;
}

async function renew() {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) throw new EditorError('登录已失效，请登录站长账号。', 401);
  const result = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', undefined, { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
  if (!result.ok) throw new EditorError('登录已失效，请登录站长账号。', result.status === 429 ? 429 : result.status >= 500 ? 503 : 401);
  const session = sessionSchema.parse(await result.json());
  await requireOwner(session.access_token);
  return session;
}

export async function GET() {
  try { await requireOwner(); return privateJson({ owner: true }); }
  catch (error) { return editorFailure(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) }).safeParse(await readBody(request));
    if (!parsed.success) throw new EditorError('请填写有效的邮箱和密码。');
    const result = await supabaseRequest('/auth/v1/token?grant_type=password', undefined, { method: 'POST', body: JSON.stringify(parsed.data) });
    if (!result.ok) throw new EditorError('登录失败，请检查账号密码或稍后重试。', result.status === 429 ? 429 : 401);
    const session = sessionSchema.parse(await result.json());
    await requireOwner(session.access_token);
    return sessionResponse(session);
  } catch (error) { return editorFailure(error); }
}
export async function PUT(request: Request) {
  try { requireSameOrigin(request); return sessionResponse(await renew()); }
  catch (error) { return editorFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    let token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token && (await cookies()).get(REFRESH_COOKIE)?.value) {
      try { token = (await renew()).access_token; } catch { /* Still clear local cookies. */ }
    }
    if (token) await supabaseRequest('/auth/v1/logout', token, { method: 'POST' }).catch(() => undefined);
    const response = privateJson({ owner: false });
    response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, path: '/', maxAge: 0 });
    response.cookies.set(REFRESH_COOKIE, '', { ...cookieOptions, path: refreshPath, maxAge: 0 });
    return response;
  } catch (error) { return editorFailure(error); }
}
