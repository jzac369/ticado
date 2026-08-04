import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets, subscribeRecentMessages } from '../firebase/tickets';
import { useAuth } from '../contexts/AuthContext';
import type { Ticket, TicketMessage } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badges';

export function SearchTicketsPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const isClient = profile?.role === 'klient';

  useEffect(() => subscribeTickets(setTickets), []);
  useEffect(() => subscribeRecentMessages(setMessages, 500), []);

  const messageTextByTicket = useMemo(() => {
    const map = new Map<string, string>();
    messages.forEach((m) => map.set(m.ticketId, `${map.get(m.ticketId) ?? ''} ${m.body}`));
    return map;
  }, [messages]);

  const scoped = useMemo(() => {
    if (isClient && profile?.role === 'klient') return tickets.filter((t) => t.customerId === profile.customerId);
    return tickets;
  }, [tickets, isClient, profile]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    return scoped.filter((t) => {
      const haystack = `${t.code} ${t.subject} ${t.customerName} ${t.requesterName} ${(t.tags ?? []).join(' ')} ${messageTextByTicket.get(t.id) ?? ''}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [scoped, query, messageTextByTicket]);

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Vyhľadávať</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Hľadá v čísle ticketu, predmete, zákazníkovi, štítkoch aj v obsahu komunikácie.
      </p>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Začnite písať pre vyhľadávanie…"
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          fontSize: 14,
          marginBottom: 20,
        }}
      />

      {query.trim() && (
        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 10 }}>{results.length} výsledkov</div>
      )}

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--color-surface-2)' }}>
              {['Ticket', 'Predmet', 'Zákazník', 'Stav', 'Priorita', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!query.trim() && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Zadajte hľadaný výraz vyššie.
                </td>
              </tr>
            )}
            {query.trim() && results.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Žiadne výsledky.
                </td>
              </tr>
            )}
            {results.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{ borderTop: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>{t.code}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{t.subject}</td>
                <td style={{ padding: '12px 14px' }}>{t.customerName}</td>
                <td style={{ padding: '12px 14px' }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <PriorityBadge priority={t.priority} />
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-faint)' }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
