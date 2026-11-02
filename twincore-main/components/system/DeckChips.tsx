'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';

export type DeckChip = { key: string; name: string; why: string; pages: { slug: string; name: string; current: boolean }[] };

// "In the presentation: Planning · Operations" on a module page. Each is a button: it opens a short line on what
// that part of the presentation covers, with links to the pages of this site that show it.
export default function DeckChips({ label, here, chips }: { label: string; here: string; chips: DeckChip[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const c = chips.find((x) => x.key === open);
  return (
    <div className="mt-5 text-xs text-mute">
      <p className="flex flex-wrap items-center gap-2">
        {label}:
        {chips.map((x) => (
          <button
            key={x.key}
            type="button"
            aria-expanded={open === x.key}
            onClick={() => setOpen(open === x.key ? null : x.key)}
            className={`cursor-pointer rounded-full border px-3 py-1 transition-colors ${
              open === x.key ? 'border-accent bg-accent/20 text-fg' : 'border-accent/30 bg-accent/10 text-accent-hi hover:border-accent hover:bg-accent/20 hover:text-fg'
            }`}
          >
            {x.name}
            <span aria-hidden="true" className={`ml-1 inline-block transition-transform duration-200 ${open === x.key ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
        ))}
      </p>
      {c && (
        <div key={c.key} className="animate-fade-in mt-3 max-w-[560px] rounded-xl border border-line bg-surface/60 p-4">
          <p className="text-sm text-fg">{c.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-mute">{c.why}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.pages.map((p) =>
              p.current ? (
                <span key={p.slug} className="rounded-full border border-line px-2.5 py-0.5 text-fg/60">
                  {p.name} · {here}
                </span>
              ) : (
                <Link key={p.slug} href={`/system/${p.slug}`} className="rounded-full border border-line px-2.5 py-0.5 text-fg/85 transition-colors hover:border-accent hover:text-fg">
                  {p.name} →
                </Link>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
