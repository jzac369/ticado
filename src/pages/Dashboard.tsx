import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets, isSlaBreached } from '../firebase/tickets';
import type { Ticket } from '../types';
import { STATUS_LABELS } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badges';

export function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const navigate = useNavigate();

  useEffect(() => subscribeTickets(setTickets), []);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'uzavrety').length;
    const pastSla = tickets.filter(isSlaBreached).length;
    const critical = tickets.filter((t) => t.priority === 'kriticka' && t.status !== 'uzavrety').length;
    const closedToday = tickets.filter((t) => {
      if (!t.closedAt) return false;
      const d = t.closedAt.toDate();
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    return { open, pastSla, critical, closedToday };
  }, [tickets]);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    Object.keys(STATUS_LABELS).forEach((k) => (map[k] = 0));
    tickets.forEach((t) => (map[t.status] = (map[t.status] ?? 0) + 1));
    return map;
  }, [tickets]);

  const recent = tickets.slice(0, 6);
  const maxStatusCount = Math.max(1, ...Object.values(byStatus));

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>Dashboard</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Rýchly prehľad prevádzky ServiceDesku.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <Card label="Otvorené tickety" value={stats.open} tone="var(--color-info)" />
        <Card label="Po SLA" value={stats.pastSla} tone="var(--color-danger)" />
        <Card label="Kritické" value={stats.critical} tone="var(--color-warning)" />
        <Card label="Uzavreté dnes" value={stats.closedToday} tone="var(--color-success)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Tickety podľa stavu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 700 }}>{byStatus[key] ?? 0}</span>
                </div>
                <div style={{ height: 8, background: 'var(--color-surface-2)', borderRadius: 999 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${((byStatus[key] ?? 0) / maxStatusCount) * 100}%`,
                      background: 'var(--color-primary)',
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 700 }}>Posledné tickety</div>
            <button
              onClick={() => navigate('/tickets')}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: 12.5 }}
            >
              Zobraziť všetky →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-2)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--color-primary)' }}>{t.code}</div>
                  <div style={{ fontSize: 13 }}>{t.subject}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
            {recent.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Zatiaľ žiadne tickety.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--color-text-faint)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}
