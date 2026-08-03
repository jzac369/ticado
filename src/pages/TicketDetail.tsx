import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addTicketMessage,
  isSlaBreached,
  subscribeActivity,
  subscribeMessages,
  subscribeTicket,
  updateTicketAssignment,
  updateTicketStatus,
} from '../firebase/tickets';
import type { ActivityEntry, Ticket, TicketMessage, TicketStatus } from '../types';
import { STATUS_LABELS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PriorityBadge, StatusBadge, SlaBadge } from '../components/Badges';

function fmt(ts: TicketMessage['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null | undefined>(undefined);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [reply, setReply] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const u1 = subscribeTicket(id, setTicket);
    const u2 = subscribeMessages(id, setMessages);
    const u3 = subscribeActivity(id, setActivity);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [id]);

  if (ticket === undefined) {
    return <div>Načítavam ticket…</div>;
  }
  if (ticket === null || !id) {
    return <div>Ticket nebol nájdený. <Link to="/tickets">Späť na tickety</Link></div>;
  }

  const actorName = user?.email ?? 'Agent';

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !id) return;
    setSending(true);
    try {
      await addTicketMessage(id, {
        authorName: actorName,
        body: reply.trim(),
        isPrivate,
      });
      setReply('');
      setIsPrivate(false);
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    if (!id) return;
    await updateTicketStatus(id, status, actorName);
  }

  async function handleAssign(value: string) {
    if (!id) return;
    await updateTicketAssignment(id, value || null, actorName);
  }

  const closed = ticket.status === 'uzavrety';

  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 12 }}>
        <Link to="/tickets" style={{ color: 'var(--color-text-muted)' }}>
          Tickety
        </Link>{' '}
        / <span style={{ fontWeight: 700 }}>{ticket.code}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        {isSlaBreached(ticket) && <SlaBadge breached />}
      </div>

      <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>{ticket.subject}</h1>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Vytvorený {fmt(ticket.createdAt)} · {ticket.customerName} · {ticket.requesterName}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Komunikácia</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', marginBottom: 16 }}>
            {messages.length} správ a poznámok v tickete
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  borderLeft: `3px solid ${m.isPrivate ? 'var(--color-warning)' : 'var(--color-info)'}`,
                  background: 'var(--color-surface-2)',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {m.authorName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.authorName}</div>
                      {m.isPrivate && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: 'var(--color-warning)',
                            background: 'var(--color-warning-bg)',
                            borderRadius: 4,
                            padding: '1px 6px',
                          }}
                        >
                          PRIVÁTNA POZNÁMKA
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{fmt(m.createdAt)}</div>
                </div>
                <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>
              </div>
            ))}
            {messages.length === 0 && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Zatiaľ žiadna komunikácia.</div>
            )}
          </div>

          {!closed ? (
            <form onSubmit={handleReply} style={{ marginTop: 20 }}>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Napíšte odpoveď klientovi alebo internú poznámku…"
                rows={4}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  Privátna poznámka (nevidí klient)
                </label>
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  style={{
                    padding: '9px 18px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    opacity: sending || !reply.trim() ? 0.6 : 1,
                  }}
                >
                  Odoslať
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                marginTop: 20,
                padding: 12,
                textAlign: 'center',
                color: 'var(--color-text-faint)',
                fontSize: 13,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              🔒 Tento ticket je uzavretý.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Stav ticketu">
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
              style={selectStyle}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              <InfoField label="Priorita" value={ticket.priority} />
              <InfoField label="Kanál" value={ticket.channel} />
              <InfoField label="Vytvorený" value={fmt(ticket.createdAt)} />
              <InfoField label="SLA do" value={ticket.slaDueAt ? fmt(ticket.slaDueAt) : '—'} />
            </div>
          </Panel>

          <Panel title="Priradenie">
            <input
              defaultValue={ticket.assignedTo ?? ''}
              placeholder="Bez priradenia"
              onBlur={(e) => handleAssign(e.target.value.trim())}
              style={selectStyle}
            />
          </Panel>

          <Panel title="Žiadateľ">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                {ticket.requesterName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{ticket.requesterName}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{ticket.customerName}</div>
              </div>
            </div>
          </Panel>

          <Panel title="Posledná aktivita">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activity.slice(0, 8).map((a) => (
                <div key={a.id} style={{ fontSize: 12.5 }}>
                  <div>{a.text}</div>
                  <div style={{ color: 'var(--color-text-faint)' }}>
                    {a.actor} · {fmt(a.createdAt)}
                  </div>
                </div>
              ))}
              {activity.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)' }}>Žiadna aktivita.</div>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', fontWeight: 700, marginBottom: 2 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
};
