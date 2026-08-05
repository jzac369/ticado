import { useEffect, useMemo, useState } from 'react';
import { subscribeTickets, subscribeRecentMessages } from '../firebase/tickets';
import { subscribeAgents } from '../firebase/agents';
import { subscribeLiveChats, type LiveChat } from '../firebase/livechat';
import type { Ticket, TicketMessage } from '../types';
import { RankBarList } from '../components/charts/RankBarList';

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dní`;
}

export function AnalyticsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [agentNames, setAgentNames] = useState<string[]>([]);
  const [chats, setChats] = useState<LiveChat[]>([]);

  useEffect(() => subscribeTickets(setTickets), []);
  useEffect(() => subscribeRecentMessages(setMessages, 2000), []);
  useEffect(() => subscribeAgents((agents) => setAgentNames(agents.map((a) => a.name))), []);
  useEffect(() => subscribeLiveChats(setChats), []);

  const chatStats = useMemo(() => {
    const withReply = chats.filter((c) => c.firstAgentReplyAt && c.createdAt);
    const avgResponseHours = withReply.length
      ? withReply.reduce((sum, c) => sum + (c.firstAgentReplyAt!.toMillis() - c.createdAt!.toMillis()), 0) / withReply.length / (60 * 60 * 1000)
      : null;

    const byDay = new Map<string, number>();
    chats.forEach((c) => {
      if (!c.createdAt) return;
      const key = c.createdAt.toDate().toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' });
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    });
    const last7 = [...byDay.entries()].slice(-7);
    const avgPerDay = last7.length ? last7.reduce((s, [, n]) => s + n, 0) / last7.length : 0;

    const converted = chats.filter((c) => c.convertedTicketCode).length;
    const conversionRate = chats.length ? (converted / chats.length) * 100 : 0;

    return {
      total: chats.length,
      avgResponseHours,
      avgPerDay,
      converted,
      conversionRate,
    };
  }, [chats]);

  const firstResponseByTicket = useMemo(() => {
    const byTicket = new Map<string, TicketMessage[]>();
    messages.forEach((m) => {
      const list = byTicket.get(m.ticketId) ?? [];
      list.push(m);
      byTicket.set(m.ticketId, list);
    });
    const result = new Map<string, number>();
    byTicket.forEach((msgs, ticketId) => {
      const sorted = [...msgs].sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      const firstReply = sorted.find(
        (m) => !m.isPrivate && m.authorName !== ticket.requesterName && m.createdAt && ticket.createdAt,
      );
      if (firstReply?.createdAt && ticket.createdAt) {
        result.set(ticketId, (firstReply.createdAt.toMillis() - ticket.createdAt.toMillis()) / (60 * 60 * 1000));
      }
    });
    return result;
  }, [messages, tickets]);

  const stats = useMemo(() => {
    const byAgent = new Map<
      string,
      { assigned: number; resolved: number; resolutionHours: number[]; responseHours: number[] }
    >();
    agentNames.forEach((name) => byAgent.set(name, { assigned: 0, resolved: 0, resolutionHours: [], responseHours: [] }));

    tickets.forEach((t) => {
      if (!t.assignedTo) return;
      if (!byAgent.has(t.assignedTo)) byAgent.set(t.assignedTo, { assigned: 0, resolved: 0, resolutionHours: [], responseHours: [] });
      const entry = byAgent.get(t.assignedTo)!;
      entry.assigned += 1;
      if (t.status === 'uzavrety' && t.closedAt && t.createdAt) {
        entry.resolved += 1;
        entry.resolutionHours.push((t.closedAt.toMillis() - t.createdAt.toMillis()) / (60 * 60 * 1000));
      }
      const responseHours = firstResponseByTicket.get(t.id);
      if (responseHours !== undefined) entry.responseHours.push(responseHours);
    });

    const avg = (arr: number[]) => (arr.length === 0 ? null : arr.reduce((s, v) => s + v, 0) / arr.length);

    return [...byAgent.entries()]
      .map(([name, e]) => ({
        name,
        assigned: e.assigned,
        resolved: e.resolved,
        avgResolutionHours: avg(e.resolutionHours),
        avgResponseHours: avg(e.responseHours),
      }))
      .sort((a, b) => b.resolved - a.resolved);
  }, [tickets, agentNames, firstResponseByTicket]);

  const responseRanking = stats
    .filter((s) => s.avgResponseHours !== null)
    .sort((a, b) => (a.avgResponseHours ?? 0) - (b.avgResponseHours ?? 0))
    .map((s) => ({ label: s.name, value: Math.round((s.avgResponseHours ?? 0) * 10) / 10, sublabel: formatHours(s.avgResponseHours ?? 0) }));

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NASTAVENIA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Analytika technikov</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Reakčný čas a výkonnosť IT technikov podľa priradených tiketov.
      </p>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 14 }}>Priemerný reakčný čas (prvá odpoveď)</div>
        <RankBarList items={responseRanking} color="var(--chart-series-1)" />
        {responseRanking.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)' }}>Zatiaľ nie sú dostupné dáta.</div>
        )}
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14.5 }}>
          Rebríček výkonnosti
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--color-surface-2)' }}>
              {['#', 'Technik', 'Priradené', 'Vyriešené', 'Priem. čas vyriešenia', 'Priem. reakčný čas'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Zatiaľ žiadni technici s priradenými tiketmi.
                </td>
              </tr>
            )}
            {stats.map((s, i) => (
              <tr key={s.name} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-faint)' }}>{i + 1}</td>
                <td style={{ padding: '12px 14px', fontWeight: 700 }}>{s.name}</td>
                <td style={{ padding: '12px 14px' }}>{s.assigned}</td>
                <td style={{ padding: '12px 14px' }}>{s.resolved}</td>
                <td style={{ padding: '12px 14px' }}>{s.avgResolutionHours !== null ? formatHours(s.avgResolutionHours) : '—'}</td>
                <td style={{ padding: '12px 14px' }}>{s.avgResponseHours !== null ? formatHours(s.avgResponseHours) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, margin: '24px 0 12px' }}>Live chat</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <ChatStatCard label="Priemerná doba prvej odpovede" value={chatStats.avgResponseHours !== null ? formatHours(chatStats.avgResponseHours) : '—'} />
        <ChatStatCard label="Chatov / deň (posledných 7 dní)" value={chatStats.avgPerDay.toFixed(1)} />
        <ChatStatCard label="Prevedené na tiket" value={`${chatStats.converted} / ${chatStats.total}`} />
        <ChatStatCard label="Konverzný pomer chat → tiket" value={`${chatStats.conversionRate.toFixed(0)} %`} />
      </div>
    </div>
  );
}

function ChatStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
    </div>
  );
}
