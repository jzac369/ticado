import { useState } from 'react';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface Props {
  categories: string[];
  series: LineSeries[];
  height?: number;
}

const PAD = { top: 16, right: 12, bottom: 24, left: 30 };

export function LineAreaChart({ categories, series, height = 220 }: Props) {
  const width = 640;
  const [hover, setHover] = useState<number | null>(null);

  const maxRaw = Math.max(1, ...series.flatMap((s) => s.values));
  const max = Math.ceil(maxRaw / 4) * 4 || 4;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const n = categories.length;

  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  function linePath(values: number[]) {
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  }
  function areaPath(values: number[]) {
    const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
    return `${line} L ${x(n - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`;
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {series.length > 1 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12 }}>
          {series.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill="var(--chart-axis)">
              {t}
            </text>
          </g>
        ))}

        {series.map((s) => (
          <path key={`${s.key}-area`} d={areaPath(s.values)} fill={s.color} opacity={0.1} />
        ))}
        {series.map((s) => (
          <path
            key={`${s.key}-line`}
            d={linePath(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {series.map((s) =>
          s.values.map((v, i) => (
            <circle
              key={`${s.key}-dot-${i}`}
              cx={x(i)}
              cy={y(v)}
              r={hover === i ? 5 : 4}
              fill={s.color}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          )),
        )}

        {categories.map((c, i) => {
          if (n > 8 && i % Math.ceil(n / 7) !== 0 && i !== n - 1) return null;
          return (
            <text key={c} x={x(i)} y={height - 4} textAnchor="middle" fontSize={10.5} fill="var(--chart-axis)">
              {c}
            </text>
          );
        })}

        {categories.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={x(i) - innerW / n / 2}
            y={PAD.top}
            width={innerW / n}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--chart-axis)" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {hover !== null && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          <strong style={{ color: 'var(--color-text)' }}>{categories[hover]}</strong>
          {series.map((s) => (
            <span key={s.key} style={{ marginLeft: 10 }}>
              {s.label}: <strong style={{ color: 'var(--color-text)' }}>{s.values[hover]}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
