import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeGlobalActivity, subscribeRecentMessages, subscribeTickets } from '../firebase/tickets';
import { subscribeAgents, type Agent } from '../firebase/agents';
import type { ActivityEntry, Ticket, TicketMessage, TicketPriority, TicketStatus } from '../types';
import { PRIORITY_LABELS, STATUS_LABELS } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { LineAreaChart } from '../components/charts/LineAreaChart';
import { DonutChart } from '../components/charts/DonutChart';
import { RankBarList } from '../components/charts/RankBarList';
import { useAuth } from '../contexts/AuthContext';
import { ClientTicketsPage } from './ClientTickets';

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(ms: number) {
  return new Date(ms).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' });
}

function fmtActivity(ts: ActivityEntry['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const priorityRamp: Record<TicketPriority, string> = {
  nizka: 'var(--chart-seq-250)',
  normalna: 'var(--chart-seq-350)',
  vysoka: 'var(--chart-seq-450)',
  kriticka: 'var(--chart-seq-600)',
};

const statusRamp: Record<TicketStatus, string> = {
  otvoreny: 'var(--color-info)',
  v_rieseni: '#7c3aed',
  caka_na_klienta: 'var(--color-warning)',
  uzavrety: 'var(--color-success)',
};

const AGE_BUCKETS = [
  { label: '0-1 deň', maxHours: 24 },
  { label: '1-3 dni', maxHours: 72 },
  { label: '3-7 dní', maxHours: 168 },
  { label: '7+ dní', maxHours: Infinity },
];

export function DashboardPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const navigate = useNavigate();

  useEffect(() => subscribeTickets((data) => setTickets(data.filter((t) => !t.archived))), []);
  useEffect(() => subscribeGlobalActivity(setActivity, 10), []);
  useEffect(() => subscribeRecentMessages(setMessages, 300), []);
  useEffect(() => subscribeAgents(setAgents), []);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'uzavrety');
    const assigned = open.filter((t) => t.assignedTo).length;
    const unassigned = open.length - assigned;
    const waiting = open.filter((t) => t.status === 'caka_na_klienta').length;
    const resolved30d = tickets.filter((t) => {
      if (!t.closedAt) return false;
      return t.closedAt.toMillis() > Date.now() - 30 * DAY_MS;
    }).length;
    return { open: open.length, assigned, unassigned, waiting, resolved30d };
  }, [tickets]);

  const trend = useMemo(() => {
    const days = 14;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const buckets = Array.from({ length: days }, (_, i) => {
      const dayStart = todayStart.getTime() - (days - 1 - i) * DAY_MS;
      return { label: dayKey(dayStart), start: dayStart, end: dayStart + DAY_MS, created: 0, resolved: 0 };
    });
    tickets.forEach((t) => {
      const createdAt = t.createdAt?.toMillis();
      if (createdAt) {
        const bucket = buckets.find((b) => createdAt >= b.start && createdAt < b.end);
        if (bucket) bucket.created += 1;
      }
      const closedAt = t.closedAt?.toMillis();
      if (closedAt) {
        const bucket = buckets.find((b) => closedAt >= b.start && closedAt < b.end);
        if (bucket) bucket.resolved += 1;
      }
    });
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  const priorityDonut = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'uzavrety');
    return (Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => ({
      label: PRIORITY_LABELS[p],
      value: open.filter((t) => t.priority === p).length,
      color: priorityRamp[p],
    }));
  }, [tickets]);

  const statusDonut = useMemo(() => {
    return (Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => ({
      label: STATUS_LABELS[s],
      value: tickets.filter((t) => t.status === s).length,
      color: statusRamp[s],
    }));
  }, [tickets]);

  const ageBuckets = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'uzavrety');
    const now = Date.now();
    return AGE_BUCKETS.map((bucket, i) => {
      const minHours = i === 0 ? 0 : AGE_BUCKETS[i - 1].maxHours;
      const count = open.filter((t) => {
        const createdAt = t.createdAt?.toMillis();
        if (!createdAt) return false;
        const hours = (now - createdAt) / (60 * 60 * 1000);
        return hours >= minHours && hours < bucket.maxHours;
      }).length;
      return { label: bucket.label, value: count };
    });
  }, [tickets]);

  const categoryBreakdown = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'uzavrety');
    const map = new Map<string, number>();
    open.forEach((t) => map.set(t.category || 'Iné', (map.get(t.category || 'Iné') ?? 0) + 1));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([label, value]) => ({ label, value }));
  }, [tickets]);

  const agentWorkload = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'uzavrety');
    return agents
      .filter((a) => a.active !== false)
      .map((a) => ({ label: a.name, value: open.filter((t) => t.assignedTo === a.name).length }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tickets, agents]);

  const topFirms = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'uzavrety');
    const map = new Map<string, number>();
    open.forEach((t) => map.set(t.customerName, (map.get(t.customerName) ?? 0) + 1));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [tickets]);

  const agentHours = useMemo(() => {
    const since = Date.now() - 7 * DAY_MS;
    const map = new Map<string, number>();
    messages.forEach((m) => {
      const createdAt = m.createdAt?.toMillis();
      if (!createdAt || createdAt < since) return;
      if (!m.hoursSpent) return;
      map.set(m.authorName, (map.get(m.authorName) ?? 0) + m.hoursSpent);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100, sublabel: `${value.toFixed(2)} h` }));
  }, [messages]);

  const recent = tickets.slice(0, 6);

  if (profile?.role === 'klient') {
    return <ClientTicketsPage customerId={profile.customerId} customerName={profile.customerName} />;
  }

  return (
    <div>
      <h1 style={{ fontSize: 19, margin: '0 0 2px' }}>Dashboard</h1>
      <p style={{ margin: '0 0 10px', color: 'var(--color-text-muted)', fontSize: 12 }}>
        Rýchly prehľad prevádzky technickej podpory.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 }}>
        <Card label="Nevyriešené" value={stats.open} tone="info" />
        <Card label="Priradené" value={stats.assigned} tone="primary" />
        <Card label="Nepriradené" value={stats.unassigned} tone="danger" />
        <Card label="Čakajúce na klienta" value={stats.waiting} tone="warning" />
        <Card label="Vyriešené za 30 dní" value={stats.resolved30d} tone="success" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8, marginBottom: 8 }}>
        <Panel title="Vývoj ticketov" subtitle="Posledných 14 dní">
          <LineAreaChart
            categories={trend.map((b) => b.label)}
            series={[
              { key: 'created', label: 'Vytvorené', color: 'var(--chart-series-1)', values: trend.map((b) => b.created) },
              { key: 'resolved', label: 'Vyriešené', color: 'var(--chart-series-2)', values: trend.map((b) => b.resolved) },
            ]}
            height={72}
          />
        </Panel>

        <Panel title="Otvorené podľa priority" subtitle="Aktuálny stav">
          <DonutChart data={priorityDonut} size={56} />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Panel title="Rozdelenie podľa stavu" subtitle="Všetky tickety">
          <DonutChart data={statusDonut} size={56} />
        </Panel>

        <Panel title="Vek otvorených ticketov" subtitle="Aktuálny stav">
          <RankBarList items={ageBuckets} color="var(--chart-warning)" />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Panel title="Rozdelenie podľa kategórie" subtitle="Otvorené tickety">
          <RankBarList items={categoryBreakdown} color="var(--chart-series-3)" />
        </Panel>

        <Panel title="Záťaž technikov" subtitle="Aktuálne otvorené tickety">
          <RankBarList items={agentWorkload} color="var(--chart-series-7)" />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Panel title="Najviac otvorených" subtitle="Podľa zákazníka">
          <RankBarList items={topFirms} color="var(--chart-series-1)" />
        </Panel>

        <Panel title="Odpracované hodiny agentov" subtitle="Posledných 7 dní">
          <RankBarList items={agentHours} color="var(--chart-series-7)" />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Panel title="Posledná aktivita" subtitle="Naprieč všetkými ticketmi">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflowY: 'auto' }}>
            {activity.map((a) => (
              <div key={a.id} style={{ fontSize: 11 }}>
                <div>{a.text}</div>
                <div style={{ color: 'var(--color-text-faint)', fontSize: 10 }}>
                  {a.actor} · {fmtActivity(a.createdAt)}
                </div>
              </div>
            ))}
            {activity.length === 0 && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Žiadna aktivita.</div>}
          </div>
        </Panel>

        <Panel title="Najnovšie tickety" subtitle="Posledných 6">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflowY: 'auto' }}>
            {recent.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 4,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface-2)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10.5, color: 'var(--color-primary)' }}>{t.code}</div>
                  <div style={{ fontSize: 11 }}>{t.subject}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{t.customerName}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
            {recent.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Zatiaľ žiadne tickety.</div>}
          </div>
          <button
            onClick={() => navigate('/tickets')}
            style={{
              marginTop: 6,
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontWeight: 600,
              fontSize: 11,
              padding: 0,
            }}
          >
            Zobraziť všetky →
          </button>
        </Panel>
      </div>
    </div>
  );
}

type CardTone = 'info' | 'primary' | 'danger' | 'warning' | 'success';

function Card({ label, value, tone }: { label: string; value: number; tone: CardTone }) {
  return (
    <div
      style={{
        background: `var(--color-${tone}-bg)`,
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid var(--color-${tone})`,
        borderRadius: 'var(--radius-md)',
        padding: '7px 10px',
      }}
    >
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: `var(--color-${tone})` }}>{value}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 9,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <div style={{ fontWeight: 700, fontSize: 11.5 }}>{title}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}
