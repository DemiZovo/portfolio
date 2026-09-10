import { NextResponse } from 'next/server';
import { clientIp, deleteMessage, getMessage, isAdmin, publicMessage, updateMessage } from '@/lib/guestbook-api';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

/** 单条留言详情（GET）。 */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const message = await getMessage(Number(id));
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(publicMessage(message, clientIp(request)));
}

/** 点赞 +1（POST）。 */
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const message = await getMessage(Number(id));
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const likes = (message.likes ?? 0) + 1;
  const ok = await updateMessage(message.id, { likes });
  return ok ? NextResponse.json({ likes }) : NextResponse.json({ error: 'update failed' }, { status: 500 });
}

/** 删除留言（本人 IP 或管理员）。 */
export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const message = await getMessage(Number(id));
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const ip = clientIp(request);
  if (!isAdmin(ip) && message.ip !== ip) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const ok = await deleteMessage(message.id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'delete failed' }, { status: 500 });
}

/** 置顶/取消置顶（仅管理员）。 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const ip = clientIp(request);
  if (!isAdmin(ip)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const message = await getMessage(Number(id));
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { pinned } = await request.json().catch(() => ({ pinned: !message.pinned }));
  const ok = await updateMessage(message.id, { pinned: Boolean(pinned) });
  return ok ? NextResponse.json({ pinned: Boolean(pinned) }) : NextResponse.json({ error: 'update failed' }, { status: 500 });
}
