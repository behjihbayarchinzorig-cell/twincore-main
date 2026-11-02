'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { TRACKED } from '@/lib/figures';

// The "Products" menu, in three parts: the complete system as a sequence (plan → construction → ready-to-use smart
// platform), the complete database (its four kinds of data), and what the system is tracking today (four figures
// from the demo project's records). On the desktop the three sit side by side under the header; on phones they are
// a list that opens in place, one at a time.

type Part = 'system' | 'data' | 'tracked';
type Step = 'plan' | 'build' | 'ready';
type Datum = 'gis' | 'bim' | 'aerial' | 'finance';
type Stat = 'buildings' | 'workers' | 'machines' | 'budget';

const STEPS: { key: Step; href: string }[] = [
  { key: 'plan', href: '/system/data' },
  { key: 'build', href: '/system/control' },
  { key: 'ready', href: '/system/twin' },
];
const DATA: { key: Datum; href: string }[] = [
  { key: 'gis', href: '/system/data#map' },
  { key: 'bim', href: '/system/twin#lod' },
  { key: 'aerial', href: '/system/data' },
  { key: 'finance', href: '/construction/finance' },
];
const STATS: Stat[] = ['buildings', 'workers', 'machines', 'budget'];
const WORKSPACE = '/construction';

// small line icons, drawn like the rest of the site's (24-unit grid, round caps)
const ICON: Record<Part | Datum | Stat, ReactNode> = {
  system: <path d="M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5" />,
  data: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
  tracked: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M10 10v10" />
    </>
  ),
  gis: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  bim: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M4 9l8-5 8 5M12 9v11M4 14.5h16" />
    </>
  ),
  aerial: (
    <>
      <path d="M12 3v4M3 12h4M17 12h4M12 17v4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  finance: (
    <>
      <path d="M4 19h16M7 15V9M12 15V5M17 15v-4" />
    </>
  ),
  buildings: <path d="M3 20h18M5 20V8l5-3v15M10 20V5l9 4v11M13 12h3M13 16h3" />,
  workers: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20M16 8.5a2.5 2.5 0 1 1 0 .01M15.5 14.2A4 4 0 0 1 20.5 18v2" />
    </>
  ),
  machines: (
    <>
      <path d="M3 17h12l2-5h4v5M5 12h7l1 5M8 12V8h4M12 8l3-4" />
      <circle cx="7" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  budget: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10M14.5 9.5a2.5 2 0 0 0-5 0c0 2.5 5 1.5 5 4a2.5 2 0 0 1-5 0" />
    </>
  ),
};

function Icon({ k, className = 'h-5 w-5' }: { k: Part | Datum | Stat; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[k]}
    </svg>
  );
}

// the figures, from the demo project's records
function useStats() {
  const t = useTranslations('nav.products.tracked');
  const fmt = (n: number) => n.toLocaleString('en-US');
  return STATS.map((s) => ({
    key: s,
    label: t(`stats.${s}`),
    value: s === 'budget' ? TRACKED.budget.toFixed(1) : fmt(TRACKED[s]),
    unit: s === 'budget' ? t('budgetUnit') : null,
  }));
}

