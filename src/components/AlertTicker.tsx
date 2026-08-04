import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets } from '../firebase/tickets';
import { Icon } from './Icon';
import type { Ticket } from '../types';

interface AlertMsg {
  text: string;
  icon: 'user' | 'flag' | 'clock' | 'inbox' | 'check';
  to?: string;
}

const ROTATE_MS = 4500;

export function AlertTicker() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => subscribeTickets((data) => setTickets(data.filter((t) => !t.archived))), []);

  const messages = useMemo<AlertMsg[]>(() => {
    const open = tickets.filter((t) => t.status !== 'uzavrety');
    const unassigned = open.filter((t) => !t.assignedTo).length;
    const critical = open.filter((t) => t.priority === 'kriticka').length;
    const waiting = open.filter((t) => t.status === 'caka_na_klienta').length;
    const staleSince = Date.now() - 24 * 60 * 60 * 1000;
    const stale = open.filter((t) => (t.updatedAt?.toMillis() ?? t.createdAt?.toMillis() ?? 0) < staleSince).length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const createdToday = tickets.filter((t) => (t.createdAt?.toMillis() ?? 0) >= todayStart.getTime()).length;
    const closedToday = tickets.filter((t) => (t.closedAt?.toMillis() ?? 0) >= todayStart.getTime()).length;

    const msgs: AlertMsg[] = [];
    if (unassigned > 0) {
      msgs.push({
        text: `${unassigned} ${unassigned === 1 ? 'ticket čaká' : 'ticketov čaká'} na priradenie technikovi`,
        icon: 'user',
        to: '/unassigned',
      });
    }
    if (critical > 0) {
      msgs.push({
        text: `${critical} kritických ticketov je momentálne otvorených`,
        icon: 'flag',
        to: '/tickets',
      });
    }
    if (waiting > 0) {
      msgs.push({ text: `${waiting} ${waiting === 1 ? 'ticket čaká' : 'ticketov čaká'} na odpoveď klienta`, icon: 'clock', to: '/tickets' });
    }
    if (stale > 0) {
      msgs.push({
        text: `${stale} ${stale === 1 ? 'ticket nemá' : 'ticketov nemá'} aktivitu viac ako 24 hodín`,
        icon: 'clock',
        to: '/tickets',
      });
    }
    if (createdToday > 0) {
      msgs.push({ text: `Dnes pribudlo ${createdToday} nových ticketov`, icon: 'inbox', to: '/today' });
    }
    if (closedToday > 0) {
      msgs.push({ text: `Dnes bolo vyriešených ${closedToday} ticketov`, icon: 'check' });
    }
    if (msgs.length === 0) {
      msgs.push({ text: 'Všetky tickety sú priradené a pod kontrolou', icon: 'check' });
    }
    return msgs.slice(0, 5);
  }, [tickets]);

  useEffect(() => {
    setIndex(0);
  }, [messages.length]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [messages.length]);

  const current = messages[index];
  if (!current) return null;

  return (
    <div
      onClick={() => current.to && navigate(current.to)}
      title={current.to ? 'Kliknite pre zobrazenie' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 14px',
        borderRadius: 999,
        background: 'var(--color-primary-bg)',
        color: 'var(--color-primary)',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: current.to ? 'pointer' : 'default',
        maxWidth: 380,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
    >
      <Icon name={current.icon} size={13} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.text}</span>
      {messages.length > 1 && (
        <span style={{ display: 'flex', gap: 3, marginLeft: 'auto', flexShrink: 0 }}>
          {messages.map((_, i) => (
            <span
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: i === index ? 'var(--color-primary)' : 'rgba(139,41,66,0.2)',
              }}
            />
          ))}
        </span>
      )}
    </div>
  );
}
