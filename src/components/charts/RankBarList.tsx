export interface RankItem {
  label: string;
  value: number;
  sublabel?: string;
}

export function RankBarList({ items, color = 'var(--chart-series-1)' }: { items: RankItem[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>{item.label}</span>
            <span style={{ fontWeight: 700 }}>{item.value}</span>
          </div>
          <div style={{ height: 8, background: 'var(--color-surface-2)', borderRadius: 999 }}>
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
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 3 }}>{item.sublabel}</div>
          )}
        </div>
      ))}
      {items.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)' }}>Žiadne dáta.</div>}
    </div>
  );
}
