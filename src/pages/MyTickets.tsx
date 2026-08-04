import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets } from '../firebase/tickets';
import { subscribeAgents, type Agent } from '../firebase/agents';
import { useAuth } from '../contexts/AuthContext';
import type { Ticket } from '../types';
import { CHANNEL_LABELS } from '../types';
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
  const navigate = useNavigate();
  const isClient = profile?.role === 'klient';

  useEffect(() => subscribeTickets((data) => setTickets(data.filter((t) => !t.archived))), []);
  useEffect(() => {
    if (isClient) return;
    return subscribeAgents(setAgents);
  }, [isClient]);

  const myAgent = useMemo(
    () => agents.find((a) => a.email && a.email.toLowerCase() === user?.email?.toLowerCase()),
    [agents, user],
  );

  const myTickets = useMemo(() => {
    if (isClient && profile?.role === 'klient') {
      return tickets.filter((t) => t.requesterEmail?.toLowerCase() === user?.email?.toLowerCase());
    }
    if (!myAgent) return [];
    return tickets.filter((t) => t.assignedTo === myAgent.name);
  }, [tickets, isClient, profile, user, myAgent]);

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Moje tikety</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        {isClient ? 'Tickety, ktoré ste osobne nahlásili.' : 'Tickety priradené vám.'}
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
          , aby sa tu zobrazili vaše tickety.
        </div>
      )}

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--color-surface-2)' }}>
              {['Ticket', 'Predmet', 'Zákazník', 'Žiadateľ', 'Kanál', 'Vek', 'Stav', 'Priorita', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myTickets.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Žiadne tickety.
                </td>
              </tr>
            )}
            {myTickets.map((t) => (
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
