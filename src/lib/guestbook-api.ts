/**
 * 群聊留言板的后端代理：所有写操作（点赞/删除/置顶/发布）都经此用 service role 执行，
 * 规避 RLS 匿名限制；发布时记录访问者 IP 用于左右气泡判定与本人删除校验。
 */

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const table = 'guestbook_messages';

export interface GuestbookMessage {
  id: number;
  nickname: string;
  content: string;
  ip: string;
  created_at: string;
  likes: number;
  pinned: boolean;
  parent_id: number | null;
}

export type PublicGuestbookMessage = Omit<GuestbookMessage, 'ip'> & { mine: boolean };

export function publicMessage(message: GuestbookMessage, viewerIp: string): PublicGuestbookMessage {
  const { ip, ...safe } = message;
  return { ...safe, mine: ip === viewerIp };
}

const TABLE_SELECT = 'id,nickname,content,ip,created_at,likes,pinned,parent_id';

/** 从 Vercel 请求头取客户端 IP。 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** 是否管理员（站长固定 IP）。 */
export function isAdmin(ip: string): boolean {
  return Boolean(process.env.ALLOWED_GUESTBOOK_IP) && ip === process.env.ALLOWED_GUESTBOOK_IP;
}

function authHeaders() {
  return {
    apikey: serviceKey,
    ...(serviceKey.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${serviceKey}` }),
    'Content-Type': 'application/json',
  };
}

export async function listMessages(parentId: number | null = null): Promise<GuestbookMessage[]> {
  if (!serviceKey) return [];
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set('select', TABLE_SELECT);
  if (parentId === null) url.searchParams.set('parent_id', 'is.null');
  else url.searchParams.set('parent_id', `eq.${parentId}`);
  url.searchParams.set('order', 'pinned.desc,created_at.desc');
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return res.json();
}

export async function getMessage(id: number): Promise<GuestbookMessage | null> {
  if (!serviceKey) return null;
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set('select', TABLE_SELECT);
  url.searchParams.set('id', `eq.${id}`);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) return null;
  const rows: GuestbookMessage[] = await res.json();
  return rows[0] ?? null;
}

export async function insertMessage(nickname: string, content: string, ip: string, parentId: number | null = null): Promise<GuestbookMessage | null> {
  if (!serviceKey) return null;
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...authHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify({ nickname, content, ip, parent_id: parentId, likes: 0, pinned: false }),
  });
  if (!res.ok) throw new Error(`insert failed: ${res.status}`);
  const rows: GuestbookMessage[] = await res.json();
  return rows[0] ?? null;
}

export async function updateMessage(id: number, patch: Record<string, unknown>): Promise<boolean> {
  if (!serviceKey) return false;
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  return res.ok;
}

export async function deleteMessage(id: number): Promise<boolean> {
  if (!serviceKey) return false;
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.ok;
}

/** 某个根留言的回复列表（按时间正序，thread 展示）。 */
export async function listReplies(messageId: number): Promise<GuestbookMessage[]> {
  if (!serviceKey) return [];
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set('select', TABLE_SELECT);
  url.searchParams.set('parent_id', `eq.${messageId}`);
  url.searchParams.set('order', 'created_at.asc');
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`list replies failed: ${res.status}`);
  return res.json();
}

/** 发布回复。 */
export async function insertReply(messageId: number, nickname: string, content: string, ip: string): Promise<GuestbookMessage | null> {
  return insertMessage(nickname, content, ip, messageId);
}
