import type { Deck } from '@/lib/deck';
import { TODAY, WEEKS, actual, planned } from '@/lib/twin';

// The deck's three system slides, as page sections: the planning flow, the construction process and the
// platform after handover. Static markup, so it reads the same with or without JavaScript.

// ---- Planning: five steps, with the options ↔ evaluate loop ---------------------------------------------------
export function PlanningFlow({ d }: { d: Deck['planning'] }) {
  return (
    <div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
        {d.steps.map((s, i) => {
          const last = i === d.steps.length - 1;
          return (
            <li key={s.title} className={`relative flex flex-col rounded-2xl border p-5 ${last ? 'border-accent/60 bg-accent/10' : 'border-line bg-ink/60'}`}>
              {/* the arrow on to the next step (wide screens) */}
              {!last && (
                <span aria-hidden="true" className="absolute top-1/2 -right-[13px] z-10 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink text-xs text-mute lg:grid">
                  →
                </span>
              )}
              <div className="flex items-center justify-between">
                <span className={`font-mono text-sm ${last ? 'text-accent-hi' : 'text-mute'}`}>0{i + 1}</span>
                <PlanIcon i={i} on={last} />
              </div>
              <p className={`mt-6 text-xl font-medium ${last ? 'text-grad' : 'text-fg'}`}>{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg/75">{s.desc}</p>
              <p className="mt-auto pt-5 text-xs leading-relaxed text-mute">{s.items.join(' · ')}</p>
            </li>
          );
        })}
      </ol>
      {/* steps 3 and 4 go round until an option is good enough */}
      <div className="mt-4 hidden grid-cols-5 gap-4 lg:grid">
        <div className="col-span-2 col-start-3 flex items-center gap-2 rounded-full border border-dashed border-accent/50 px-4 py-1.5 text-xs text-accent-hi">
          <span aria-hidden="true">↺</span> 03 ⇄ 04 · {d.loop}
        </div>
      </div>
      <p className="mt-4 text-xs text-accent-hi lg:hidden">↺ 03 ⇄ 04 · {d.loop}</p>
    </div>
  );
}

// small drawings for the five planning steps: the site, layers, options, a comparison, the approved model
function PlanIcon({ i, on }: { i: number; on: boolean }) {
  const c = on ? 'var(--color-accent-hi)' : 'var(--color-mute)';
  const paths = [
    'M4 18l5-6 4 3 7-8M17 5h3v3M12 10.5a1.5 1.5 0 1 0 0-.01',
    'M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5',
    'M3 4h7v7H3zM14 4h7v4h-7zM14 11h7v9h-7zM3 14h7v6H3z',
    'M5 20V11M10 20V6M15 20v-6M20 20V9M3 20h18',
    'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  ];
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[i % paths.length]} />
    </svg>
  );
}

