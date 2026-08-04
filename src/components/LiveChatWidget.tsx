import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createLiveChat,
  sendChatMessage,
  subscribeChatMessages,
  subscribeLiveChat,
  closeLiveChat,
  type ChatMessage,
  type LiveChat,
} from '../firebase/livechat';

const STORAGE_KEY = 'ticado_livechat_id';
const NAME_KEY = 'ticado_livechat_name';

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [chat, setChat] = useState<LiveChat | null>(null);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [email, setEmail] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [starting, setStarting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;
    return subscribeChatMessages(chatId, setMessages);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    return subscribeLiveChat(chatId, setChat);
  }, [chatId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const ended = chat?.status === 'uzavrety';

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStarting(true);
    try {
      const id = await createLiveChat(name.trim(), email.trim(), ticketCode.trim() || undefined);
      localStorage.setItem(STORAGE_KEY, id);
      localStorage.setItem(NAME_KEY, name.trim());
      setChatId(id);
      setChat(null);
      setMessages([]);
    } finally {
      setStarting(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !chatId || ended) return;
    const body = draft.trim();
    setDraft('');
    await sendChatMessage(chatId, { author: 'visitor', authorName: name || 'Návštevník', body });
  }

  async function handleEndChat() {
    if (!chatId) return;
    if (!window.confirm('Naozaj chcete ukončiť tento chat? Nebude sa dať v ňom pokračovať.')) return;
    await closeLiveChat(chatId);
  }

  function handleStartNew() {
    localStorage.removeItem(STORAGE_KEY);
    setChatId(null);
    setChat(null);
    setMessages([]);
    setTicketCode('');
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          fontSize: 22,
          boxShadow: 'var(--shadow-lg)',
          cursor: 'pointer',
          zIndex: 50,
        }}
        aria-label="Otvoriť live chat"
      >
        💬
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        width: 320,
        maxHeight: 440,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: '#2b1119',
          color: '#fff',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>💬 Live chat s podporou</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {chatId && !ended && (
            <button
              onClick={handleEndChat}
              title="Ukončiť chat"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Ukončiť chat
            </button>
          )}
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' }}>
            ×
          </button>
        </div>
      </div>

      {!chatId ? (
        <form onSubmit={handleStart} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            Zadajte svoje meno a email a môžeme začať.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vaše meno *"
            required
            style={chatInputStyle}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Emailová adresa *"
            required
            style={chatInputStyle}
          />
          <input
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            placeholder="Číslo ticketu, ak sa týka (nepovinné)"
            style={chatInputStyle}
          />
          <button
            type="submit"
            disabled={starting}
            style={{
              padding: '9px 0',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: 13,
              opacity: starting ? 0.7 : 1,
            }}
          >
            {starting ? 'Spúšťam…' : 'Začať chat'}
          </button>
        </form>
      ) : (
        <>
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>
                Napíšte správu a náš tím vám odpovie čo najskôr.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} style={{ alignSelf: m.author === 'visitor' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--color-text-faint)',
                    marginBottom: 2,
                    textAlign: m.author === 'visitor' ? 'right' : 'left',
                  }}
                >
                  {m.author === 'visitor' ? 'Vy' : m.authorName}
                </div>
                <div
                  style={{
                    background: m.author === 'visitor' ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: m.author === 'visitor' ? '#fff' : 'var(--color-text)',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12.5,
                  }}
                >
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          {ended ? (
            <div style={{ padding: 12, borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Tento chat bol ukončený.
              </div>
              <button
                onClick={handleStartNew}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
              >
                Začať nový chat
              </button>
            </div>
          ) : (
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--color-border)' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Napíšte správu…"
              style={{ ...chatInputStyle, flex: 1 }}
            />
            <button
              type="submit"
              style={{
                padding: '0 14px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              →
            </button>
          </form>
          )}
        </>
      )}
    </div>
  );
}

const chatInputStyle = {
  padding: '9px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontSize: 13,
} as const;
