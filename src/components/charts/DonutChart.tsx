export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, size = 140 }: { data: DonutSlice[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offsetAcc = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--chart-grid)" strokeWidth={16} />
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
                  strokeWidth={16}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeLinecap="butt"
                  transform={`rotate(${rotation} ${center} ${center})`}
                />
              );
            })}
        <text x={center} y={center - 4} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--color-text)">
          {total}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fontSize={10.5} fill="var(--color-text-faint)">
          spolu
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>{d.label}</span>
            <span style={{ fontWeight: 700, marginLeft: 'auto' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