// ---- Construction process: delivery line, six controls, S-curve ----------------------------------------------
export function BuildProcess({ d }: { d: Deck['build'] }) {
  const W = 360;
  const H = 150;
  const x = (w: number) => 10 + (w / WEEKS) * (W - 20);
  const y = (p: number) => H - 14 - (p / 100) * (H - 28);
  const line = (f: (w: number) => number | null, to: number) =>
    Array.from({ length: to + 1 }, (_, w) => f(w))
      .map((v, w) => (v == null ? '' : `${w ? 'L' : 'M'}${x(w).toFixed(1)} ${y(v).toFixed(1)}`))
      .join(' ');
  const now = actual(TODAY) ?? 0;

  return (
    <div>
      {/* what gets built, through to handover */}
      <div className="no-scrollbar -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex min-w-[560px] items-center gap-4">
          <span className="w-24 shrink-0 font-mono text-[11px] tracking-wide text-mute uppercase">{d.kindsLabel}</span>
          <ol className="relative flex flex-1 justify-between">
            <span className="absolute inset-x-2 top-[7px] h-px bg-line" aria-hidden="true" />
            {d.kinds.map((k, i) => {
              const last = i === d.kinds.length - 1;
              return (
                <li key={k} className="relative flex flex-col items-center gap-2 text-center">
                  <span className={`h-3.5 w-3.5 rounded-full border-2 ${last ? 'border-accent bg-accent' : 'border-mute bg-ink'}`} />
                  <span className={`max-w-[120px] text-xs ${last ? 'text-accent' : 'text-fg'}`}>{k}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)]">
        <div className="rounded-lg border border-line p-5">
          <p className="text-lg font-medium text-accent">{d.controlsTitle}</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {d.controls.map((c, i) => (
              <li key={c.title} className="rounded-md bg-surface p-4">
                <p className="flex items-start gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-[11px] text-accent">{i + 1}</span>
                  <span className="text-sm leading-snug font-medium">{c.title}</span>
                </p>
                <p className="mt-3 border-t border-line pt-3 text-xs text-mute">{c.desc}</p>
              </li>
            ))}
          </ol>
        </div>

        <span className="hidden self-center text-2xl text-accent lg:block" aria-hidden="true">
          →
        </span>

        <div className="rounded-lg border border-line p-5">
          <p className="text-lg font-medium text-accent">{d.resultTitle}</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full rounded-md bg-surface" role="img" aria-label={d.curveNote}>
            <text x="12" y="14" fontSize="9" fill="var(--color-mute)">100%</text>
            <text x="12" y={H - 4} fontSize="9" fill="var(--color-mute)">0%</text>
            <path d={`${line(actual, TODAY)} L${x(TODAY)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="var(--color-accent)" opacity=".14" />
            <path d={line(planned, WEEKS)} fill="none" stroke="#9fbcc8" strokeWidth="2" />
            <path d={line(actual, TODAY)} fill="none" stroke="var(--color-accent)" strokeWidth="2.2" />
            <circle cx={x(TODAY)} cy={y(now)} r="4" fill="var(--color-accent)" />
            <text x={x(TODAY) + 7} y={y(now) + 4} fontSize="10" fill="var(--color-accent)">
              {d.today}
            </text>
          </svg>
          <p className="mt-2 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-mute">
              <span className="h-0.5 w-4 bg-[#9fbcc8]" />
              {d.plan}
            </span>
            <span className="flex items-center gap-1.5 text-mute">
              <span className="h-0.5 w-4 bg-accent" />
              {d.actual}
            </span>
          </p>
          <p className="mt-1 text-xs text-mute">{d.curveNote}</p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {d.results.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---- Platform: four directions around the building -----------------------------------------------------------
export function PlatformDirections({ d }: { d: Deck['platform'] }) {
  const card = (k: Deck['platform']['directions'][number]) => (
    <div className={`rounded-lg border-t-2 bg-surface p-5 ${k.accent ? 'border-accent' : 'border-mute/60'}`}>
      <p className={`text-lg font-medium ${k.accent ? 'text-accent' : 'text-fg'}`}>{k.title}</p>
      <p className="mt-1 text-sm text-mute">{k.desc}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {k.chips.map((c) => (
          <li key={c} className="rounded-md border border-line bg-ink px-2.5 py-1 text-xs">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
  const [a, b, c, e] = d.directions;
  return (
    <div className="grid items-center gap-4 lg:grid-cols-[1fr_minmax(220px,0.8fr)_1fr]">
      <div className="grid gap-4">
        {card(a)}
        {card(c)}
      </div>
      {/* the building in operation, at the centre of the four directions */}
      <div className="order-first flex flex-col items-center gap-3 py-4 lg:order-none">
        <svg viewBox="0 0 160 170" className="h-44 w-auto" aria-hidden="true">
          <ellipse cx="80" cy="150" rx="70" ry="14" fill="var(--color-accent)" opacity=".12" />
          <path d="M20 140 L80 160 L140 140 L80 120 Z" fill="#7fa36a" opacity=".55" />
          <path d="M40 132 L40 40 L80 28 L80 120 Z" fill="#c9c2bc" />
          <path d="M80 120 L80 28 L112 40 L112 132 Z" fill="#9a8f86" />
          <path d="M84 126 L84 58 L120 48 L120 118 Z" fill="#d8d0ca" />
          <path d="M120 118 L120 48 L138 56 L138 128 Z" fill="#8a7f77" />
          {Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 3 }, (_, col) => <rect key={`${r}${col}`} x={45 + col * 11} y={48 + r * 9 - col * 3} width="6" height="5" fill="#334155" />),
          )}
          {Array.from({ length: 6 }, (_, r) =>
            Array.from({ length: 3 }, (_, col) => <rect key={`b${r}${col}`} x={88 + col * 10} y={64 + r * 9 - col * 3} width="6" height="5" fill="#5e5550" />),
          )}
        </svg>
        <p className="font-mono text-xs text-accent">{d.centre}</p>
      </div>
      <div className="grid gap-4">
        {card(b)}
        {card(e)}
      </div>
    </div>
  );
}
