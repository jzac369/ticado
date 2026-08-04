import type { TicketPriority, TicketStatus } from '../types';
import { PRIORITY_LABELS, STATUS_LABELS } from '../types';

export const statusColors: Record<TicketStatus, { fg: string; bg: string }> = {
  otvoreny: { fg: 'var(--color-info)', bg: 'var(--color-info-bg)' },
  v_rieseni: { fg: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  caka_na_klienta: { fg: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  uzavrety: { fg: 'var(--color-success)', bg: 'var(--color-success-bg)' },
};

export const priorityColors: Record<TicketPriority, { fg: string; bg: string }> = {
  nizka: { fg: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' },
  normalna: { fg: 'var(--color-info)', bg: 'var(--color-info-bg)' },
  vysoka: { fg: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  kriticka: { fg: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
};

function Pill({ label, fg, bg, dot }: { label: string; fg: string; bg: string; dot?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        color: fg,
        background: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: fg }} />}
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const c = statusColors[status];
  return <Pill label={STATUS_LABELS[status]} fg={c.fg} bg={c.bg} dot />;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const c = priorityColors[priority];
  return <Pill label={PRIORITY_LABELS[priority]} fg={c.fg} bg={c.bg} />;
}
