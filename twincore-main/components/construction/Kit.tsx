'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { useText } from '@/lib/construction/text';
import type { Problem } from '@/lib/construction/validate';

// The workspace's small building blocks, in the site's own look: white panels with hairline borders, compact KPI
// cards, status pills (green = good, amber = needs attention, red = critical), plain tables, filter selects, forms and
// a side drawer.

export type Tone = 'neutral' | 'good' | 'info' | 'warn' | 'bad';
const TONE: Record<Tone, string> = {
  neutral: 'border-line text-mute bg-raised/60',
  good: 'border-emerald-600/25 text-emerald-800 bg-emerald-50',
  info: 'border-accent/25 text-accent-deep bg-teal-50',
  warn: 'border-amber-500/30 text-amber-800 bg-amber-50',
  bad: 'border-red-500/25 text-red-800 bg-red-50',
};
const TONES: Record<string, Tone> = {
    approved: 'good', done: 'good', completed: 'good', cleared: 'good', resolved: 'good', paid: 'good', pass: 'good',
    active: 'info', ongoing: 'info', submitted: 'info', review: 'info', agreed: 'info', negotiating: 'info', pending: 'info',
    draft: 'neutral', planned: 'neutral', not_started: 'neutral', superseded: 'neutral', low: 'neutral',
    medium: 'warn', delayed: 'warn', soon: 'warn', suspended: 'warn',
    rejected: 'bad', expired: 'bad', disputed: 'bad', overdue: 'bad', fail: 'bad', high: 'bad', open: 'warn',
};
export const toneOf = (s: string): Tone => TONES[s] ?? 'neutral';

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

export function Panel({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel min-w-0 p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone = 'neutral', href }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-mute">{label}</p>
      <p className={`mt-1 font-mono text-[22px] font-semibold tracking-[-0.01em] tabular-nums ${tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-700' : tone === 'good' ? 'text-emerald-700' : 'text-fg'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </>
  );
  const cls = 'panel block px-4 py-3 transition-colors';
  return href ? (
    <Link href={href} className={`${cls} hover:border-accent/60`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Bar({ value, planned, tone = 'info', label }: { value: number | null; planned?: number; tone?: Tone; label?: string }) {
  const fill = { neutral: 'bg-mute', good: 'bg-emerald-600', info: 'bg-accent', warn: 'bg-amber-500', bad: 'bg-red-500' }[tone];
  return (
    <div className="relative h-1.5 rounded-full bg-line" role="meter" aria-label={label} aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      {value != null && <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />}
      {planned != null && <div className="absolute -top-1 h-3.5 w-0.5 bg-fg/80" style={{ left: `${Math.max(0, Math.min(100, planned))}%` }} title={`${Math.round(planned)}%`} />}
    </div>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  const t = useText();
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-mute">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-2 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">{children}</tbody>
      </table>
      {empty && <p className="px-2 py-6 text-center text-sm text-mute">{t.common.none}</p>}
    </div>
  );
}

export function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-mute">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-10 rounded-md border border-line bg-surface px-2 text-sm text-fg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none sm:h-9">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-mute">
      {label}
      {children}
      {error && <span className="text-red-700">{error}</span>}
    </label>
  );
}
export const inputCls = 'h-10 rounded-md border border-line bg-surface px-2 text-sm text-fg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none sm:h-9';

export function Btn({ children, onClick, kind = 'ghost', disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; type?: 'button' | 'submit' }) {
  const cls = {
    primary: 'bg-grad font-medium text-white hover:bg-accent-deep',
    ghost: 'border border-line bg-surface text-fg hover:border-mute hover:bg-raised/60',
    danger: 'border border-red-500/40 bg-surface text-red-700 hover:bg-red-50',
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-10 cursor-pointer sm:h-9 items-center gap-1.5 rounded-md px-3.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
}

export function Problems({ list }: { list: Problem[] }) {
  const t = useText();
  if (!list.length) return null;
  return (
    <ul role="alert" className="rounded-md border border-red-500/30 bg-red-50 px-3 py-2 text-xs text-red-800">
      {list.map((p, i) => (
        <li key={i}>• {t.problem[p.code]}</li>
      ))}
    </ul>
  );
}

export function Forbidden() {
  const t = useText();
  return (
    <p className="flex items-center gap-2 rounded-md border border-line bg-raised/60 px-3 py-2 text-xs text-mute">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
      </svg>
      {t.common.forbidden}
    </p>
  );
}

// a panel that slides in from the right for a record's detail; Escape or the backdrop closes it
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  const t = useText();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    box.current?.focus();
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy/40" onClick={onClose} />
      <div ref={box} tabIndex={-1} className="animate-fade-in absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-line bg-surface shadow-[var(--shadow-pop)] outline-none">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 text-base font-medium">{title}</div>
          <button type="button" onClick={onClose} aria-label={t.common.close} className="cursor-pointer rounded px-2 text-mute hover:text-fg">
            ✕
          </button>
        </header>
        <div data-lenis-prevent className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function History({ items, name }: { items: { at: string; by: string; action: string; comment?: string }[]; name: (id: string) => string }) {
  const t = useText();
  if (!items.length) return <p className="text-xs text-mute">{t.common.none}</p>;
  return (
    <ol className="relative space-y-3 border-l border-line pl-4">
      {items.map((h, i) => (
        <li key={i} className="text-xs">
          <span className="absolute -left-[5px] mt-1 h-2 w-2 rounded-full bg-accent" />
          <p className="text-fg/90">
            <span className="font-mono text-mute">{h.at.slice(0, 10)}</span> · {name(h.by)} · {h.action}
          </p>
          {h.comment && <p className="mt-0.5 text-mute">“{h.comment}”</p>}
        </li>
      ))}
    </ol>
  );
}

// while the workspace's records load: the page's shape in soft shimmering blocks
export function Loading() {
  const t = useText();
  return (
    <div role="status" aria-label={t.common.loading} className="space-y-6">
      <div className="shimmer h-8 w-64 rounded-lg" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="shimmer h-20 rounded-[10px]" />
        ))}
      </div>
      <div className="shimmer h-72 rounded-[10px]" />
    </div>
  );
}

export function PageHead({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-balance sm:text-[26px]">{title}</h1>
        {lead && <p className="mt-2 max-w-[720px] text-sm text-mute">{lead}</p>}
      </div>
      {action}
    </div>
  );
}
