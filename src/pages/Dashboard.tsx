import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeGlobalActivity, subscribeRecentMessages, subscribeTickets } from '../firebase/tickets';
import { subscribeAgents, type Agent } from '../firebase/agents';
import type { ActivityEntry, Ticket, TicketMessage, TicketPriority, TicketStatus } from '../types';
import { CHANNEL_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../types';
import { LineAreaChart } from '../components/charts/LineAreaChart';
import { DonutChart } from '../components/charts/DonutChart';
import { RankBarList } from '../components/charts/RankBarList';
import { Icon } from '../components/Icon';
import { PriorityBadge } from '../components/Badges';
import { useAuth } from '../contexts/AuthContext';
import { ClientTicketsPage } from './ClientTickets';
import { subscribeDashboardNotes, addDashboardNote, deleteDashboardNote, type DashboardNote } from '../firebase/dashboardNotes';

const DAY_MS = 24 * 60 * 60 * 1000;
const PANEL_HEIGHT = 204;
const PANEL_HEIGHT_TALL = 284;

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
  const { profile, user } = useAuth();
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

  const myAgentName = useMemo(
    () => agents.find((a) => a.email && a.email.toLowerCase() === user?.email?.toLowerCase())?.name ?? user?.email?.split('@')[0] ?? 'Technik',
    [agents, user],
  );

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

  const openTickets = useMemo(() => filteredTickets.filter((t) => t.status !== 'uzavrety'), [filteredTickets]);
  const assignedTickets = useMemo(() => openTickets.filter((t) => t.assignedTo), [openTickets]);
  const unassignedTickets = useMemo(() => openTickets.filter((t) => !t.assignedTo), [openTickets]);
  const waitingTickets = useMemo(() => openTickets.filter((t) => t.status === 'caka_na_klienta'), [openTickets]);
  const urgentTickets = useMemo(() => openTickets.filter((t) => t.priority === 'kriticka'), [openTickets]);

  const stats = useMemo(() => {
    const resolvedInPeriod = filteredTickets.filter((t) => (t.closedAt?.toMillis() ?? 0) >= periodStartMs).length;
    const resolvedInPrevPeriod = filteredTickets.filter((t) => {
      const ms = t.closedAt?.toMillis() ?? 0;
      return ms >= prevPeriodStartMs && ms < periodStartMs;
    }).length;
    return {
      open: openTickets.length,
      assigned: assignedTickets.length,
      unassigned: unassignedTickets.length,
      waiting: waitingTickets.length,
      urgent: urgentTickets.length,
      resolvedInPeriod,
      resolvedInPrevPeriod,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTickets, openTickets, assignedTickets, unassignedTickets, waitingTickets, urgentTickets, days]);

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

  /** Created-date distribution of tickets currently matching `list`, bucketed
   * the same way as `trend` - not a true "count over time" (that would need
   * an assignment/status-change event log we don't keep), but genuinely
   * derived from real timestamps rather than fabricated, so it's an honest
   * (if reinterpreted) stand-in for a trend sparkline on these cards. */
  function createdHistogram(list: Ticket[]) {
    return trend.map((b) => list.filter((t) => { const c = t.createdAt?.toMillis(); return c != null && c >= b.start && c < b.end; }).length);
  }
  function createdInRange(list: Ticket[], startMs: number, endMs: number) {
    return list.filter((t) => { const c = t.createdAt?.toMillis(); return c != null && c >= startMs && c < endMs; }).length;
  }
  function historyDelta(list: Ticket[]) {
    return delta(createdInRange(list, periodStartMs, Date.now()), createdInRange(list, prevPeriodStartMs, periodStartMs));
  }

  const assignedSparkline = useMemo(() => createdHistogram(assignedTickets), [assignedTickets, trend]);
  const unassignedSparkline = useMemo(() => createdHistogram(unassignedTickets), [unassignedTickets, trend]);
  const waitingSparkline = useMemo(() => createdHistogram(waitingTickets), [waitingTickets, trend]);
  const urgentSparkline = useMemo(() => createdHistogram(urgentTickets), [urgentTickets, trend]);

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
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [filteredTickets]);

  const resolutionByPriority = useMemo(() => {
    return (Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => {
      const closed = filteredTickets.filter(
        (t) => t.priority === p && t.status === 'uzavrety' && t.closedAt && t.createdAt,
      );
      if (closed.length === 0) return { label: PRIORITY_LABELS[p], value: 0, displayValue: '—' };
      const avgMs = closed.reduce((sum, t) => sum + (t.closedAt!.toMillis() - t.createdAt!.toMillis()), 0) / closed.length;
      // value drives the bar's proportional width (minutes); displayValue is
      // what's actually shown as the number, so nobody sees raw minute counts.
      return { label: PRIORITY_LABELS[p], value: Math.round(avgMs / 60000), displayValue: fmtDuration(avgMs) };
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
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTickets, agents, days]);

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
    const staleSince = Date.now() - DAY_MS;
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
    return list.slice(0, 6);
  }, [filteredTickets, search]);

  function exportCsv() {
    const headers = ['Tiket', 'Predmet', 'Firma', 'Stav', 'Priorita', 'Kanál', 'Pridelené', 'Vytvorený'];
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
  const assignedDelta = historyDelta(assignedTickets);
  const unassignedDelta = historyDelta(unassignedTickets);
  const waitingDelta = historyDelta(waitingTickets);
  const urgentDelta = historyDelta(urgentTickets);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 8,
          padding: 7,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
          <Icon
            name="search"
            size={12}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hľadať tiket, zákazníka, agenta…"
            style={{ ...toolbarInputStyle, paddingLeft: 26, width: '100%' }}
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
          <Icon name="download" size={12} /> Exportovať
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 8 }}>
        <Card label="Nevyriešené" value={stats.open} tone="info" icon="inbox" sparkline={openSparkline} />
        <Card label="Priradené" value={stats.assigned} tone="primary" icon="user" sparkline={assignedSparkline} delta={assignedDelta} />
        <Card label="Nepriradené" value={stats.unassigned} tone="danger" icon="users" sparkline={unassignedSparkline} delta={unassignedDelta} />
        <Card label="Čakajúce na klienta" value={stats.waiting} tone="warning" icon="clock" sparkline={waitingSparkline} delta={waitingDelta} />
        <Card label="Urgentné" value={stats.urgent} tone="critical" icon="alertTriangle" sparkline={urgentSparkline} delta={urgentDelta} />
        <Card
          label={`Vyriešené (${days}d)`}
          value={stats.resolvedInPeriod}
          tone="success"
          icon="check"
          sparkline={resolvedSparkline}
          delta={resolvedDelta}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Panel
          title="Vývoj tiketov"
          headerExtra={
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={panelSelectStyle}>
              {DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} dní
                </option>
              ))}
            </select>
          }
          tall
        >
          <LineAreaChart
            categories={trend.map((b) => b.label)}
            series={[
              { key: 'created', label: 'Vytvorené', color: 'var(--chart-series-1)', values: trend.map((b) => b.created) },
              { key: 'resolved', label: 'Vyriešené', color: 'var(--chart-series-2)', values: trend.map((b) => b.resolved) },
            ]}
            height={180}
          />
        </Panel>

        <Panel title="Podľa priority" subtitle="Otvorené" tall>
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DonutChart data={priorityDonut} size={116} />
          </div>
        </Panel>

        <Panel title="Podľa stavu" subtitle="Všetky" tall>
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DonutChart data={statusDonut} size={116} />
          </div>
        </Panel>

        <AktualityPanel authorName={myAgentName} height={PANEL_HEIGHT_TALL} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
        <Panel title="Vek otvorených" subtitle="Aktuálny stav" headerExtra={<PanelLink onClick={() => navigate('/tickets')} />}>
          <RankBarList items={ageBuckets} color="var(--chart-warning)" showPercent />
        </Panel>

        <Panel title="Podľa kategórie" subtitle="Otvorené" headerExtra={<PanelLink onClick={() => navigate('/tickets')} />}>
          <RankBarList items={categoryBreakdown} color="var(--chart-series-3)" showPercent />
        </Panel>

        <Panel title="Kanály tiketov" subtitle={`${days}d`} headerExtra={<PanelLink onClick={() => navigate('/tickets')} />}>
          <div style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <DonutChart data={channelDonut} size={86} />
          </div>
        </Panel>

        <Panel title="Vyžaduje akciu" subtitle="Aktuálny stav" headerExtra={<PanelLink onClick={() => navigate('/tickets')} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ActionRow
              icon="message"
              label="Čaká na vašu odpoveď"
              value={actionItems.waitingOnUs}
              tone="warning"
              onClick={() => navigate('/tickets')}
            />
            <ActionRow
              icon="clock"
              label="Bez aktivity 24h+"
              value={actionItems.stale}
              tone="danger"
              onClick={() => navigate('/tickets')}
            />
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
        <Panel
          title="Výkon agentov"
          headerExtra={
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={panelSelectStyle}>
              {DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} dní
                </option>
              ))}
            </select>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', fontSize: 9.5, color: 'var(--color-text-faint)', fontWeight: 700, paddingBottom: 4, borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
              <span style={{ flex: 1 }}>Agent</span>
              <span style={{ width: 44, textAlign: 'right' }}>Otvor.</span>
              <span style={{ width: 44, textAlign: 'right' }}>Vyriešené</span>
              <span style={{ width: 54, textAlign: 'right' }}>Priem. čas</span>
            </div>
            {agentPerformance.map((a) => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', fontSize: 10.5, padding: '3px 0' }}>
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <AgentAvatar name={a.name} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                </span>
                <span style={{ width: 44, textAlign: 'right', color: 'var(--color-text-muted)' }}>{a.openCount}</span>
                <span style={{ width: 44, textAlign: 'right', fontWeight: 700 }}>{a.closedCount}</span>
                <span style={{ width: 54, textAlign: 'right', color: 'var(--color-text-muted)' }}>{fmtDuration(a.avgMs)}</span>
              </div>
            ))}
            {agentPerformance.length === 0 && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Žiadni technici.</div>}
          </div>
        </Panel>

        <Panel title="Posledná aktivita" subtitle="Všetky tikety">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflowY: 'auto' }}>
            {activity.slice(0, 5).map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 7, fontSize: 10.5 }}>
                <ActivityIcon text={a.text} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.text}</div>
                  <div style={{ color: 'var(--color-text-faint)', fontSize: 9.5 }}>
                    {a.actor} · {fmtActivity(a.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            {activity.length === 0 && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Žiadna aktivita.</div>}
          </div>
        </Panel>

        <Panel title="Najnovšie tikety" subtitle={search.trim() ? 'Filtrované' : `Posledných ${recentFiltered.length}`} headerExtra={<PanelLink onClick={() => navigate('/tickets')} />}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            {recentFiltered.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: 10.5, padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{t.code}</span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{t.subject}</div>
                </div>
                <div style={{ color: 'var(--color-text-faint)', fontSize: 9.5, flexShrink: 0 }}>{ageLabel(t.createdAt)}</div>
              </div>
            ))}
            {recentFiltered.length === 0 && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Žiadne výsledky.</div>}
          </div>
        </Panel>

        <Panel title="Priemerný čas riešenia" subtitle="Podľa priority">
          <RankBarList items={resolutionByPriority} color="var(--chart-series-7)" />
        </Panel>
      </div>
    </div>
  );
}

