'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

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

export default function GuestbookChat() {
  const t = useTranslations('guestbook');
  const locale = useLocale();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
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
      const res = await fetch('/api/guestbook');
      if (!res.ok) throw new Error();
      setMessages(await res.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    load();
  }, [configured, load]);

  const send = async () => {
    const name = nickname.trim();
    const text = content.trim();
    if (!name || !text || sending) return;
    setSending(true);
    setSendError(false);
    try {
      const res = await fetch('/api/guestbook', {
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

  const like = async (id: number) => {
    try {
      const res = await fetch(`/api/guestbook/${id}`, { method: 'POST' });
      if (!res.ok) return;
      const { likes } = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, likes } : m)));
    } catch {}
  };

  const remove = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/guestbook/${id}`, { method: 'DELETE' });
      if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {}
  };

  const pin = async (id: number, pinned: boolean) => {
    try {
      const res = await fetch(`/api/guestbook/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !pinned }),
      });
      if (res.ok) setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: !pinned } : m)));
    } catch {}
  };

  if (!configured) {
    return <p className="empty">{t('notConfigured')}</p>;
  }

  return (
    <div className="guestbook-chat">
      <form className="guestbook-chat__compose" onSubmit={(event) => { event.preventDefault(); void send(); }}>
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
            placeholder={t('contentPlaceholder')}
            maxLength={500}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label={t('contentPlaceholder')}
          />
          <button className="secondary-button" type="submit" disabled={sending || !nickname.trim() || !content.trim()}>{t('send')}</button>
        </div>
        {sendError && <p className="guestbook-chat__error" role="alert">{t('sendFailed')}</p>}
      </form>

      <div className="guestbook-chat__list" role="log" aria-live="polite">
        {loading && <p className="muted">{t('loading')}</p>}
        {error && (
          <div className="guestbook-chat__status">
            <p className="muted">{t('loadError')}</p>
            <button className="secondary-button" type="button" onClick={() => { setLoading(true); load(); }}>{t('retry')}</button>
          </div>
        )}
        {!loading && !error && messages.length === 0 && <p className="muted">{t('empty')}</p>}
        {!loading && !error && messages.map((m) => {
          const mine = m.mine;
          return (
            <div key={m.id} className={`guestbook-bubble${mine ? ' is-mine' : ''}${m.pinned ? ' is-pinned' : ''}`}>
              <button type="button" className="guestbook-bubble__body" onClick={() => router.push(`/guestbook/${m.id}` as never)} aria-label={`${t('thread')}: ${m.nickname} ${m.content}`}>
                <span className="guestbook-bubble__head">
                  <span className="guestbook-bubble__nick">{m.nickname}</span>
                  {m.pinned && <span className="guestbook-bubble__pin" title={t('pinned')}>📌</span>}
                  <span className="guestbook-bubble__time">{formatDate(m.created_at)}</span>
                </span>
                <span className="guestbook-bubble__content">{m.content}</span>
              </button>
              <div className="guestbook-bubble__actions">
                <button type="button" className="guestbook-bubble__action" onClick={() => like(m.id)} aria-label={`${t('like')} · ${m.likes ?? 0}`}>
                  ♥ {m.likes ?? 0}
                </button>
                {mine && (
                  <button type="button" className="guestbook-bubble__action" onClick={() => remove(m.id)} aria-label={t('delete')}>
                    {t('delete')}
                  </button>
                )}
                {mine && (
                  <button type="button" className="guestbook-bubble__action" onClick={() => pin(m.id, m.pinned)} aria-label={t('pin')}>
                    {m.pinned ? t('unpin') : t('pin')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
