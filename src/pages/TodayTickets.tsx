import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets } from '../firebase/tickets';
import { useAuth } from '../contexts/AuthContext';
import type { Ticket } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badges';

export function TodayTicketsPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const navigate = useNavigate();
  const isClient = profile?.role === 'klient';

  useEffect(() => subscribeTickets(setTickets), []);

  const todayTickets = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let list = tickets.filter((t) => (t.createdAt?.toMillis() ?? 0) >= todayStart.getTime());
    if (isClient && profile?.role === 'klient') {
      list = list.filter((t) => t.customerId === profile.customerId);
    }
    return list;
  }, [tickets, isClient, profile]);

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Dnešné tikety</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Tickety vytvorené dnes{isClient ? ' vo vašej firme' : ''}.
      </p>

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
            {todayTickets.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Dnes zatiaľ žiadne tickety.
                </td>
              </tr>
            )}
            {todayTickets.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{
                  borderTop: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  borderLeft: t.priority === 'kriticka' ? '3px solid var(--color-danger)' : '3px solid transparent',
                }}
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
