'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { PACKAGES, STATUS_FILL, type Pkg } from '@/lib/packages';

const USD_RATE = 3450;
const PAID = '#9fbcc8'; // money paid, distinct from physical progress

// Construction control: for every work package, how much work is done and how much money has been paid, both
// against where the schedule says the package should be today. Where they drift apart, the panel says so.
export default function PackageTable() {
  const t = useTranslations('system.control');
  const td = useTranslations('system.data');
  const en = useLocale() === 'en';
  const [sel, setSel] = useState('PKG-02');
  const money = (bn: number) => (en ? `$${((bn * 1e9) / USD_RATE / 1e6).toFixed(1)}M` : `${bn.toFixed(1)} ${t('bn')}`);
  const company = (p: Pkg) => (p.contractor ? td('company', { c: p.contractor }) : td('notAwarded'));
  const paidPct = (p: Pkg) => (p.budget ? Math.round((p.paid / p.budget) * 100) : 0);
  const p = PACKAGES.find((x) => x.id === sel)!;
  const gap = paidPct(p) - p.progress;
  const warn = p.status !== 'planned' && (gap > 10 || p.progress < p.planned - 5);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div>
        {/* legend for the bars */}
        <p className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-accent" />
            {t('progress')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full" style={{ background: PAID }} />
            {t('paid')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-fg" />
            {t('plannedToday')}
          </span>
        </p>

        <ul className="border-t border-line">
          {PACKAGES.map((x) => {
            const on = x.id === sel;
            return (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => setSel(x.id)}
                  aria-pressed={on}
                  className={`grid w-full cursor-pointer grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b border-line/60 px-3 py-3 text-left transition-colors sm:grid-cols-[150px_1fr_auto] ${
                    on ? 'bg-surface' : 'hover:bg-surface/50'
                  }`}
                >
                  <span>
                    <span className="block font-mono text-sm">{x.id}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-mute">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_FILL[x.status] }} />
                      {td(`st.${x.status}`)}
                    </span>
                  </span>
                  <span className="col-span-2 row-start-2 space-y-1.5 sm:col-span-1 sm:row-start-auto">
                    <Bar value={x.progress} tick={x.planned} color={STATUS_FILL[x.status] === STATUS_FILL.done ? STATUS_FILL.done : '#3b82f6'} label={`${x.progress}%`} />
                    <Bar value={paidPct(x)} tick={x.planned} color={PAID} label={`${paidPct(x)}%`} />
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm">{money(x.budget)}</span>
                    <span className="block text-xs text-mute">{company(x)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24" aria-live="polite">
        <p className="font-mono text-xs text-mute">ID {p.id}</p>
        <h3 className="mt-1 text-xl">{company(p)}</h3>

        {/* the three numbers that matter, side by side */}
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            [t('plannedToday'), p.planned, '#eaf1ff'],
            [t('progress'), p.progress, '#3b82f6'],
            [t('paid'), paidPct(p), PAID],
          ].map(([k, v, c]) => (
            <div key={k as string} className="rounded-md border border-line/70 px-2 py-3">
              <p className="font-mono text-2xl" style={{ color: c as string }}>
                {v}%
              </p>
              <p className="mt-1 text-[11px] leading-tight text-mute">{k}</p>
            </div>
          ))}
        </div>

        <dl className="mt-5 font-mono text-sm">
          {[
            [t('budget'), money(p.budget)],
            [t('paid'), money(p.paid)],
            [t('due'), p.due],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-t border-line/60 py-2">
              <dt className="text-mute">{k}</dt>
              <dd className="text-fg">{v}</dd>
            </div>
          ))}
        </dl>
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${warn ? 'bg-accent/10 text-accent' : 'bg-line/40 text-mute'}`}>
          {p.status === 'planned'
            ? t('note.planned')
            : gap > 10
              ? t('note.overpaid', { n: gap })
              : p.progress < p.planned - 5
                ? t('note.behind', { n: p.planned - p.progress })
                : t('note.ok')}
        </p>
      </div>
    </div>
  );
}

// A thin bar with a tick at the scheduled value.
function Bar({ value, tick, color, label }: { value: number; tick: number; color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="relative block h-2 flex-1 rounded-full bg-line">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, background: color }} />
        {tick > 0 && <span className="absolute -top-1 h-4 w-0.5 bg-fg" style={{ left: `${tick}%` }} />}
      </span>
      <span className="w-9 text-right font-mono text-xs text-mute">{label}</span>
    </span>
  );
}