type CardTone = 'info' | 'primary' | 'danger' | 'warning' | 'success' | 'critical';

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
  icon: 'inbox' | 'user' | 'users' | 'clock' | 'check' | 'alertTriangle';
  sparkline?: number[];
  delta?: { diff: number; pct: number };
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: `var(--color-${tone}-bg)`,
            color: `var(--color-${tone})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={13} />
        </div>
        {sparkline && <Sparkline values={sparkline} color={`var(--color-${tone})`} />}
      </div>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)' }}>{value}</div>
        {delta && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 9.5,
              fontWeight: 700,
              color: delta.diff >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          >
            <Icon name={delta.diff >= 0 ? 'trendUp' : 'trendDown'} size={9} />
            {delta.pct >= 0 ? '+' : ''}
            {delta.pct}%
          </div>
        )}
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
        gap: 7,
        padding: '6px 7px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-surface-2)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Icon name={icon} size={12} style={{ color: `var(--color-${tone})` }} />
      <span style={{ flex: 1, fontSize: 10.5, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: `var(--color-${tone})` }}>{value}</span>
    </button>
  );
}

function Panel({
  title,
  subtitle,
  children,
  headerExtra,
  tall,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
  tall?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 9,
        height: tall ? PANEL_HEIGHT_TALL : PANEL_HEIGHT,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexShrink: 0, gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 11 }}>{title}</div>
        {headerExtra ?? <div style={{ fontSize: 9.5, color: 'var(--color-text-faint)' }}>{subtitle}</div>}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

function PanelLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: 9.5, padding: 0, cursor: 'pointer', flexShrink: 0 }}
    >
      Zobraziť všetky →
    </button>
  );
}

const AVATAR_COLORS = ['var(--chart-series-1)', 'var(--chart-series-2)', 'var(--chart-series-3)', 'var(--chart-series-4)', 'var(--chart-series-5)', 'var(--chart-series-7)'];

function AgentAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: AVATAR_COLORS[hash],
        color: '#fff',
        fontSize: 8.5,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </span>
  );
}

/** Infers a rough event type from the activity text so the timeline can show
 * a colored icon per row - there's no structured `type` field on ActivityEntry. */
function ActivityIcon({ text }: { text: string }) {
  const t = text.toLowerCase();
  let icon: 'user' | 'message' | 'check' | 'edit' = 'edit';
  let tone: CardTone = 'primary';
  if (t.includes('priraden') || t.includes('pridelen')) {
    icon = 'user';
    tone = 'info';
  } else if (t.includes('sprava') || t.includes('správ') || t.includes('koment')) {
    icon = 'message';
    tone = 'critical';
  } else if (t.includes('uzavr') || t.includes('vyriešen') || t.includes('vyriesen')) {
    icon = 'check';
    tone = 'success';
  }
  return (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: `var(--color-${tone}-bg)`,
        color: `var(--color-${tone})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon name={icon} size={10} />
    </span>
  );
}