// desktop: the three parts side by side
export function ProductPanel({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('nav.products');
  const stats = useStats();
  const title = (p: Part) => (
    <h3 className="flex items-center gap-2 text-base font-medium text-fg">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent-hi">
        <Icon k={p} className="h-[18px] w-[18px]" />
      </span>
      {t(`${p}.title`)}
    </h3>
  );
  return (
    <div className="mx-auto grid max-w-[1200px] grid-cols-3 gap-8 px-8 py-8 whitespace-normal">
      {/* 1. the complete system, as a sequence */}
      <section>
        {title('system')}
        <p className="mt-2 font-mono text-xs text-accent-soft">{t('system.sub')}</p>
        <ol className="mt-4" role="list">
          {STEPS.map((s, k) => {
            const [name, tag, line] = t.raw(`system.steps.${s.key}`) as [string, string, string];
            return (
              <li key={s.key}>
                <Link href={s.href} onClick={onNavigate} className="group flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-accent/50 font-mono text-[11px] text-accent-hi">{k + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg group-hover:text-accent-hi">
                      {name}
                      {tag && <span className="mt-0.5 block font-mono text-[10px] tracking-wide text-mute uppercase">{tag}</span>}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-mute">{line}</span>
                  </span>
                </Link>
                {k < STEPS.length - 1 && <span aria-hidden="true" className="ml-[19px] block h-3 w-px bg-accent/40" />}
              </li>
            );
          })}
        </ol>
      </section>

      {/* 2. the complete database: its four kinds of data */}
      <section>
        {title('data')}
        <ul className="mt-4 grid grid-cols-2 gap-2" role="list">
          {DATA.map((d) => {
            const [name, line] = t.raw(`data.items.${d.key}`) as [string, string];
            return (
              <li key={d.key}>
                <Link href={d.href} onClick={onNavigate} className="group block h-full rounded-xl border border-line/70 px-3 py-3 transition-colors hover:border-mute hover:bg-surface">
                  <span className="text-accent-hi">
                    <Icon k={d.key} />
                  </span>
                  <span className="mt-2 block text-sm font-medium text-fg group-hover:text-accent-hi">{name}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-mute">{line}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 3. what the system is tracking today */}
      <section>
        {title('tracked')}
        <p className="mt-2 font-mono text-xs text-mute">{t('tracked.note')}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.key} className="rounded-xl bg-surface/60 px-3 py-3">
              <dt className="flex items-center gap-1.5 text-xs text-mute">
                <Icon k={s.key} className="h-4 w-4 shrink-0 text-accent-hi" />
                {s.label}
              </dt>
              <dd className="mt-1.5 text-xl font-medium text-fg tabular-nums">
                {s.value}
                {s.unit && <span className="ml-1 text-xs font-normal text-mute">{s.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <Link href={WORKSPACE} onClick={onNavigate} className="mt-3 flex items-center justify-between rounded-lg border border-line/70 px-3 py-2 text-sm text-fg transition-colors hover:border-mute hover:text-accent-hi">
          {t('tracked.workspace')}
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}

// phones: the three parts as a list that opens in place, one at a time (all closed to start)
export function ProductAccordion({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('nav.products');
  const stats = useStats();
  const [open, setOpen] = useState<Part | null>(null);
  const PARTS: { key: Part; line: string }[] = [
    { key: 'system', line: t('system.sub') },
    { key: 'data', line: DATA.map((d) => (t.raw(`data.items.${d.key}`) as [string, string])[0]).join(' · ') },
    { key: 'tracked', line: t('tracked.note') },
  ];
  const row = (href: string, name: ReactNode, line: string) => (
    <Link href={href} onClick={onNavigate} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2.5 active:bg-surface">
      <span className="min-w-0">
        <span className="block text-sm text-fg">{name}</span>
        <span className="block text-xs text-mute">{line}</span>
      </span>
      <span aria-hidden="true" className="text-mute">
        →
      </span>
    </Link>
  );
  return (
    <ul className="space-y-2" role="list">
      {PARTS.map((p) => {
        const on = open === p.key;
        return (
          <li key={p.key} className={`rounded-2xl border transition-colors ${on ? 'border-accent/40 bg-accent/[0.06]' : 'border-line/70 bg-surface/40'}`}>
            <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : p.key)} className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${on ? 'bg-grad text-white' : 'bg-line/60 text-accent-hi'}`}>
                <Icon k={p.key} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-fg">{t(`${p.key}.title`)}</span>
                <span className="block truncate text-xs text-mute">{p.line}</span>
              </span>
              <span aria-hidden="true" className={`text-lg text-mute transition-transform duration-200 ${on ? 'rotate-90 text-accent-hi' : ''}`}>
                ›
              </span>
            </button>
            {on && (
              <div className="animate-fade-in px-3 pb-3">
                {p.key === 'system' && (
                  <ol className="divide-y divide-line/60 rounded-xl bg-ink/60" role="list">
                    {STEPS.map((s, k) => {
                      const [name, tag, line] = t.raw(`system.steps.${s.key}`) as [string, string, string];
                      return (
                        <li key={s.key}>
                          {row(
                            s.href,
                            <>
                              <span className="mr-2 font-mono text-xs text-accent-hi">{k + 1}</span>
                              {name}
                              {tag && <span className="mt-0.5 block font-mono text-[10px] tracking-wide text-mute uppercase">{tag}</span>}
                            </>,
                            line,
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
                {p.key === 'data' && (
                  <ul className="divide-y divide-line/60 rounded-xl bg-ink/60" role="list">
                    {DATA.map((d) => {
                      const [name, line] = t.raw(`data.items.${d.key}`) as [string, string];
                      return <li key={d.key}>{row(d.href, name, line)}</li>;
                    })}
                  </ul>
                )}
                {p.key === 'tracked' && (
                  <>
                    <dl className="grid grid-cols-2 gap-2">
                      {stats.map((s) => (
                        <div key={s.key} className="rounded-xl bg-ink/60 px-3 py-3">
                          <dt className="flex items-center gap-1.5 text-xs text-mute">
                            <Icon k={s.key} className="h-4 w-4 shrink-0 text-accent-hi" />
                            {s.label}
                          </dt>
                          <dd className="mt-1.5 text-xl font-medium text-fg tabular-nums">
                            {s.value}
                            {s.unit && <span className="ml-1 text-xs font-normal text-mute">{s.unit}</span>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <Link href={WORKSPACE} onClick={onNavigate} className="mt-2 flex h-10 items-center justify-center rounded-xl border border-accent/40 text-sm text-accent-hi active:bg-accent/10">
                      {t('tracked.workspace')} →
                    </Link>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
