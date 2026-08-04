import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets } from '../firebase/tickets';
import type { Ticket } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badges';

export function UnassignedTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const navigate = useNavigate();

  useEffect(() => subscribeTickets(setTickets), []);

  const unassigned = useMemo(
    () => tickets.filter((t) => !t.assignedTo && t.status !== 'uzavrety'),
    [tickets],
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Nepriradené tikety</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Otvorené tickety, ktoré ešte nemajú priradeného technika.
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
            {unassigned.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Všetky otvorené tickety sú priradené.
                </td>
              </tr>
            )}
            {unassigned.map((t) => (
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
