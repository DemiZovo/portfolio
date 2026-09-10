'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Message {
  id: number;
  nickname: string;
  content: string;
  mine: boolean;
  created_at: string;
  likes: number;
  pinned: boolean;
  parent_id: number | null;
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');

export default function GuestbookThread({ id }: { id: number }) {
  const t = useTranslations('guestbook');
  const locale = useLocale();
  const [root, setRoot] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  const configured = Boolean(supabaseUrl);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const load = useCallback(async () => {
    try {
      const [rootRes, replyRes] = await Promise.all([
        fetch(`/api/guestbook/${id}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/guestbook/${id}/replies`).then((r) => (r.ok ? r.json() : [])),
      ]);
      if (!rootRes) { setNotFound(true); return; }
      setRoot(rootRes);
      setReplies(replyRes);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!configured) { setLoading(false); setNotFound(true); return; }
    load();
  }, [configured, load]);

  const sendReply = async () => {
    const name = nickname.trim();
    const text = content.trim();
    if (!name || !text || sending) return;
    setSending(true);
    setSendError(false);
    try {
      const res = await fetch(`/api/guestbook/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name, content: text }),
      });
      if (!res.ok) throw new Error();
      setNickname('');
      setContent('');
      await load();
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  const like = async (messageId: number) => {
    try {
      const res = await fetch(`/api/guestbook/${messageId}`, { method: 'POST' });
      if (!res.ok) return;
      const { likes } = await res.json();
      setRoot((prev) => (prev?.id === messageId ? { ...prev, likes } : prev));
      setReplies((prev) => prev.map((m) => (m.id === messageId ? { ...m, likes } : m)));
    } catch {}
  };

  const renderBubble = (m: Message, mine: boolean, isReply: boolean) => (
    <div key={m.id} className={`guestbook-bubble${mine ? ' is-mine' : ''}${isReply ? ' is-reply' : ''}`}>
      <div className="guestbook-bubble__body">
        <span className="guestbook-bubble__head">
          <span className="guestbook-bubble__nick">{m.nickname}</span>
          {m.pinned && <span className="guestbook-bubble__pin" title={t('pinned')}>📌</span>}
          <span className="guestbook-bubble__time">{formatDate(m.created_at)}</span>
        </span>
        <span className="guestbook-bubble__content">{m.content}</span>
      </div>
      <div className="guestbook-bubble__actions">
        <button type="button" className="guestbook-bubble__action" onClick={() => like(m.id)} aria-label={`${t('like')} · ${m.likes ?? 0}`}>
          ♥ {m.likes ?? 0}
        </button>
      </div>
    </div>
  );

  if (loading) return <p className="muted">{t('loading')}</p>;
  if (notFound) return <p className="empty">{t('notFoundMessage')}</p>;
  if (error) return <p className="empty">{t('loadError')}</p>;

  return (
    <div className="guestbook-chat guestbook-thread">
      <p className="article-back"><Link href="/guestbook/">{t('backToGuestbook')}</Link></p>
      {root && renderBubble(root, root.mine, false)}

      <h2 className="guestbook-thread__replies">{t('replies')} · {replies.length}</h2>
      <div className="guestbook-chat__list">
        {replies.length === 0 && <p className="muted">{t('empty')}</p>}
        {replies.map((r) => renderBubble(r, r.mine, true))}
      </div>

      <form className="guestbook-chat__compose" onSubmit={(event) => { event.preventDefault(); void sendReply(); }}>
        <input
          className="guestbook-chat__nick"
          type="text"
          placeholder={t('nicknamePlaceholder')}
          maxLength={30}
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          aria-label={t('nicknamePlaceholder')}
        />
        <div className="guestbook-chat__row">
          <input
            className="guestbook-chat__input"
            type="text"
            placeholder={t('replyPlaceholder')}
            maxLength={500}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label={t('replyPlaceholder')}
          />
          <button className="secondary-button" type="submit" disabled={sending || !nickname.trim() || !content.trim()}>{t('send')}</button>
        </div>
        {sendError && <p className="guestbook-chat__error" role="alert">{t('sendFailed')}</p>}
      </form>
    </div>
  );
}
