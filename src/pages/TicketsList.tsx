import { useMemo, useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeTickets, isSlaBreached } from '../firebase/tickets';
import type { Ticket, TicketPriority, TicketStatus } from '../types';
import { PRIORITY_LABELS, STATUS_LABELS } from '../types';
import { StatusBadge, PriorityBadge, SlaBadge } from '../components/Badges';

function formatDate(ticket: Ticket, field: 'createdAt' | 'closedAt') {
  const ts = ticket[field];
  if (!ts) return '—';
  return ts.toDate().toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAGE_SIZES = [10, 25, 50, 100];

export function TicketsListPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [quickFilter, setQuickFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    const unsub = subscribeTickets((data) => {
      setTickets(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    let list = [...tickets];

    if (quickFilter === 'open') list = list.filter((t) => t.status !== 'uzavrety');
    if (quickFilter === 'closed') list = list.filter((t) => t.status === 'uzavrety');

    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((t) => (t.createdAt?.toMillis() ?? 0) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000;
      list = list.filter((t) => (t.createdAt?.toMillis() ?? 0) <= to);
    }

    if (search.trim()) {
      const words = search.toLowerCase().split(/\s+/).filter(Boolean);
      const exactPhrase = search.startsWith('"') && search.endsWith('"') && search.length > 1;
      list = list.filter((t) => {
        const haystack = `${t.code} ${t.subject} ${t.customerName} ${t.requesterName}`.toLowerCase();
        if (exactPhrase) return haystack.includes(search.slice(1, -1).toLowerCase());
        return words.every((w) => haystack.includes(w));
      });
    }

    list.sort((a, b) => {
      const at = a.createdAt?.toMillis() ?? 0;
      const bt = b.createdAt?.toMillis() ?? 0;
      return sortBy === 'newest' ? bt - at : at - bt;
    });

    return list;
  }, [tickets, quickFilter, statusFilter, priorityFilter, dateFrom, dateTo, search, sortBy]);

  const stats = useMemo(() => {
    const all = tickets.length;
    const open = tickets.filter((t) => t.status !== 'uzavrety').length;
    const pastSla = tickets.filter(isSlaBreached).length;
    const critical = tickets.filter((t) => t.priority === 'kriticka' && t.status !== 'uzavrety').length;
    const resolved30d = tickets.filter((t) => {
      if (!t.closedAt) return false;
      return t.closedAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000;
    }).length;
    return { all, open, pastSla, critical, resolved30d };
  }, [tickets]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setDateFrom('');
    setDateTo('');
    setQuickFilter('all');
    setPage(1);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>
          SLA PRÍPADY
        </div>
        <h1 style={{ fontSize: 26, margin: '4px 0 4px' }}>Všetky tickety</h1>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13.5 }}>
          Prehľad servisných tiketov, priradenia a plnenia SLA.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <StatCard label="Všetky" value={stats.all} icon="🎫" />
        <StatCard label="Otvorené" value={stats.open} icon="⏳" />
        <StatCard label="Po SLA" value={stats.pastSla} icon="⏰" tone="danger" />
        <StatCard label="Kritické" value={stats.critical} icon="⚠️" tone="warning" />
        <StatCard label="Vyriešené za 30 dní" value={stats.resolved30d} icon="✅" tone="success" />
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          marginBottom: 16,
        }}
      >
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder='Hľadať ID, predmet a zákazníka; viac slov = všetky slová…'
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 14,
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr) auto',
            gap: 12,
            alignItems: 'end',
            marginBottom: 14,
          }}
        >
          <Field label="Stav">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TicketStatus | '');
                setPage(1);
              }}
              style={selectStyle}
            >
              <option value="">Všetky stavy</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priorita">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as TicketPriority | '');
                setPage(1);
              }}
              style={selectStyle}
            >
              <option value="">Všetky priority</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vytvorené od">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={selectStyle} />
          </Field>
          <Field label="Vytvorené do">
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={selectStyle} />
          </Field>
          <button onClick={resetFilters} style={{ ...secondaryBtn, height: 38 }}>
            Reset
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(
            [
              ['all', 'Všetky'],
              ['open', 'Otvorené'],
              ['closed', 'Zatvorené'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setQuickFilter(value);
                setPage(1);
              }}
              style={{
                ...secondaryBtn,
                background: quickFilter === value ? 'var(--color-primary-bg)' : 'var(--color-surface)',
                borderColor: quickFilter === value ? 'var(--color-primary-border)' : 'var(--color-border)',
                color: quickFilter === value ? 'var(--color-primary)' : 'var(--color-text)',
              }}
            >
              {label}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')} style={selectStyle}>
              <option value="newest">Najnovšie</option>
              <option value="oldest">Najstaršie</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={selectStyle}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} na stránku
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>
        {filtered.length} tiketov · zobrazené {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--color-surface-2)' }}>
              {['Ticket', 'Predmet a zákazník', 'Stav', 'Priorita', 'Vytvorený', 'Uzavretý', 'SLA', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-faint)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Načítavam tickety…
                </td>
              </tr>
            )}
            {!loading && paged.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Žiadne tickety nezodpovedajú filtru.
                </td>
              </tr>
            )}
            {paged.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{ borderTop: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>{t.code}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600 }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    {t.requesterName} · {t.customerName}
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <PriorityBadge priority={t.priority} />
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)' }}>{formatDate(t, 'createdAt')}</td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)' }}>{formatDate(t, 'closedAt')}</td>
                <td style={{ padding: '12px 14px' }}>
                  <SlaBadge breached={isSlaBreached(t)} />
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-faint)' }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={secondaryBtn}>
            ‹ Predchádzajúca
          </button>
          <span style={{ padding: '8px 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={secondaryBtn}>
            Ďalšia ›
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-faint)', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone?: 'danger' | 'warning' | 'success';
}) {
  const color =
    tone === 'danger' ? 'var(--color-danger)' : tone === 'warning' ? 'var(--color-warning)' : tone === 'success' ? 'var(--color-success)' : 'var(--color-primary)';
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          background: color + '1a',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  height: 38,
};

const secondaryBtn: CSSProperties = {
  padding: '8px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  fontSize: 13,
  fontWeight: 600,
};
