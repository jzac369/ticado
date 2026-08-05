import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeLiveChats,
  subscribeChatMessages,
  sendChatMessage,
  closeLiveChat,
  closeInactiveChats,
  markChatRead,
  claimChat,
  transferChat,
  setTyping,
  linkChatToTicket,
  type LiveChat,
  type ChatMessage,
} from '../firebase/livechat';
import { subscribeGeneralSettings, DEFAULT_GENERAL_SETTINGS, type GeneralSettings } from '../firebase/generalSettings';
import { subscribeTicket, subscribeActivity, lookupTicketIdByCode, createTicket } from '../firebase/tickets';
import { subscribeTemplates, type ReplyTemplate } from '../firebase/templates';
import { subscribeAgents, type Agent } from '../firebase/agents';
import { uploadAttachments } from '../firebase/attachments';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { TicketTimeline } from '../components/TicketTimeline';
import { Icon } from '../components/Icon';
import type { Ticket, ActivityEntry } from '../types';

const TYPING_STALE_MS = 4000;

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
    return <div style={{ padding: 16, fontSize: 12.5, color: 'var(--color-text-faint)' }}>Načítavam tiket…</div>;
  }
  if (ticketId === null || !ticket) {
    return (
      <div style={{ padding: 16, fontSize: 12.5, color: 'var(--color-text-faint)' }}>
        Tiket {code} sa nenašiel.
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
            Otvoriť celý tiket →
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
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [draft, setDraft] = useState('');
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeLiveChats(setChats), []);
  useEffect(() => subscribeGeneralSettings(setSettings), []);
  useEffect(() => subscribeTemplates(setTemplates), []);
  useEffect(() => subscribeAgents(setAgents), []);
  useEffect(() => {
    if (!selected) return;
    return subscribeChatMessages(selected, setMessages);
  }, [selected]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  // Best-effort auto-close of chats nobody has touched in 15+ minutes -
  // only runs while an agent has this page open (no backend functions in
  // this project), checked every minute against the already-subscribed list.
  useEffect(() => {
    const id = setInterval(() => closeInactiveChats(chats), 60 * 1000);
    return () => clearInterval(id);
  }, [chats]);

  const active = useMemo(() => chats.find((c) => c.id === selected) ?? null, [chats, selected]);
  const visitorTypingRecently =
    Boolean(active?.visitorTyping) && now - (active?.visitorTypingAt?.toMillis() ?? 0) < TYPING_STALE_MS;

  function openChat(chatId: string) {
    setSelected(chatId);
    setShowTemplates(false);
    markChatRead(chatId);
  }

  const agentName = user?.email?.split('@')[0] ?? 'Technik';

  function handleDraftChange(value: string) {
    setDraft(value);
    if (!selected) return;
    setTyping(selected, 'agent', true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(selected, 'agent', false), 2000);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !selected || active?.status === 'uzavrety') return;
    const body = draft.trim();
    const internal = isInternalNote;
    setDraft('');
    setIsInternalNote(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    setTyping(selected, 'agent', false);
    await sendChatMessage(selected, {
      author: 'agent',
      authorName: agentName,
      body,
      internal,
      isFirstAgentReply: !internal && !active?.firstAgentReplyAt,
    });
  }

  function insertTemplate(t: ReplyTemplate) {
    setDraft((d) => (d ? `${d}\n${t.body}` : t.body));
    setShowTemplates(false);
  }

  async function handleFilePick(files: FileList | null) {
    if (!files || files.length === 0 || !selected) return;
    setSending(true);
    try {
      const attachments = await uploadAttachments(`livechat-${selected}`, Array.from(files));
      await sendChatMessage(selected, { author: 'agent', authorName: agentName, body: '', attachments });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Nahrávanie súboru zlyhalo.');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleClaim() {
    if (!active) return;
    await claimChat(active.id, agentName);
  }

  async function handleTransfer(toAgentName: string) {
    if (!active || !toAgentName) return;
    await transferChat(active.id, active.claimedBy || agentName, toAgentName);
    setShowTransfer(false);
  }

  async function handleEndChat() {
    if (!active) return;
    if (!window.confirm('Naozaj chcete ukončiť tento chat? Nebude sa dať v ňom pokračovať.')) return;
    await closeLiveChat(active.id);
  }

  async function handleConvertToTicket() {
    if (!active) return;
    const subject = window.prompt('Predmet nového tiketu:', `Live chat - ${active.visitorName}`);
    if (!subject || !subject.trim()) return;
    const transcript = messages.map((m) => `${m.authorName}: ${m.body || '[príloha]'}`).join('\n');
    const { code } = await createTicket({
      subject: subject.trim(),
      description: transcript,
      customerId: 'neznamy',
      customerName: 'Neznámy zákazník',
      requesterName: active.visitorName,
      requesterEmail: active.visitorEmail,
      category: 'Iné',
      priority: 'normalna',
      channel: 'web',
    });
    await linkChatToTicket(active.id, code);
  }

  const chatPanel = (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!active ? (
        <div style={{ margin: 'auto', color: 'var(--color-text-faint)', fontSize: 13 }}>Vyberte konverzáciu vľavo.</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{active.visitorName}</div>
              {active.visitorEmail && <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{active.visitorEmail}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {active.offline && <Tag tone="warning">Odkaz mimo hodín</Tag>}
                {active.claimedBy && <Tag tone="primary">Prevzal: {active.claimedBy}</Tag>}
                {active.convertedTicketCode && <Tag tone="success">Prevedené: {active.convertedTicketCode}</Tag>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', position: 'relative' }}>
              {!active.claimedBy && active.status === 'otvoreny' && (
                <button onClick={handleClaim} style={smallBtn}>
                  Prevziať
                </button>
              )}
              {active.claimedBy && active.status === 'otvoreny' && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowTransfer((v) => !v)} style={smallBtn}>
                    Presmerovať ▾
                  </button>
                  {showTransfer && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '110%',
                        right: 0,
                        minWidth: 160,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                        zIndex: 20,
                        overflow: 'hidden',
                      }}
                    >
                      {agents.filter((a) => a.name !== active.claimedBy).length === 0 && (
                        <div style={{ padding: 10, fontSize: 11.5, color: 'var(--color-text-faint)' }}>Žiadni iní technici.</div>
                      )}
                      {agents
                        .filter((a) => a.name !== active.claimedBy)
                        .map((a) => (
                          <button
                            key={a.id}
                            onClick={() => handleTransfer(a.name)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5 }}
                          >
                            {a.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
              {!active.convertedTicketCode && (
                <button onClick={handleConvertToTicket} style={smallBtn}>
                  Previesť na tiket
                </button>
              )}
              {active.status === 'otvoreny' && (
                <button onClick={handleEndChat} style={smallBtn}>
                  Ukončiť chat
                </button>
              )}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ alignSelf: m.internal ? 'stretch' : m.author === 'agent' ? 'flex-end' : 'flex-start', maxWidth: m.internal ? '100%' : '70%' }}>
                {m.author !== 'system' && !m.internal && (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'var(--color-text-faint)',
                      marginBottom: 2,
                      textAlign: m.author === 'agent' ? 'right' : 'left',
                    }}
                  >
                    {m.author === 'agent' ? (m.authorName === agentName ? 'Vy' : m.authorName) : m.authorName}
                  </div>
                )}
                <div
                  style={{
                    background: m.internal
                      ? 'var(--color-warning-bg)'
                      : m.author === 'agent'
                        ? 'var(--color-primary)'
                        : m.author === 'system'
                          ? 'transparent'
                          : 'var(--color-surface-2)',
                    color: m.internal ? 'var(--color-warning)' : m.author === 'agent' ? '#fff' : m.author === 'system' ? 'var(--color-text-faint)' : 'var(--color-text)',
                    padding: m.author === 'system' ? '2px 0' : '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    fontStyle: m.author === 'system' ? 'italic' : 'normal',
                    border: m.internal ? '1px dashed var(--color-warning)' : undefined,
                  }}
                >
                  {m.internal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, marginBottom: 3 }}>
                      <Icon name="lock" size={10} /> Interná poznámka · {m.authorName}
                    </div>
                  )}
                  {m.body}
                  {m.attachments?.map((a) => (
                    <a
                      key={a.url}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: m.body ? 6 : 0, fontSize: 11.5, color: 'inherit', textDecoration: 'underline' }}
                    >
                      <Icon name="paperclip" size={11} /> {a.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
            {visitorTypingRecently && (
              <div style={{ alignSelf: 'flex-start', fontSize: 11, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                {active.visitorName} píše…
              </div>
            )}
          </div>
          {active.status === 'uzavrety' ? (
            <div style={{ padding: 14, borderTop: '1px solid var(--color-border)', textAlign: 'center', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              Tento chat bol ukončený. Návštevník musí na pokračovanie začať nový chat.
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--color-border)', position: 'relative' }}>
              {showTemplates && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 12,
                    right: 12,
                    maxHeight: 220,
                    overflowY: 'auto',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                    marginBottom: 6,
                  }}
                >
                  {templates.length === 0 && (
                    <div style={{ padding: 12, fontSize: 12, color: 'var(--color-text-faint)' }}>Žiadne šablóny.</div>
                  )}
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => insertTemplate(t)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleSend} style={{ padding: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11.5, fontWeight: 600, color: isInternalNote ? 'var(--color-warning)' : 'var(--color-text-muted)', cursor: 'pointer', width: 'fit-content' }}>
                  <input type="checkbox" checked={isInternalNote} onChange={(e) => setIsInternalNote(e.target.checked)} />
                  <Icon name="lock" size={11} /> Interná poznámka (nevidí návštevník)
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFilePick(e.target.files)} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} title="Priložiť súbor" style={iconBtn}>
                    <Icon name="paperclip" size={14} />
                  </button>
                  <button type="button" onClick={() => setShowTemplates((v) => !v)} title="Šablóny odpovedí" style={iconBtn}>
                    <Icon name="list" size={14} />
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder={isInternalNote ? 'Interná poznámka pre tím…' : 'Napíšte odpoveď…'}
                    style={{ flex: 1, padding: '9px 12px', border: `1px solid ${isInternalNote ? 'var(--color-warning)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '0 18px', background: isInternalNote ? 'var(--color-warning)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                  >
                    Odoslať
                  </button>
                </div>
              </form>
            </div>
          )}
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
            Konverzácie z live chatu na verejnej podpornej stránke. Ak návštevník uviedol číslo tiketu, zobrazí sa
            spolu s jeho záznamom vedľa chatu.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: settings.liveChatEnabled ? 'var(--color-success-bg)' : 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 600,
            color: settings.liveChatEnabled ? 'var(--color-success)' : 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
          Live chat je {settings.liveChatEnabled ? 'zapnutý' : 'vypnutý'} (Nastavenia → Podporná stránka)
        </div>
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
                background: selected === c.id ? 'var(--color-primary-bg)' : c.agentUnread ? 'var(--color-warning-bg)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: c.agentUnread ? 800 : 700, fontSize: 13 }}>
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
              <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                {c.ticketCode && <Tag tone="primary">{c.ticketCode}</Tag>}
                {c.offline && <Tag tone="warning">mimo hodín</Tag>}
                {c.claimedBy && <Tag tone="muted">{c.claimedBy}</Tag>}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--color-text-muted)',
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontWeight: c.agentUnread ? 700 : 400,
                }}
              >
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

function Tag({ tone, children }: { tone: 'primary' | 'warning' | 'success' | 'muted'; children: React.ReactNode }) {
  const colors =
    tone === 'primary'
      ? { fg: 'var(--color-primary)', bg: 'var(--color-primary-bg)' }
      : tone === 'warning'
        ? { fg: 'var(--color-warning)', bg: 'var(--color-warning-bg)' }
        : tone === 'success'
          ? { fg: 'var(--color-success)', bg: 'var(--color-success-bg)' }
          : { fg: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' };
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 999,
        color: colors.fg,
        background: colors.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

const smallBtn = {
  padding: '5px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
} as const;

const iconBtn = {
  padding: '0 10px',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
} as const;
