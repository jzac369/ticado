import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeGlobalActivity, subscribeRecentMessages, subscribeTickets } from '../firebase/tickets';
import { subscribeAgents, type Agent } from '../firebase/agents';
import type { ActivityEntry, Ticket, TicketMessage, TicketPriority, TicketStatus } from '../types';
import { CHANNEL_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { LineAreaChart } from '../components/charts/LineAreaChart';
import { DonutChart } from '../components/charts/DonutChart';
import { RankBarList } from '../components/charts/RankBarList';
import { Icon } from '../components/Icon';
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

function fmtDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const hours = ms / (60 * 60 * 1000);
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60000))}m`;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(hours / 24);
  const h = Math.round(hours - days * 24);
  return h > 0 ? `${days}d ${h}h` : `${days}d`;
}

function ageLabel(createdAt: Ticket['createdAt']) {
  if (!createdAt) return '—';
  const hours = Math.floor((Date.now() - createdAt.toMillis()) / (60 * 60 * 1000));
  if (hours < 1) return 'teraz';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
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

const channelRamp: Record<Ticket['channel'], string> = {
  web: 'var(--chart-series-1)',
  email: 'var(--chart-series-3)',
  telefon: 'var(--chart-series-4)',
};

const AGE_BUCKETS = [
  { label: '0-1 deň', maxHours: 24 },
  { label: '1-3 dni', maxHours: 72 },
  { label: '3-7 dní', maxHours: 168 },
  { label: '7+ dní', maxHours: Infinity },
];

const DAY_OPTIONS = [7, 14, 30];

export function DashboardPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [days, setDays] = useState(14);

  useEffect(() => subscribeTickets((data) => setTickets(data.filter((t) => !t.archived))), []);
  useEffect(() => subscribeGlobalActivity(setActivity, 10), []);
  useEffect(() => subscribeRecentMessages(setMessages, 500), []);
  useEffect(() => subscribeAgents(setAgents), []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (agentFilter && t.assignedTo !== agentFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    });
  }, [tickets, agentFilter, priorityFilter, statusFilter]);

  const hasFilters = Boolean(agentFilter || priorityFilter || statusFilter || search.trim());

  const periodStartMs = Date.now() - days * DAY_MS;
  const prevPeriodStartMs = Date.now() - 2 * days * DAY_MS;

  const stats = useMemo(() => {
    const open = filteredTickets.filter((t) => t.status !== 'uzavrety');
    const assigned = open.filter((t) => t.assignedTo).length;
    const unassigned = open.length - assigned;
    const waiting = open.filter((t) => t.status === 'caka_na_klienta').length;
    const createdInPeriod = filteredTickets.filter((t) => (t.createdAt?.toMillis() ?? 0) >= periodStartMs).length;
    const createdInPrevPeriod = filteredTickets.filter((t) => {
      const ms = t.createdAt?.toMillis() ?? 0;
      return ms >= prevPeriodStartMs && ms < periodStartMs;
    }).length;
    const resolvedInPeriod = filteredTickets.filter((t) => (t.closedAt?.toMillis() ?? 0) >= periodStartMs).length;
    const resolvedInPrevPeriod = filteredTickets.filter((t) => {
      const ms = t.closedAt?.toMillis() ?? 0;
      return ms >= prevPeriodStartMs && ms < periodStartMs;
    }).length;
    return {
      open: open.length,
      assigned,
      unassigned,
      waiting,
      createdInPeriod,
      createdInPrevPeriod,
      resolvedInPeriod,
      resolvedInPrevPeriod,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTickets, days]);

  const trend = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const buckets = Array.from({ length: days }, (_, i) => {
      const dayStart = todayStart.getTime() - (days - 1 - i) * DAY_MS;
      return { label: dayKey(dayStart), start: dayStart, end: dayStart + DAY_MS, created: 0, resolved: 0 };
    });
    filteredTickets.forEach((t) => {
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
  }, [filteredTickets, days]);

  const openSparkline = useMemo(() => {
    let running = 0;
    return trend.map((b) => {
      running += b.created - b.resolved;
      return Math.max(0, running);
    });
  }, [trend]);

  const resolvedSparkline = useMemo(() => trend.map((b) => b.resolved), [trend]);

  const priorityDonut = useMemo(() => {
    const open = filteredTickets.filter((t) => t.status !== 'uzavrety');
    return (Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => ({
      label: PRIORITY_LABELS[p],
      value: open.filter((t) => t.priority === p).length,
      color: priorityRamp[p],
    }));
  }, [filteredTickets]);

  const statusDonut = useMemo(() => {
    return (Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => ({
      label: STATUS_LABELS[s],
      value: filteredTickets.filter((t) => t.status === s).length,
      color: statusRamp[s],
    }));
  }, [filteredTickets]);

  const channelDonut = useMemo(() => {
    return (Object.keys(CHANNEL_LABELS) as Ticket['channel'][]).map((c) => ({
      label: CHANNEL_LABELS[c],
      value: filteredTickets.filter((t) => t.channel === c).length,
      color: channelRamp[c],
    }));
  }, [filteredTickets]);

  const ageBuckets = useMemo(() => {
    const open = filteredTickets.filter((t) => t.status !== 'uzavrety');
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
  }, [filteredTickets]);

  const categoryBreakdown = useMemo(() => {
    const open = filteredTickets.filter((t) => t.status !== 'uzavrety');
    const map = new Map<string, number>();
    open.forEach((t) => map.set(t.category || 'Iné', (map.get(t.category || 'Iné') ?? 0) + 1));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([label, value]) => ({ label, value }));
  }, [filteredTickets]);

  const resolutionByPriority = useMemo(() => {
    return (Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => {
      const closed = filteredTickets.filter(
        (t) => t.priority === p && t.status === 'uzavrety' && t.closedAt && t.createdAt,
      );
      if (closed.length === 0) return { label: PRIORITY_LABELS[p], value: 0, sublabel: '—' };
      const avgMs = closed.reduce((sum, t) => sum + (t.closedAt!.toMillis() - t.createdAt!.toMillis()), 0) / closed.length;
      return { label: PRIORITY_LABELS[p], value: Math.round(avgMs / 60000), sublabel: fmtDuration(avgMs) };
    });
  }, [filteredTickets]);

  const agentPerformance = useMemo(() => {
    const open = filteredTickets.filter((t) => t.status !== 'uzavrety');
    return agents
      .filter((a) => a.active !== false)
      .map((a) => {
        const openCount = open.filter((t) => t.assignedTo === a.name).length;
        const closedInPeriod = filteredTickets.filter(
          (t) => t.assignedTo === a.name && t.status === 'uzavrety' && (t.closedAt?.toMillis() ?? 0) >= periodStartMs,
        );
        const avgMs =
          closedInPeriod.length > 0
            ? closedInPeriod.reduce((sum, t) => sum + (t.closedAt!.toMillis() - t.createdAt!.toMillis()), 0) / closedInPeriod.length
            : NaN;
        return { name: a.name, openCount, closedCount: closedInPeriod.length, avgMs };
      })
      .sort((a, b) => b.closedCount - a.closedCount)
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTickets, agents, days]);

  const topFirms = useMemo(() => {
    const open = filteredTickets.filter((t) => t.status !== 'uzavrety');
    const map = new Map<string, number>();
    open.forEach((t) => map.set(t.customerName, (map.get(t.customerName) ?? 0) + 1));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [filteredTickets]);

  const actionItems = useMemo(() => {
    const open = filteredTickets.filter((t) => t.status !== 'uzavrety');
    const lastMessageByTicket = new Map<string, TicketMessage>();
    messages
      .filter((m) => !m.isPrivate)
      .forEach((m) => {
        const existing = lastMessageByTicket.get(m.ticketId);
        if (!existing || (m.createdAt?.toMillis() ?? 0) > (existing.createdAt?.toMillis() ?? 0)) {
          lastMessageByTicket.set(m.ticketId, m);
        }
      });
    const waitingOnUs = open.filter((t) => {
      const last = lastMessageByTicket.get(t.id);
      if (!last) return false;
      return last.authorEmail && t.requesterEmail && last.authorEmail.toLowerCase() === t.requesterEmail.toLowerCase();
    }).length;
    const staleSince = Date.now() - 24 * DAY_MS / 24;
    const stale = open.filter((t) => (t.updatedAt?.toMillis() ?? t.createdAt?.toMillis() ?? 0) < staleSince).length;
    return { waitingOnUs, stale };
  }, [filteredTickets, messages]);

  const recentFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = filteredTickets;
    if (q) {
      list = list.filter(
        (t) =>
          t.code.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          (t.assignedTo ?? '').toLowerCase().includes(q),
      );
    }
    return list.slice(0, 8);
  }, [filteredTickets, search]);

  function exportCsv() {
    const headers = ['Ticket', 'Predmet', 'Zákazník', 'Stav', 'Priorita', 'Kanál', 'Pridelené', 'Vytvorený'];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = filteredTickets.map((t) => [
      t.code,
      t.subject,
      t.customerName,
      STATUS_LABELS[t.status],
      PRIORITY_LABELS[t.priority],
      CHANNEL_LABELS[t.channel],
      t.assignedTo ?? '',
      t.createdAt ? t.createdAt.toDate().toLocaleString('sk-SK') : '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function delta(current: number, previous: number) {
    const diff = current - previous;
    const pct = previous === 0 ? (current === 0 ? 0 : 100) : Math.round((diff / previous) * 100);
    return { diff, pct };
  }

  if (profile?.role === 'klient') {
    return <ClientTicketsPage customerId={profile.customerId} customerName={profile.customerName} />;
  }

  const resolvedDelta = delta(stats.resolvedInPeriod, stats.resolvedInPrevPeriod);

  return (
    <div>
      <h1 style={{ fontSize: 19, margin: '0 0 2px' }}>Dashboard</h1>
      <p style={{ margin: '0 0 10px', color: 'var(--color-text-muted)', fontSize: 12 }}>
        Rýchly prehľad prevádzky technickej podpory.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 10,
          padding: 8,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <Icon
            name="search"
            size={13}
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hľadať ticket, zákazníka alebo agenta…"
            style={{ ...toolbarInputStyle, paddingLeft: 28, width: '100%' }}
          />
        </div>
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} style={toolbarInputStyle}>
          <option value="">Všetci agenti</option>
          {agents.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')} style={toolbarInputStyle}>
          <option value="">Všetky priority</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')} style={toolbarInputStyle}>
          <option value="">Všetky stavy</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={toolbarInputStyle}>
          {DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              Posledných {d} dní
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setSearch('');
              setAgentFilter('');
              setPriorityFilter('');
              setStatusFilter('');
            }}
            style={{ ...toolbarInputStyle, cursor: 'pointer', color: 'var(--color-text-muted)' }}
          >
            Zrušiť filtre
          </button>
        )}
        <button onClick={exportCsv} style={{ ...toolbarBtnStyle, marginLeft: 'auto' }}>
          <Icon name="download" size={13} /> Exportovať
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 }}>
        <Card label="Nevyriešené" value={stats.open} tone="info" icon="inbox" sparkline={openSparkline} />
        <Card label="Priradené" value={stats.assigned} tone="primary" icon="user" />
        <Card label="Nepriradené" value={stats.unassigned} tone="danger" icon="users" />
        <Card label="Čakajúce na klienta" value={stats.waiting} tone="warning" icon="clock" />
        <Card
          label={`Vyriešené (${days}d)`}
          value={stats.resolvedInPeriod}
          tone="success"
          icon="check"
          sparkline={resolvedSparkline}
          delta={resolvedDelta}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.85fr 0.85fr', gap: 8, marginBottom: 8 }}>
        <Panel title="Vývoj ticketov" subtitle={`Posledných ${days} dní`}>
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

        <Panel title="Priemerný čas riešenia" subtitle="Podľa priority">
          <RankBarList items={resolutionByPriority} color="var(--chart-series-7)" />
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

        <Panel title="Kanály ticketov" subtitle={`Posledných ${days} dní`}>
          <DonutChart data={channelDonut} size={56} />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Panel title="Najviac otvorených" subtitle="Podľa zákazníka">
          <RankBarList items={topFirms} color="var(--chart-series-1)" />
        </Panel>

        <Panel title="Výkon agentov" subtitle={`Uzavreté za ${days} dní`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {agentPerformance.map((a) => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                <div style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </div>
                <div style={{ color: 'var(--color-text-faint)', width: 56, textAlign: 'right' }}>{a.openCount} otv.</div>
                <div style={{ fontWeight: 700, width: 44, textAlign: 'right' }}>{a.closedCount} uzv.</div>
                <div style={{ color: 'var(--color-text-faint)', width: 56, textAlign: 'right' }}>{fmtDuration(a.avgMs)}</div>
              </div>
            ))}
            {agentPerformance.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>Žiadni technici.</div>}
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Panel title="Tickety vyžadujúce akciu" subtitle="Aktuálny stav">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ActionRow
              icon="message"
              label="Čakajúce na vašu odpoveď"
              value={actionItems.waitingOnUs}
              tone="warning"
              onClick={() => navigate('/tickets')}
            />
            <ActionRow
              icon="clock"
              label="Bez aktivity dlhšie ako 24h"
              value={actionItems.stale}
              tone="danger"
              onClick={() => navigate('/tickets')}
            />
          </div>
        </Panel>

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
      </div>

      <Panel title="Najnovšie tickety" subtitle={search.trim() ? `Výsledky pre "${search.trim()}"` : 'Posledných 8'}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              {['Ticket', 'Predmet', 'Zákazník', 'Vek', 'Stav', 'Priorita', ''].map((h) => (
                <th key={h} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentFiltered.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{ borderTop: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                <td style={{ padding: '6px 8px', fontWeight: 700, color: 'var(--color-primary)' }}>{t.code}</td>
                <td style={{ padding: '6px 8px' }}>{t.subject}</td>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-muted)' }}>{t.customerName}</td>
                <td style={{ padding: '6px 8px', color: 'var(--color-text-faint)' }}>{ageLabel(t.createdAt)}</td>
                <td style={{ padding: '6px 8px' }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <PriorityBadge priority={t.priority} />
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--color-primary)', textAlign: 'center' }}>›</td>
              </tr>
            ))}
            {recentFiltered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Žiadne výsledky.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <button
          onClick={() => navigate('/tickets')}
          style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: 11, padding: 0, cursor: 'pointer' }}
        >
          Zobraziť všetky →
        </button>
      </Panel>
    </div>
  );
}

type CardTone = 'info' | 'primary' | 'danger' | 'warning' | 'success';

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 64;
  const h = 20;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({
  label,
  value,
  tone,
  icon,
  sparkline,
  delta,
}: {
  label: string;
  value: number;
  tone: CardTone;
  icon: 'inbox' | 'user' | 'users' | 'clock' | 'check';
  sparkline?: number[];
  delta?: { diff: number; pct: number };
}) {
  return (
    <div
      style={{
        background: `var(--color-${tone}-bg)`,
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid var(--color-${tone})`,
        borderRadius: 'var(--radius-md)',
        padding: '8px 10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: `var(--color-${tone})` }}>{value}</div>
        </div>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: `var(--color-${tone})`,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={12} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20 }}>
        {delta ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              fontWeight: 700,
              color: delta.diff >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          >
            <Icon name={delta.diff >= 0 ? 'trendUp' : 'trendDown'} size={10} />
            {delta.diff >= 0 ? '+' : ''}
            {delta.diff} ({delta.pct >= 0 ? '+' : ''}
            {delta.pct}%)
          </div>
        ) : (
          <span />
        )}
        {sparkline && <Sparkline values={sparkline} color={`var(--color-${tone})`} />}
      </div>
    </div>
  );
}

function ActionRow({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: 'message' | 'clock';
  label: string;
  value: number;
  tone: 'warning' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 8px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-surface-2)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Icon name={icon} size={13} style={{ color: `var(--color-${tone})` }} />
      <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: `var(--color-${tone})` }}>{value}</span>
    </button>
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

const toolbarInputStyle: CSSProperties = {
  padding: '7px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 11.5,
};

const toolbarBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
