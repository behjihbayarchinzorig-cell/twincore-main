'use client';

import { useTranslations } from 'next-intl';
import { FLOORS, STAGE_WEEKS, TODAY, UNITS, WEEKS, actual, planned } from '@/lib/twin';

// The schedule from today to the finished building, for the monitoring module.

const START = Date.UTC(2026, 1, 2); // first site week
const dateAt = (w: number) => new Date(START + w * 7 * 864e5).toISOString().slice(0, 10);
// how many weeks the work is behind: the week at which the plan reached today's actual progress
const LAG = (() => {
  const a = actual(TODAY) ?? 0;
  let w = 0;
  while (w < WEEKS && planned(w) < a) w += 0.1;
  return Math.round(TODAY - w);
})();
const FORECAST_END = WEEKS + LAG;
const SPAN = FORECAST_END + 2;
const STAGE_KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;
const MILESTONES: { k: 'topout' | 'closed' | 'commission' | 'handover'; w: number }[] = [
  { k: 'topout', w: 40 },
  { k: 'closed', w: 50 },
  { k: 'commission', w: 57 },
  { k: 'handover', w: 60 },
];
// forecast for a planned week: work still ahead slips by the lag
const fc = (w: number) => (w <= TODAY - LAG ? w : w + LAG);

export function ToHandover() {
  const t = useTranslations('system.monitor.handover');
  const tc = useTranslations('system.control.stages');
  const pct = (w: number) => `${(w / SPAN) * 100}%`;
  const done = Math.round(actual(TODAY) ?? 0);
  const left = Math.max(0, FORECAST_END - TODAY);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-lg border border-line bg-surface p-5">
        <div className="relative">
          {/* the today line runs through every row */}
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 sm:left-[24%]">
            <span className="absolute inset-y-0 w-px bg-accent" style={{ left: pct(TODAY) }} />
            <span className="absolute -top-1 -translate-x-1/2 rounded bg-grad px-1.5 py-0.5 font-mono text-[10px] text-white" style={{ left: pct(TODAY) }}>
              {t('today')}
            </span>
          </div>

          <ol className="space-y-3 pt-6">
            {STAGE_WEEKS.map(([a, b], i) => {
              const fa = fc(a);
              const fb = fc(b);
              const doneTo = Math.min(TODAY, fb);
              const state = fb <= TODAY ? 'done' : fa < TODAY ? 'active' : 'next';
              return (
                <li key={i} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[24%_1fr]">
                  <span className="truncate text-sm">
                    <span className={state === 'done' ? 'text-mute' : 'text-fg'}>{tc(STAGE_KEYS[i])}</span>
                  </span>
                  <span className="relative h-6">
                    {/* the plan, faint, and the forecast over it */}
                    <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" style={{ left: pct(a), width: pct(b - a) }} />
                    <span className="absolute inset-y-1 rounded border border-accent/50" style={{ left: pct(fa), width: pct(fb - fa) }} />
                    {doneTo > fa && <span className="absolute inset-y-1 rounded bg-accent/70" style={{ left: pct(fa), width: pct(doneTo - fa) }} />}
                  </span>
                </li>
              );
            })}
            {/* milestones on one line */}
            <li className="grid items-center gap-x-3 gap-y-1 border-t border-line/60 pt-3 sm:grid-cols-[24%_1fr]">
              <span className="text-sm text-mute">{t('milestones')}</span>
              <span className="relative h-6">
                {MILESTONES.map((m) => (
                  <span
                    key={m.k}
                    title={`${t(`m.${m.k}`)} · ${dateAt(fc(m.w))}`}
                    className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 ${m.k === 'handover' ? 'bg-accent' : 'border border-accent bg-ink'}`}
                    style={{ left: pct(fc(m.w)) }}
                  />
                ))}
              </span>
            </li>
          </ol>
        </div>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
          <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-line" />{t('legend.plan')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border border-accent/50" />{t('legend.forecast')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-accent/70" />{t('legend.done')}</span>
        </p>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {MILESTONES.map((m) => (
            <li key={m.k} className="flex items-center justify-between gap-3 rounded-md bg-ink/50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rotate-45 ${m.k === 'handover' ? 'bg-accent' : 'border border-accent'}`} />
                {t(`m.${m.k}`)}
              </span>
              <span className="font-mono text-xs text-mute">{dateAt(fc(m.w))}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* the finished product */}
      <div className="rounded-lg border border-accent/50 bg-accent/5 p-5">
        <p className="text-xs text-accent">{t('product')}</p>
        <p className="mt-2 font-mono text-3xl tabular-nums">{dateAt(FORECAST_END)}</p>
        <p className="mt-1 text-sm text-mute">{t('vsPlan', { d: dateAt(WEEKS), n: LAG })}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${done}%` }} />
        </div>
        <p className="mt-2 flex justify-between font-mono text-xs">
          <span>{t('done', { n: done })}</span>
          <span className="text-mute">{t('left', { n: left })}</span>
        </p>
        <dl className="mt-5 space-y-1.5 text-sm">
          {(
            [
              [t('spec.floors'), String(FLOORS)],
              [t('spec.homes'), String((FLOORS - 1) * UNITS)],
              [t('spec.retail'), t('spec.retailV')],
              [t('spec.handover'), t('spec.handoverV')],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-t border-line/60 pt-1.5">
              <dt className="text-mute">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
