export interface RankItem {
  label: string;
  value: number;
  /** What to show as the number instead of the raw `value` (which only
   * drives the bar's proportional width) - e.g. a formatted duration. */
  displayValue?: string;
  sublabel?: string;
}

export function RankBarList({ items, color = 'var(--chart-series-1)' }: { items: RankItem[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            <span style={{ fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>{item.displayValue ?? item.value}</span>
          </div>
          <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 999 }}>
            <div
              style={{
                height: '100%',
                width: `${(item.value / max) * 100}%`,
                background: color,
                borderRadius: 999,
              }}
            />
          </div>
          {item.sublabel && (
            <div style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 2 }}>{item.sublabel}</div>
          )}
        </div>
      ))}
      {items.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)' }}>Žiadne dáta.</div>}
    </div>
  );
}
