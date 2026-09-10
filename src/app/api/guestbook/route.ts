import { NextResponse } from 'next/server';
import { clientIp, insertMessage, listMessages, publicMessage } from '@/lib/guestbook-api';

export const dynamic = 'force-dynamic';

/** 留言板根留言列表（GET）。 */
export async function GET(request: Request) {
  try {
    const messages = await listMessages(null);
    const ip = clientIp(request);
    return NextResponse.json(messages.map((message) => publicMessage(message, ip)));
  } catch {
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}

/** 发布根留言（POST）。 */
export async function POST(request: Request) {
  const { nickname, content } = await request.json().catch(() => ({ nickname: '', content: '' }));
  const name = String(nickname ?? '').trim().slice(0, 30);
  const text = String(content ?? '').trim().slice(0, 500);
  if (!name || !text) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const message = await insertMessage(name, text, ip, null);
    return NextResponse.json(message ? publicMessage(message, ip) : null, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }
}
