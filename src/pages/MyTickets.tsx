import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeTickets,
  subscribeRecentMessages,
  updateTicketStatus,
  updateTicketPriority,
  updateTicketAssignment,
  archiveTicket,
} from '../firebase/tickets';
import { subscribeAgents, type Agent } from '../firebase/agents';
import { useAuth } from '../contexts/AuthContext';
import type { Ticket, TicketMessage, TicketPriority, TicketStatus } from '../types';
import { CHANNEL_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badges';

function ageLabel(createdAt: Ticket['createdAt']) {
  if (!createdAt) return '—';
  const ms = Date.now() - createdAt.toMillis();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return 'práve teraz';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodín'}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'deň' : days < 5 ? 'dni' : 'dní'}`;
}

export function MyTicketsPage() {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const navigate = useNavigate();
  const isClient = profile?.role === 'klient';

  useEffect(() => subscribeTickets((data) => setTickets(data.filter((t) => !t.archived))), []);
  useEffect(() => {
    if (isClient) return;
    return subscribeAgents(setAgents);
  }, [isClient]);
  useEffect(() => subscribeRecentMessages(setMessages, 500), []);

  const myAgent = useMemo(
    () => agents.find((a) => a.email && a.email.toLowerCase() === user?.email?.toLowerCase()),
    [agents, user],
  );

  const messageTextByTicket = useMemo(() => {
    const map = new Map<string, string>();
    messages.forEach((m) => {
      const existing = map.get(m.ticketId) ?? '';
      map.set(m.ticketId, `${existing} ${m.body}`);
    });
    return map;
  }, [messages]);

  const myTickets = useMemo(() => {
    if (isClient && profile?.role === 'klient') {
      return tickets.filter((t) => t.requesterEmail?.toLowerCase() === user?.email?.toLowerCase());
    }
    if (!myAgent) return [];
    return tickets.filter((t) => t.assignedTo === myAgent.name);
  }, [tickets, isClient, profile, user, myAgent]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return myTickets;
    const words = q.split(/\s+/).filter(Boolean);
    const exactPhrase = q.startsWith('"') && q.endsWith('"') && q.length > 1;
    return myTickets.filter((t) => {
      const haystack = `${t.code} ${t.subject} ${t.customerName} ${t.requesterName} ${(t.tags ?? []).join(' ')} ${messageTextByTicket.get(t.id) ?? ''}`.toLowerCase();
      if (exactPhrase) return haystack.includes(q.slice(1, -1));
      return words.every((w) => haystack.includes(w));
    });
  }, [myTickets, search, messageTextByTicket]);

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((t) => next.delete(t.id));
      else filtered.forEach((t) => next.add(t.id));
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const actorName = user?.email?.split('@')[0] ?? 'Agent';

  async function bulkSetStatus(status: TicketStatus) {
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => updateTicketStatus(id, status, actorName)));
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkSetPriority(priority: TicketPriority) {
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => updateTicketPriority(id, priority, actorName)));
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkAssign(assignee: string) {
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => updateTicketAssignment(id, assignee || null, actorName)));
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkArchive() {
    if (!window.confirm(`Naozaj chcete archivovať ${selected.size} tiketov?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => archiveTicket(id, actorName)));
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Moje tikety</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        {isClient ? 'Tikety, ktoré ste osobne nahlásili.' : 'Tikety priradené vám.'}
      </p>

      {!isClient && !myAgent && (
        <div
          style={{
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          ⚠ Váš email ({user?.email}) nie je prepojený so žiadnym technikom v Nastaveniach. Prepojte ho v{' '}
          <button
            onClick={() => navigate('/profile')}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            Môj profil
          </button>
          , aby sa tu zobrazili vaše tikety.
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Hľadať ID, predmet, zákazníka aj obsah komunikácie; viac slov = všetky slová…'
        style={{
          width: '100%',
          padding: '10px 14px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 12,
          background: 'var(--color-surface)',
        }}
      />

      {!isClient && selected.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '10px 14px',
            marginBottom: 12,
            background: 'var(--color-primary-bg)',
            border: '1px solid var(--color-primary-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{selected.size} vybraných</span>
          <select
            defaultValue=""
            disabled={bulkBusy}
            onChange={(e) => {
              if (e.target.value) bulkSetStatus(e.target.value as TicketStatus);
              e.target.value = '';
            }}
            style={bulkSelectStyle}
          >
            <option value="" disabled>
              Zmeniť stav…
            </option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            defaultValue=""
            disabled={bulkBusy}
            onChange={(e) => {
              if (e.target.value) bulkSetPriority(e.target.value as TicketPriority);
              e.target.value = '';
            }}
            style={bulkSelectStyle}
          >
            <option value="" disabled>
              Zmeniť prioritu…
            </option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            defaultValue=""
            disabled={bulkBusy}
            onChange={(e) => {
              bulkAssign(e.target.value);
              e.target.value = '';
            }}
            style={bulkSelectStyle}
          >
            <option value="" disabled>
              Priradiť technikovi…
            </option>
            <option value="">— Zrušiť priradenie —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <button onClick={bulkArchive} disabled={bulkBusy} style={{ ...secondaryBtn, height: 32 }}>
            Archivovať
          </button>
          <button onClick={() => setSelected(new Set())} style={{ ...secondaryBtn, height: 32, marginLeft: 'auto' }}>
            Zrušiť výber
          </button>
        </div>
      )}

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--color-surface-2)' }}>
              {!isClient && (
                <th style={{ padding: '10px 14px', width: 1 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
              )}
              {['Tiket', 'Predmet', 'Firma', 'Žiadateľ', 'Kanál', 'Vek', 'Stav', 'Priorita', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isClient ? 9 : 10} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  {myTickets.length === 0 ? 'Žiadne tikety.' : 'Žiadne tikety nezodpovedajú hľadaniu.'}
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{
                  borderTop: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  borderLeft: t.priority === 'kriticka' ? '3px solid var(--color-danger)' : '3px solid transparent',
                  background: selected.has(t.id) ? 'var(--color-primary-bg)' : t.priority === 'kriticka' ? 'rgba(220,38,38,0.05)' : undefined,
                }}
              >
                {!isClient && (
                  <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelectOne(t.id)} />
                  </td>
                )}
                <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>{t.code}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{t.subject}</td>
                <td style={{ padding: '12px 14px' }}>{t.customerName}</td>
                <td style={{ padding: '12px 14px' }}>{t.requesterName}</td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)' }}>{CHANNEL_LABELS[t.channel]}</td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)' }}>{ageLabel(t.createdAt)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <PriorityBadge priority={t.priority} />
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--color-primary)', fontSize: 22, fontWeight: 700, textAlign: 'center' }}>
                  ›
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const bulkSelectStyle = {
  minWidth: 172,
  flexShrink: 0,
  height: 32,
  padding: '4px 8px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 12.5,
} as const;

const secondaryBtn = {
  padding: '8px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontSize: 13,
  fontWeight: 600,
} as const;
