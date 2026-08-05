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
  const max = Math.ceil(maxRaw / 2) * 2 || 2;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const n = categories.length;

  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const ticksY = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1].map((f) => Math.round(max * f * 10) / 10);

  // Smooth curve through the points via cubic Beziers (Catmull-Rom-ish),
  // instead of straight segments - softer, easier to read at a glance.
  function smoothPath(values: number[]) {
    const pts = values.map((v, i) => [x(i), y(v)] as const);
    if (pts.length < 2) return pts.length === 1 ? `M ${pts[0][0]} ${pts[0][1]}` : '';
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i === 0 ? 0 : i - 1];
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const [x3, y3] = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = x1 + (x2 - x0) / 6;
      const cp1y = y1 + (y2 - y0) / 6;
      const cp2x = x2 - (x3 - x1) / 6;
      const cp2y = y2 - (y3 - y1) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
    return d;
  }
  function linePath(values: number[]) {
    return smoothPath(values);
  }
  function areaPath(values: number[]) {
    return `${smoothPath(values)} L ${x(n - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`;
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {series.length > 1 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 10.5 }}>
          {series.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={0.5} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--chart-axis)">
              {t}
            </text>
          </g>
        ))}

        {series.map((s) => (
          <path key={`${s.key}-area`} d={areaPath(s.values)} fill={s.color} opacity={0.06} />
        ))}
        {series.map((s) => (
          <path
            key={`${s.key}-line`}
            d={linePath(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={1}
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
              r={hover === i ? 3.5 : 1.8}
              fill={s.color}
              stroke="var(--color-surface)"
              strokeWidth={1}
            />
          )),
        )}

        {categories.map((c, i) => {
          if (n > 8 && i % Math.ceil(n / 7) !== 0 && i !== n - 1) return null;
          return (
            <text key={c} x={x(i)} y={height - 4} textAnchor="middle" fontSize={9} fill="var(--chart-axis)">
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
