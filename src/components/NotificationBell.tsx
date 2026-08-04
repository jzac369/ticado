import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeGlobalActivity } from '../firebase/tickets';
import { subscribeLiveChats, type LiveChat } from '../firebase/livechat';
import { subscribeGeneralSettings, DEFAULT_GENERAL_SETTINGS, type GeneralSettings } from '../firebase/generalSettings';
import { useAuth } from '../contexts/AuthContext';
import { playChatDing } from '../utils/chatSound';
import type { ActivityEntry } from '../types';

type FeedItem =
  | { kind: 'activity'; id: string; text: string; actor: string; createdAt: ActivityEntry['createdAt']; ticketId: string }
  | { kind: 'chat'; id: string; text: string; actor: string; createdAt: LiveChat['lastMessageAt'] };

function fmt(ts: ActivityEntry['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function NotificationBell() {
  const { profile } = useAuth();
  const isClient = profile?.role === 'klient';
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [chats, setChats] = useState<LiveChat[]>([]);
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const prevUnreadIds = useRef<Set<string>>(new Set());
  const firstRun = useRef(true);

  useEffect(() => subscribeGlobalActivity(setActivity, 10), []);
  useEffect(() => subscribeGeneralSettings(setSettings), []);
  useEffect(() => {
    if (isClient) return;
    return subscribeLiveChats(setChats);
  }, [isClient]);

  const unreadChats = chats.filter((c) => c.agentUnread);

  useEffect(() => {
    const currentIds = new Set(unreadChats.map((c) => c.id));
    if (!firstRun.current) {
      const hasNew = [...currentIds].some((id) => !prevUnreadIds.current.has(id));
      if (hasNew && settings.chatSoundEnabled) playChatDing();
    }
    firstRun.current = false;
    prevUnreadIds.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function requestPermission() {
    if (permission === 'unsupported' || permission === 'granted') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  const feed: FeedItem[] = [
    ...unreadChats.map(
      (c): FeedItem => ({
        kind: 'chat',
        id: c.id,
        text: `💬 Nová správa od ${c.visitorName}: ${c.lastMessagePreview || '…'}`,
        actor: c.visitorName,
        createdAt: c.lastMessageAt,
      }),
    ),
    ...activity.map(
      (a): FeedItem => ({ kind: 'activity', id: a.id, text: a.text, actor: a.actor, createdAt: a.createdAt, ticketId: a.ticketId }),
    ),
  ].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

  const hasNotifications = feed.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          border: 'none',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: 15,
          position: 'relative',
        }}
      >
        🔔
        {hasNotifications && (
          <span
            style={{
              position: 'absolute',
              top: 3,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--color-danger)',
            }}
          />
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            width: 320,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 30,
            color: 'var(--color-text)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 13 }}>
            Posledná aktivita
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {feed.length === 0 && (
              <div style={{ padding: 16, fontSize: 12.5, color: 'var(--color-text-faint)' }}>Žiadna aktivita.</div>
            )}
            {feed.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                onClick={() => {
                  setOpen(false);
                  navigate(item.kind === 'chat' ? '/livechat' : `/tickets/${item.ticketId}`);
                }}
                style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 12.5 }}
              >
                <div>{item.text}</div>
                <div style={{ color: 'var(--color-text-faint)', fontSize: 11 }}>
                  {item.actor} · {fmt(item.createdAt)}
                </div>
              </div>
            ))}
          </div>
          {permission !== 'unsupported' && permission !== 'granted' && (
            <button
              onClick={requestPermission}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔔 Povoliť upozornenia v prehliadači
            </button>
          )}
        </div>
      )}
    </div>
  );
}
