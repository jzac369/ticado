import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  createLiveChat,
  sendChatMessage,
  subscribeChatMessages,
  subscribeLiveChat,
  closeLiveChat,
  markChatReadByVisitor,
  setTyping,
  type ChatMessage,
  type LiveChat,
} from '../firebase/livechat';
import { uploadAttachments } from '../firebase/attachments';
import { subscribeGeneralSettings, isSupportOpenNow, DEFAULT_GENERAL_SETTINGS, type GeneralSettings } from '../firebase/generalSettings';
import { Icon } from './Icon';

const STORAGE_KEY = 'ticado_livechat_id';
const NAME_KEY = 'ticado_livechat_name';
const TYPING_STALE_MS = 4000;
const INACTIVITY_NUDGE_MS = 5 * 60 * 1000;

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
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeGeneralSettings(setSettings), []);
  const isOpenNow = isSupportOpenNow(settings);

  useEffect(() => {
    if (!chatId) return;
    return subscribeChatMessages(chatId, setMessages);
  }, [chatId]);
  const visibleMessages = messages.filter((m) => !m.internal);

  useEffect(() => {
    if (!chatId) return;
    return subscribeLiveChat(chatId, setChat);
  }, [chatId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  // Re-render periodically so the typing indicator and inactivity nudge age
  // out on their own without needing a fresh Firestore write to trigger it.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (open && chat?.visitorUnread && chatId) markChatReadByVisitor(chatId);
  }, [open, chat?.visitorUnread, chatId]);

  useEffect(() => {
    if (open) panelRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [open]);

  const ended = chat?.status === 'uzavrety';
  const agentTypingRecently =
    Boolean(chat?.agentTyping) && now - (chat?.agentTypingAt?.toMillis() ?? 0) < TYPING_STALE_MS;
  const waitingTooLong =
    !ended &&
    chatId !== null &&
    chat?.lastMessageAuthor !== 'agent' &&
    now - (chat?.lastMessageAt?.toMillis() ?? now) > INACTIVITY_NUDGE_MS;

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStarting(true);
    try {
      const id = await createLiveChat(name.trim(), email.trim(), ticketCode.trim() || undefined, !isOpenNow);
      localStorage.setItem(STORAGE_KEY, id);
      localStorage.setItem(NAME_KEY, name.trim());
      setChatId(id);
      setChat(null);
      setMessages([]);
    } finally {
      setStarting(false);
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    if (!chatId) return;
    setTyping(chatId, 'visitor', true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(chatId, 'visitor', false), 2000);
  }

  async function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !chatId) return;
    setSending(true);
    try {
      const attachments = await uploadAttachments(`livechat-${chatId}`, Array.from(files));
      await sendChatMessage(chatId, { author: 'visitor', authorName: name || 'Návštevník', body: '', attachments });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Nahrávanie súboru zlyhalo.');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !chatId || ended) return;
    const body = draft.trim();
    setDraft('');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    setTyping(chatId, 'visitor', false);
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
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 18px',
          borderRadius: 999,
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          fontSize: 13,
          fontWeight: 700,
          boxShadow: 'var(--shadow-lg)',
          cursor: 'pointer',
          zIndex: 50,
        }}
        aria-label="Otvoriť live chat"
      >
        <Icon name="message" size={16} />
        Live Chat
        {chat?.visitorUnread && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 0 0 2px var(--color-primary)',
            }}
          />
        )}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{
        width: '100%',
        maxHeight: 480,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13.5 }}>
          <Icon name="message" size={14} /> Live chat s podporou
        </div>
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
          {!isOpenNow && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '9px 11px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Icon name="clock" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Sme mimo prevádzkových hodín. Nechajte nám odkaz, ozveme sa vám emailom, hneď ako to bude možné.
            </div>
          )}
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            {isOpenNow ? 'Zadajte svoje meno a email a môžeme začať.' : 'Zadajte svoje meno, email a odkaz nižšie.'}
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
            placeholder="Číslo tiketu, ak sa týka (nepovinné)"
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
            {starting ? 'Spúšťam…' : isOpenNow ? 'Začať chat' : 'Odoslať odkaz'}
          </button>
        </form>
      ) : (
        <>
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
            {visibleMessages.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>
                Napíšte správu a náš tím vám odpovie čo najskôr.
              </div>
            )}
            {visibleMessages.map((m) => (
              <div key={m.id} style={{ alignSelf: m.author === 'visitor' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                {m.author !== 'system' && (
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
                )}
                <div
                  style={{
                    background: m.author === 'visitor' ? 'var(--color-primary)' : m.author === 'system' ? 'transparent' : 'var(--color-surface-2)',
                    color: m.author === 'visitor' ? '#fff' : m.author === 'system' ? 'var(--color-text-faint)' : 'var(--color-text)',
                    padding: m.author === 'system' ? '2px 0' : '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: m.author === 'system' ? 11.5 : 12.5,
                    fontStyle: m.author === 'system' ? 'italic' : 'normal',
                  }}
                >
                  {m.body}
                  {m.attachments?.map((a) => (
                    <a
                      key={a.url}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        marginTop: m.body ? 6 : 0,
                        fontSize: 11.5,
                        color: 'inherit',
                        textDecoration: 'underline',
                      }}
                    >
                      <Icon name="paperclip" size={11} /> {a.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
            {agentTypingRecently && (
              <div style={{ alignSelf: 'flex-start', fontSize: 11, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                {chat?.claimedBy || 'Podpora'} píše…
              </div>
            )}
            {waitingTooLong && (
              <div
                style={{
                  alignSelf: 'center',
                  fontSize: 11,
                  color: 'var(--color-text-faint)',
                  textAlign: 'center',
                  padding: '6px 10px',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Ospravedlňujeme sa za čakanie, sme tu a čoskoro odpovieme. Ak potrebujete, môžete medzitým nahlásiť
                problém aj cez formulár vyššie.
              </div>
            )}
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
              <input ref={fileInputRef} type="file" multiple onChange={handleFilePick} style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Priložiť súbor"
                style={{
                  padding: '0 10px',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <Icon name="paperclip" size={14} />
              </button>
              <input
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
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
