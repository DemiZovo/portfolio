import { NextResponse } from 'next/server';
import { clientIp, getMessage, insertReply, listReplies, publicMessage } from '@/lib/guestbook-api';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

/** 讨论页回复列表。 */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const message = await getMessage(Number(id));
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });
  try {
    const replies = await listReplies(Number(id));
    const ip = clientIp(request);
    return NextResponse.json(replies.map((reply) => publicMessage(reply, ip)));
  } catch {
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}

/** 发布回复。 */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const message = await getMessage(Number(id));
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { nickname, content } = await request.json().catch(() => ({ nickname: '', content: '' }));
  const name = String(nickname ?? '').trim().slice(0, 30);
  const text = String(content ?? '').trim().slice(0, 500);
  if (!name || !text) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const ip = clientIp(request);
  try {
    const reply = await insertReply(Number(id), name, text, ip);
    return NextResponse.json(reply ? publicMessage(reply, ip) : null, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }
}
