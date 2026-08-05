export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, size = 140 }: { data: DonutSlice[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const strokeWidth = Math.max(6, size * 0.115);
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const compact = size < 100;

  let offsetAcc = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 18 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--chart-grid)" strokeWidth={strokeWidth} />
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((d) => {
              const frac = d.value / total;
              const dash = frac * circumference;
              const gap = circumference - dash;
              const rotation = (offsetAcc / total) * 360 - 90;
              offsetAcc += d.value;
              return (
                <circle
                  key={d.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeLinecap="butt"
                  transform={`rotate(${rotation} ${center} ${center})`}
                />
              );
            })}
        <text x={center} y={center + (compact ? 4 : -4)} textAnchor="middle" fontSize={compact ? 15 : 20} fontWeight={700} fill="var(--color-text)">
          {total}
        </text>
        {!compact && (
          <text x={center} y={center + 14} textAnchor="middle" fontSize={10.5} fill="var(--color-text-faint)">
Spolu
          </text>
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 3 : 6 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: compact ? 5 : 8, fontSize: compact ? 11 : 12.5 }}>
            <span style={{ width: compact ? 7 : 10, height: compact ? 7 : 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>{d.label}</span>
            <span style={{ fontWeight: 700, marginLeft: 'auto' }}>
              {d.value}
              {total > 0 && (
                <span style={{ color: 'var(--color-text-faint)', fontWeight: 600 }}> ({Math.round((d.value / total) * 100)}%)</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
