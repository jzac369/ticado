import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeMyMessages, sendInternalMessage, markMessageRead, type InternalMessage } from '../firebase/messages';
import { subscribeAgents, type Agent } from '../firebase/agents';
import { lookupTicketIdByCode } from '../firebase/tickets';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/Icon';

function fmt(ts: InternalMessage['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myEmail = user?.email?.toLowerCase() ?? '';
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [composeTo, setComposeTo] = useState('');
  const [draft, setDraft] = useState('');
  const [attachCode, setAttachCode] = useState('');
  const [attached, setAttached] = useState<{ code: string; id: string } | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => subscribeAgents(setAgents), []);
  useEffect(() => {
    if (!myEmail) return;
    return subscribeMyMessages(myEmail, setMessages);
  }, [myEmail]);

  const myName = useMemo(
    () => agents.find((a) => a.email?.toLowerCase() === myEmail)?.name ?? user?.email?.split('@')[0] ?? 'Ja',
    [agents, myEmail, user],
  );

  const conversations = useMemo(() => {
    const map = new Map<string, { partnerEmail: string; partnerName: string; messages: InternalMessage[]; unread: number }>();
    messages.forEach((m) => {
      const partnerEmail = m.fromEmail === myEmail ? m.toEmail : m.fromEmail;
      const partnerName = m.fromEmail === myEmail ? m.toName : m.fromName;
      if (!map.has(partnerEmail)) map.set(partnerEmail, { partnerEmail, partnerName, messages: [], unread: 0 });
      const entry = map.get(partnerEmail)!;
      entry.messages.push(m);
      if (m.toEmail === myEmail && !m.read) entry.unread += 1;
    });
    return [...map.values()].sort(
      (a, b) => (b.messages[0]?.createdAt?.toMillis() ?? 0) - (a.messages[0]?.createdAt?.toMillis() ?? 0),
    );
  }, [messages, myEmail]);

  const activeConversation = conversations.find((c) => c.partnerEmail === selectedPartner) ?? null;
  const thread = activeConversation ? [...activeConversation.messages].reverse() : [];

  const otherAgents = agents.filter((a) => a.email && a.email.toLowerCase() !== myEmail && a.active !== false);

  function openConversation(partnerEmail: string) {
    setSelectedPartner(partnerEmail);
    const conv = conversations.find((c) => c.partnerEmail === partnerEmail);
    conv?.messages.filter((m) => m.toEmail === myEmail && !m.read).forEach((m) => markMessageRead(m.id));
  }

  async function handleAttachTicket() {
    if (!attachCode.trim()) return;
    setAttaching(true);
    setAttachError(null);
    try {
      const id = await lookupTicketIdByCode(attachCode.trim());
      if (!id) {
        setAttachError('Tiket sa nenašiel.');
        return;
      }
      setAttached({ code: attachCode.trim().toUpperCase(), id });
      setAttachCode('');
    } finally {
      setAttaching(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const toEmail = selectedPartner ?? composeTo;
    if (!draft.trim() || !toEmail) return;
    const toAgent = agents.find((a) => a.email?.toLowerCase() === toEmail);
    await sendInternalMessage({
      fromEmail: myEmail,
      fromName: myName,
      toEmail,
      toName: toAgent?.name ?? toEmail,
      body: draft.trim(),
      ticketCode: attached?.code,
      ticketId: attached?.id,
    });
    setDraft('');
    setAttached(null);
    setComposeTo('');
    setSelectedPartner(toEmail);
  }

  const composing = selectedPartner === null;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Správy</h1>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13.5 }}>
          Interné správy medzi technikmi, s možnosťou pripojiť konkrétny tiket.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, height: 560 }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => setSelectedPartner(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 14px',
              background: composing ? 'var(--color-primary-bg)' : 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--color-border)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--color-primary)',
            }}
          >
            <Icon name="plus" size={14} /> Nová správa
          </button>
          {conversations.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--color-text-faint)' }}>Zatiaľ žiadne správy.</div>
          )}
          {conversations.map((c) => (
            <button
              key={c.partnerEmail}
              onClick={() => openConversation(c.partnerEmail)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                background: selectedPartner === c.partnerEmail ? 'var(--color-primary-bg)' : c.unread > 0 ? 'var(--color-warning-bg)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: c.unread > 0 ? 800 : 700, fontSize: 13 }}>{c.partnerName}</span>
                {c.unread > 0 && (
                  <span
                    style={{
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 999,
                      background: 'var(--color-danger)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {c.unread}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.messages[0]?.body || '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', marginTop: 2 }}>{fmt(c.messages[0]?.createdAt)}</div>
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {composing && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Komu</div>
              <select
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
              >
                <option value="">— Vybrať technika —</option>
                {otherAgents.map((a) => (
                  <option key={a.id} value={a.email?.toLowerCase()}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!composing && activeConversation && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14 }}>
              {activeConversation.partnerName}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {composing && thread.length === 0 && (
              <div style={{ margin: 'auto', color: 'var(--color-text-faint)', fontSize: 13 }}>Vyberte technika a napíšte správu.</div>
            )}
            {thread.map((m) => (
              <div key={m.id} style={{ alignSelf: m.fromEmail === myEmail ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', marginBottom: 2, textAlign: m.fromEmail === myEmail ? 'right' : 'left' }}>
                  {m.fromEmail === myEmail ? 'Vy' : m.fromName} · {fmt(m.createdAt)}
                </div>
                <div
                  style={{
                    background: m.fromEmail === myEmail ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: m.fromEmail === myEmail ? '#fff' : 'var(--color-text)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                  }}
                >
                  {m.body}
                  {m.ticketCode && (
                    <div
                      onClick={() => navigate(`/tickets/${m.ticketId}`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        marginTop: 6,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: m.fromEmail === myEmail ? 'rgba(255,255,255,0.2)' : 'var(--color-primary-bg)',
                        color: m.fromEmail === myEmail ? '#fff' : 'var(--color-primary)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Icon name="ticket" size={11} /> {m.ticketCode}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} style={{ borderTop: '1px solid var(--color-border)', padding: 12 }}>
            {attached ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11.5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: 700 }}>
                  <Icon name="ticket" size={11} /> {attached.code}
                </span>
                <button type="button" onClick={() => setAttached(null)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 700 }}>
                  ×
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  value={attachCode}
                  onChange={(e) => setAttachCode(e.target.value)}
                  placeholder="Číslo tiketu na priloženie (napr. TIK000123)"
                  style={{ flex: 1, padding: '6px 9px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 11.5 }}
                />
                <button type="button" onClick={handleAttachTicket} disabled={attaching} style={{ padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                  <Icon name="ticket" size={12} />
                </button>
              </div>
            )}
            {attachError && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginBottom: 6 }}>{attachError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Napíšte správu…"
                style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
              />
              <button
                type="submit"
                disabled={composing && !composeTo}
                style={{ padding: '0 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, opacity: composing && !composeTo ? 0.6 : 1 }}
              >
                Odoslať
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
