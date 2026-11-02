'use client';

// Plain SVG charts: labelled axes, units, legends, no decoration. Missing values (null) leave a gap, never a zero.

type Series = { name: string; color: string; values: (number | null)[]; dashed?: boolean };

export function LineChart({ labels, series, unit, height = 200, max }: { labels: string[]; series: Series[]; unit: string; height?: number; max?: number }) {
  const W = 640;
  const H = height;
  const P = { l: 44, r: 12, t: 12, b: 26 };
  const top = max ?? Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v != null)));
  const x = (i: number) => P.l + (i / Math.max(1, labels.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / top) * (H - P.t - P.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * top);
  const every = Math.ceil(labels.length / 8);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={series.map((s) => s.name).join(', ')}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={P.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--color-mute)">
              {Math.round(v).toLocaleString('en-US')}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 ? (
            <text key={l} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-mute)">
              {l}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          let d = '';
          s.values.forEach((v, i) => {
            if (v == null) return;
            d += `${d && s.values[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
          });
          return <path key={s.name} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} />;
        })}
        <text x={P.l} y={P.t - 2} fontSize="10" fill="var(--color-mute)">
          {unit}
        </text>
      </svg>
      <Legend items={series.map((s) => [s.name, s.color, s.dashed])} />
    </figure>
  );
}

// grouped horizontal bars: one row per item, one bar per measure
export function Bars({ rows, measures, unit, fmt = (v) => String(Math.round(v)) }: { rows: { label: string; values: (number | null)[] }[]; measures: { name: string; color: string }[]; unit: string; fmt?: (v: number) => string }) {
  const top = Math.max(1, ...rows.flatMap((r) => r.values.filter((v): v is number => v != null)));
  return (
    <figure>
      <p className="mb-2 text-right text-[10px] text-mute">{unit}</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-xs">
            <span className="truncate text-fg/85" title={r.label}>
              {r.label}
            </span>
            <div className="space-y-1">
              {r.values.map((v, k) => (
                <div key={k} className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-line/60">{v != null && <div className="h-full rounded-full" style={{ width: `${(v / top) * 100}%`, background: measures[k].color }} />}</div>
                  <span className="w-20 shrink-0 text-right font-mono text-[11px] text-mute tabular-nums">{v == null ? '—' : fmt(v)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Legend items={measures.map((m) => [m.name, m.color])} />
    </figure>
  );
}

// a ring split by category; each slice can be a link target via onPick
export function Donut({ parts, label, onPick }: { parts: { name: string; value: number; color: string; key: string }[]; label: string; onPick?: (key: string) => void }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  let a = -Math.PI / 2;
  const R = 42;
  const r = 28;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="-50 -50 100 100" className="h-28 w-28 shrink-0" role="img" aria-label={label}>
        {total === 0 && <circle r={(R + r) / 2} fill="none" stroke="var(--color-line)" strokeWidth={R - r} />}
        {parts.map((p) => {
          if (!p.value) return null;
          const a0 = a;
          const a1 = (a += (p.value / total) * Math.PI * 2);
          const big = a1 - a0 > Math.PI ? 1 : 0;
          const pt = (rad: number, ang: number) => `${(Math.cos(ang) * rad).toFixed(2)} ${(Math.sin(ang) * rad).toFixed(2)}`;
          const d = p.value === total ? `M${pt(R, 0)}A${R} ${R} 0 1 1 ${pt(R, Math.PI * 1.999)}L${pt(r, Math.PI * 1.999)}A${r} ${r} 0 1 0 ${pt(r, 0)}Z` : `M${pt(R, a0)}A${R} ${R} 0 ${big} 1 ${pt(R, a1)}L${pt(r, a1)}A${r} ${r} 0 ${big} 0 ${pt(r, a0)}Z`;
          return (
            <path key={p.key} d={d} fill={p.color} className={onPick ? 'cursor-pointer hover:opacity-80' : ''} onClick={() => onPick?.(p.key)}>
              <title>{`${p.name}: ${p.value}`}</title>
            </path>
          );
        })}
        <text textAnchor="middle" y="5" fontSize="14" fill="var(--color-fg)" className="font-mono">
          {total}
        </text>
      </svg>
      <ul className="space-y-1 text-xs">
        {parts.map((p) => (
          <li key={p.key}>
            <button type="button" disabled={!onPick} onClick={() => onPick?.(p.key)} className="flex cursor-pointer items-center gap-2 text-left text-fg/85 hover:text-fg disabled:cursor-default">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
              {p.name} <span className="font-mono text-mute">{p.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: [string, string, boolean?][] }) {
  return (
    <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
      {items.map(([n, c, dashed]) => (
        <span key={n} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ background: dashed ? `repeating-linear-gradient(90deg, ${c} 0 4px, transparent 4px 7px)` : c }} />
          {n}
        </span>
      ))}
    </figcaption>
  );
}
