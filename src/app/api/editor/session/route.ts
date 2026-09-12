import { cookies } from 'next/headers';
import { z } from 'zod';
import { EditorError, SESSION_COOKIE, editorFailure, privateJson, readBody, requireOwner, requireSameOrigin, supabaseRequest } from '@/lib/editor-server';

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
    const session = await result.json();
    await requireOwner(session.access_token);
    const response = privateJson({ owner: true });
    response.cookies.set(SESSION_COOKIE, session.access_token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/',
      maxAge: Math.min(Number(session.expires_in) || 3600, 3600),
    });
    return response;
  } catch (error) { return editorFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await supabaseRequest('/auth/v1/logout', token, { method: 'POST' }).catch(() => undefined);
    const response = privateJson({ owner: false });
    response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
    return response;
  } catch (error) { return editorFailure(error); }
}
