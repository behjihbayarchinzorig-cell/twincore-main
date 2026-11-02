'use client';

import { useLocale, useTranslations } from 'next-intl';
import { FLOORS, FOOTPRINT, UNITS, VARIANTS } from '@/lib/twin';

// The project's financial case, worked out on the plan: what it costs to deliver, the VAT on it, what the
// building is worth once sold, and the margin. Sample figures for the sample building, in ₮ (US$ in English).
const USD_RATE = 3450; // ₮ per US$, indicative
const V = VARIANTS[0];
const GFA = FOOTPRINT.south * FOOTPRINT.east * FLOORS; // m²
const HOMES = (FLOORS - 1) * UNITS;
const HOME_AREA = 59; // average sellable m² per apartment (floor plate less core and corridors)
const SALE_RES = 4.6e6; // ₮ per m², apartments
const SALE_COM = 6.5e6; // ₮ per m², ground-floor retail
const COM_AREA = FOOTPRINT.south * FOOTPRINT.east;

const LAND = 8.5e9;
const BUILD = V.cost * 1e9;
const SOFT = 2.4e9; // design, surveys, permits
const VAT = BUILD * 0.1; // НӨАТ 10% on construction
const TOTAL = LAND + BUILD + SOFT + VAT;
const VALUE = HOMES * HOME_AREA * SALE_RES + COM_AREA * SALE_COM;
const PROFIT = VALUE - TOTAL;

type Row = { key: 'land' | 'build' | 'soft' | 'vat' | 'total' | 'value' | 'profit'; v: number; strong?: boolean };
const ROWS: Row[] = [
  { key: 'land', v: LAND },
  { key: 'build', v: BUILD },
  { key: 'soft', v: SOFT },
  { key: 'vat', v: VAT },
  { key: 'total', v: TOTAL, strong: true },
  { key: 'value', v: VALUE },
  { key: 'profit', v: PROFIT, strong: true },
];

const ease = (k: number) => 1 - (1 - k) ** 3;

// `progress` 0..1 drives the count-up: each row starts a little after the one above it.
export default function FinanceCounter({ progress }: { progress: number }) {
  const t = useTranslations('home.finance');
  const en = useLocale() === 'en';
  const money = (v: number) =>
    en ? `$${(v / USD_RATE / 1e6).toFixed(2)}M` : `${(v / 1e9).toFixed(2)} ${t('bn')}`;
  const rowK = (i: number) => ease(Math.min(1, Math.max(0, progress * 1.6 - i * 0.09)));
  const roi = (PROFIT / TOTAL) * 100 * rowK(ROWS.length);

  return (
    <div className="mt-4 rounded-md border border-line bg-ink/70 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm text-fg">{t('title')}</p>
        <p className="font-mono text-[11px] text-mute">
          {Math.round(GFA).toLocaleString('en-US').replace(/,/g, ' ')} {t('m2')} · {HOMES} {t('homes')}
        </p>
      </div>
      <dl className="mt-2 grid gap-x-6 font-mono text-xs sm:grid-cols-2">
        {ROWS.map((r, i) => {
          const k = rowK(i);
          return (
            <div
              key={r.key}
              className={`flex justify-between gap-3 border-t border-line/60 py-2 transition-opacity sm:py-1.5 duration-300 ${k > 0 ? 'opacity-100' : 'opacity-25'}`}
            >
              <dt className="min-w-0 text-mute">{t(r.key)}</dt>
              <dd className={`shrink-0 tabular-nums ${r.key === 'profit' ? 'text-accent' : r.strong ? 'text-fg' : 'text-fg/85'}`}>{money(r.v * k)}</dd>
            </div>
          );
        })}
        <div className="flex justify-between gap-3 border-t border-line/60 py-2 sm:py-1.5">
          <dt className="text-mute">{t('roi')}</dt>
          <dd className="text-accent tabular-nums">{roi.toFixed(1)}%</dd>
        </div>
      </dl>
      {en && <p className="mt-1.5 text-[10px] text-mute">{t('rate', { r: USD_RATE.toLocaleString('en-US') })}</p>}
    </div>
  );
}
