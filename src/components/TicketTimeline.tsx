import type { ActivityEntry } from '../types';

function fmt(ts: ActivityEntry['createdAt']) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function iconFor(text: string): { icon: string; color: string } {
  if (text.includes('vytvorený')) return { icon: '🆕', color: 'var(--color-info)' };
  if (text.includes('Stav zmenený') && text.includes('uzavrety')) return { icon: '🔒', color: 'var(--color-success)' };
  if (text.includes('Stav zmenený')) return { icon: '🔄', color: 'var(--color-info)' };
  if (text.includes('Priradené') || text.includes('priradené')) return { icon: '👤', color: 'var(--color-primary)' };
  if (text.includes('odstránené')) return { icon: '↩️', color: 'var(--color-text-faint)' };
  if (text.includes('privátna') || text.includes('Privátna')) return { icon: '🔐', color: 'var(--color-warning)' };
  if (text.includes('odpoveď')) return { icon: '💬', color: 'var(--color-info)' };
  return { icon: '•', color: 'var(--color-text-faint)' };
}

export function TicketTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)' }}>Žiadna aktivita.</div>;
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 4 }}>
      <div style={{ position: 'absolute', left: 13, top: 4, bottom: 4, width: 2, background: 'var(--color-border)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {entries.map((a) => {
          const { icon, color } = iconFor(a.text);
          return (
            <div key={a.id} style={{ display: 'flex', gap: 10, position: 'relative' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--color-surface)',
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {icon}
              </div>
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.text}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                  {a.actor} · {fmt(a.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