function fmtNoteTime(ts: DashboardNote['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function AktualityPanel({ authorName, height = PANEL_HEIGHT }: { authorName: string; height?: number }) {
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => subscribeDashboardNotes(setNotes), []);

  async function handleAdd() {
    if (!draft.trim()) return;
    await addDashboardNote(draft.trim(), authorName);
    setDraft('');
    setAdding(false);
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 9,
        height,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 11 }}>Aktuality</div>
        <button
          onClick={() => setAdding((v) => !v)}
          title="Pridať odkaz"
          style={{
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            background: adding ? 'var(--color-primary)' : 'var(--color-surface-2)',
            color: adding ? '#fff' : 'var(--color-text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Icon name="plus" size={10} />
        </button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexShrink: 0 }}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="Krátky odkaz…"
            style={{ flex: 1, padding: '4px 6px', fontSize: 10.5, border: '1px solid var(--color-border)', borderRadius: 4, background: 'var(--color-surface)' }}
          />
          <button
            onClick={handleAdd}
            style={{ padding: '0 8px', fontSize: 10.5, fontWeight: 700, border: 'none', borderRadius: 4, background: 'var(--color-primary)', color: '#fff', cursor: 'pointer' }}
          >
            OK
          </button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {notes.length === 0 && !adding && (
          <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)' }}>Zatiaľ žiadne odkazy.</div>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            style={{
              position: 'relative',
              padding: '5px 20px 5px 7px',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              fontSize: 10.5,
              lineHeight: 1.4,
            }}
          >
            <button
              onClick={() => deleteDashboardNote(n.id)}
              title="Zmazať"
              style={{
                position: 'absolute',
                top: 3,
                right: 3,
                width: 13,
                height: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                color: 'var(--color-text-faint)',
                cursor: 'pointer',
                fontSize: 11,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.body}</div>
            <div style={{ fontSize: 9, color: 'var(--color-text-faint)', marginTop: 2 }}>
              {n.authorName} · {fmtNoteTime(n.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const panelSelectStyle: CSSProperties = {
  padding: '2px 6px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-2)',
  fontSize: 9.5,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
};

const toolbarInputStyle: CSSProperties = {
  padding: '6px 9px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 11,
};

const toolbarBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 11px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
