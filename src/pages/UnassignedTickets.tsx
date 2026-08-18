import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets, subscribeRecentMessages } from '../firebase/tickets';
import type { Ticket, TicketMessage } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { AttachmentBadgeRow, attachmentsByTicketFromMessages } from '../components/AttachmentView';

export function UnassignedTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'category'>('newest');
  const navigate = useNavigate();

  useEffect(() => subscribeTickets((data) => setTickets(data.filter((t) => !t.archived))), []);
  useEffect(() => subscribeRecentMessages(setMessages, 500), []);

  const attachmentsByTicket = useMemo(() => attachmentsByTicketFromMessages(messages), [messages]);

  const unassigned = useMemo(
    () => tickets.filter((t) => !t.assignedTo && t.status !== 'uzavrety'),
    [tickets],
  );

  const categories = useMemo(() => [...new Set(unassigned.map((t) => t.category).filter(Boolean))].sort(), [unassigned]);

  const filtered = useMemo(() => {
    let list = categoryFilter ? unassigned.filter((t) => t.category === categoryFilter) : unassigned;
    list = [...list].sort((a, b) => {
      if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
      const at = a.createdAt?.toMillis() ?? 0;
      const bt = b.createdAt?.toMillis() ?? 0;
      return sortBy === 'oldest' ? at - bt : bt - at;
    });
    return list;
  }, [unassigned, categoryFilter, sortBy]);

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Nepriradené tikety</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Otvorené tikety, ktoré ešte nemajú priradeného technika.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={filterSelectStyle}>
          <option value="">Všetky kategórie</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} style={filterSelectStyle}>
          <option value="newest">Najnovšie</option>
          <option value="oldest">Najstaršie</option>
          <option value="category">Podľa kategórie (A-Z)</option>
        </select>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--color-surface-2)' }}>
              {['Tiket', 'Predmet', 'Firma', 'Stav', 'Priorita', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  {unassigned.length === 0 ? 'Všetky otvorené tikety sú priradené.' : 'Žiadne tikety nezodpovedajú filtru.'}
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
                  background: t.priority === 'kriticka' ? 'rgba(220,38,38,0.05)' : undefined,
                }}
              >
                <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>{t.code}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{t.subject}</span>
                    <AttachmentBadgeRow attachments={attachmentsByTicket.get(t.id)} />
                  </div>
                  {t.category && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-faint)', marginTop: 2 }}>{t.category}</div>}
                </td>
                <td style={{ padding: '12px 14px' }}>{t.customerName}</td>
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

const filterSelectStyle: CSSProperties = {
  padding: '9px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontSize: 13,
};
