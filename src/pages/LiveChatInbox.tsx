import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeLiveChats, subscribeChatMessages, sendChatMessage, closeLiveChat, markChatRead, type LiveChat, type ChatMessage } from '../firebase/livechat';
import { subscribeGeneralSettings, updateGeneralSettings, DEFAULT_GENERAL_SETTINGS, type GeneralSettings } from '../firebase/generalSettings';
import { subscribeTicket, subscribeActivity, lookupTicketIdByCode } from '../firebase/tickets';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { TicketTimeline } from '../components/TicketTimeline';
import type { Ticket, ActivityEntry } from '../types';

function fmt(ts: LiveChat['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function LinkedTicketPanel({ code }: { code: string }) {
  const navigate = useNavigate();
  const [ticketId, setTicketId] = useState<string | null | undefined>(undefined);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    setTicketId(undefined);
    lookupTicketIdByCode(code).then((id) => {
      if (!cancelled) setTicketId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!ticketId) return;
    return subscribeTicket(ticketId, setTicket);
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    return subscribeActivity(ticketId, setActivity);
  }, [ticketId]);

  if (ticketId === undefined) {
    return <div style={{ padding: 16, fontSize: 12.5, color: 'var(--color-text-faint)' }}>Načítavam ticket…</div>;
  }
  if (ticketId === null || !ticket) {
    return (
      <div style={{ padding: 16, fontSize: 12.5, color: 'var(--color-text-faint)' }}>
        Ticket {code} sa nenašiel.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 13 }}>{ticket.code}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{ticket.subject}</div>
          </div>
          <button
            onClick={() => navigate(`/tickets/${ticketId}`)}
            style={{ padding: '5px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Otvoriť celý ticket →
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 8 }}>
          {ticket.customerName} · {ticket.requesterName}
          {ticket.assignedTo && <> · priradené: {ticket.assignedTo}</>}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <TicketTimeline entries={activity} />
      </div>
    </div>
  );
}

export function LiveChatInboxPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<LiveChat[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  useEffect(() => subscribeLiveChats(setChats), []);
  useEffect(() => subscribeGeneralSettings(setSettings), []);
  useEffect(() => {
    if (!selected) return;
    return subscribeChatMessages(selected, setMessages);
  }, [selected]);

  const active = useMemo(() => chats.find((c) => c.id === selected) ?? null, [chats, selected]);

  function openChat(chatId: string) {
    setSelected(chatId);
    markChatRead(chatId);
  }

  async function toggleLiveChat() {
    await updateGeneralSettings({ ...settings, liveChatEnabled: !settings.liveChatEnabled });
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !selected) return;
    const body = draft.trim();
    setDraft('');
    await sendChatMessage(selected, { author: 'agent', authorName: user?.email?.split('@')[0] ?? 'Technik', body });
  }

  const chatPanel = (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!active ? (
        <div style={{ margin: 'auto', color: 'var(--color-text-faint)', fontSize: 13 }}>Vyberte konverzáciu vľavo.</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{active.visitorName}</div>
              {active.visitorEmail && <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{active.visitorEmail}</div>}
            </div>
            {active.status === 'otvoreny' && (
              <button
                onClick={() => closeLiveChat(active.id)}
                style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Uzavrieť konverzáciu
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.author === 'agent' ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  background: m.author === 'agent' ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: m.author === 'agent' ? '#fff' : 'var(--color-text)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                }}
              >
                {m.body}
              </div>
            ))}
          </div>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--color-border)' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Napíšte odpoveď…"
              style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
            />
            <button
              type="submit"
              style={{ padding: '0 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
            >
              Odoslať
            </button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Live chat</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13.5 }}>
            Konverzácie z live chatu na verejnej podpornej stránke. Ak návštevník uviedol číslo ticketu, zobrazí sa
            spolu s jeho záznamom vedľa chatu.
          </p>
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <input type="checkbox" checked={settings.liveChatEnabled} onChange={toggleLiveChat} />
          Live chat je {settings.liveChatEnabled ? 'zapnutý' : 'vypnutý'} pre klientov
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: active?.ticketCode ? '260px 1fr 1fr' : '280px 1fr',
          gap: 14,
          height: 560,
        }}
      >
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflowY: 'auto' }}>
          {chats.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--color-text-faint)' }}>
              Zatiaľ žiadne konverzácie.
            </div>
          )}
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => openChat(c.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                background: selected === c.id ? 'var(--color-primary-bg)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                  {c.agentUnread && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-danger)', flexShrink: 0 }} />
                  )}
                  {c.visitorName}
                </span>
                {c.status === 'otvoreny' ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)' }}>● aktívny</span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)' }}>uzavretý</span>
                )}
              </div>
              {c.ticketCode && (
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-primary)', marginTop: 3 }}>🎫 {c.ticketCode}</div>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.lastMessagePreview || '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', marginTop: 2 }}>{fmt(c.createdAt)}</div>
            </button>
          ))}
        </div>

        {active?.ticketCode && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <LinkedTicketPanel code={active.ticketCode} />
          </div>
        )}

        {chatPanel}
      </div>
    </div>
  );
}
