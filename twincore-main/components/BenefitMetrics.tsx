'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';
import { BENEFITS, type BenefitIcon } from '@/lib/benefits';

// "TwinCore юу өгөх вэ?": six cards, all alike — an icon, the benefit, and in a block of
// its own the figures: before and with TwinCore, the stated improvement, a two-bar comparison, and on request how the
// stated figure follows from the numbers. The figures are the presentation's, shown as supplied and marked as not
// independently verified.

// Drawn like the rest of the site's icons (24-unit grid, 1.7 stroke, round caps), one per benefit.
const ICON: Record<BenefitIcon, React.ReactNode> = {
  budget: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 7h7M8.5 11h2M13.5 11h2M8.5 14.5h2M13.5 14.5h2M8.5 18h2M13.5 18h2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 20.5 19h-17z" />
      <path d="M12 10v4M12 16.5v.5" />
    </>
  ),
  report: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 16.5h4.5" />
    </>
  ),
  schedule: (
    <>
      <rect x="4" y="5" width="9" height="3" rx="1.5" />
      <rect x="8" y="10.5" width="12" height="3" rx="1.5" />
      <rect x="6" y="16" width="7" height="3" rx="1.5" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M10 10v10" />
    </>
  ),
};

export default function BenefitMetrics() {
  const en = useLocale() === 'en';
  const L = en ? 1 : 0;
  const [open, setOpen] = useState<string | null>(null);
  const w = en
    ? {
        title: 'What TwinCore delivers',
        before: 'Before',
        after: 'With TwinCore',
        unit: 'Unit',
        how: 'How it’s worked out',
      }
    : {
        title: 'TwinCore юу өгөх вэ?',
        before: 'Өмнө нь',
        after: 'TwinCore-оор',
        unit: 'Нэгж',
        how: 'Яаж тооцсон бэ',
      };

  return (
    <section id="benefits" aria-labelledby="benefits-title" className="scroll-mt-24">
      <div className="mx-auto mb-10 max-w-[640px] text-center">
        <h2 id="benefits-title" className="text-balance text-3xl tracking-[-0.02em] sm:text-4xl">
          {w.title}
        </h2>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b) => {
          const max = b.bars ? Math.max(...b.bars) : 1;
          const show = open === b.id;
          return (
            <li key={b.id} className="flex flex-col rounded-2xl border border-line bg-surface/40 p-5 sm:p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent-hi" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  {ICON[b.icon]}
                </svg>
              </span>
              <h3 className="mt-4 text-balance text-lg font-medium leading-snug">{b.name[L]}</h3>

              {/* the figures, in a block of their own */}
              <div className="mt-auto pt-5">
                <div className="rounded-xl border border-line/70 bg-ink/40 p-4">
                  <p className="text-sm font-medium text-accent-hi">{b.claim[L]}</p>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    {[
                      [w.before, b.before[L], b.bars?.[0], 'bg-mute/60'],
                      [w.after, b.after[L], b.bars?.[1], 'bg-grad'],
                    ].map(([k, v, n, c]) => (
                      <div key={k as string}>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="shrink-0 text-xs text-mute">{k}</dt>
                          <dd className="text-right font-mono text-sm tabular-nums">{v}</dd>
                        </div>
                        {n != null && (
                          <div className="mt-1 h-1.5 rounded-full bg-line">
                            <div className={`h-full rounded-full ${c}`} style={{ width: `${((n as number) / max) * 100}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2.5 text-[11px] text-mute">
                    {w.unit}: {b.unit[L]}
                  </p>
                  {/* where the stated figure comes from */}
                  <button type="button" aria-expanded={show} onClick={() => setOpen(show ? null : b.id)} className="mt-3 flex w-full cursor-pointer items-center justify-between gap-2 text-left text-xs text-mute transition-colors hover:text-fg">
                    <span>{w.how}</span>
                    <span aria-hidden="true">{show ? '−' : '+'}</span>
                  </button>
                  {show && <p className="mt-2 rounded-lg border border-line/70 p-3 font-mono text-xs text-fg/85">{b.check[L]}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
