'use client';

import { useState } from 'react';
import type { Architecture } from '@/lib/data';

// Five layers left to right; selecting one shows what flows in and out of it.
export default function ArchExplorer({ arch }: { arch: Architecture }) {
  const [sel, setSel] = useState(2);
  const layers = arch.layers;
  const cur = layers[sel];

  return (
    <div>
      <div role="tablist" aria-orientation="horizontal" className="grid gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-5">
        {layers.map((l, i) => {
          const on = i === sel;
          const near = Math.abs(i - sel) === 1;
          return (
            <button
              key={l.title}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => setSel(i)}
              className={`relative flex cursor-pointer flex-col items-start justify-start p-4 text-left transition-colors ${on ? 'bg-surface' : 'bg-ink hover:bg-surface/60'}`}
            >
              <span className={`absolute inset-x-0 top-0 h-0.5 transition-colors ${on ? 'bg-accent' : near ? 'bg-raised' : 'bg-transparent'}`} />
              <span className="flex items-baseline gap-2">
                <span className={`font-mono text-xs ${on ? 'text-accent' : 'text-mute'}`}>{i + 1}</span>
                <span className="font-display text-[15px] font-medium tracking-[-0.01em]">{l.title}</span>
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-mute">{l.verb}</span>
              <ul className={`mt-4 space-y-1.5 text-[13px] transition-opacity ${on ? 'opacity-100' : near ? 'opacity-70' : 'opacity-40'}`}>
                {l.items.map((it) => {
                  const [label, sub] = typeof it === 'string' ? [it] : it;
                  return (
                    <li key={label} className="leading-snug">
                      {label}
                      {sub && <span className="block text-[11px] text-mute">{sub}</span>}
                    </li>
                  );
                })}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Flow through the selected layer */}
      <div className="mt-6 grid items-center gap-4 sm:grid-cols-[1fr_auto_1.4fr_auto_1fr]" aria-live="polite">
        <p className="font-mono text-xs text-mute sm:text-right">{sel > 0 ? layers[sel - 1].title : '—'}</p>
        <Arrow on={sel > 0} />
        <div className="rounded-lg border border-accent/60 bg-surface p-4">
          <p className="font-display text-base">{cur.title}</p>
          <p className="mt-1.5 text-sm text-mute">{cur.desc}</p>
        </div>
        <Arrow on={sel < layers.length - 1} />
        <p className="font-mono text-xs text-mute">{sel < layers.length - 1 ? layers[sel + 1].title : '—'}</p>
      </div>

      <p className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-4 text-sm">
        <span className="font-medium text-accent-soft">{arch.security[0]}</span>
        <span className="text-mute">{arch.security[1]}</span>
      </p>
    </div>
  );
}

function Arrow({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 64 12" className="hidden h-3 w-16 sm:block" aria-hidden="true">
      <line x1="0" y1="6" x2="56" y2="6" stroke={on ? '#3b82f6' : '#1e2d4a'} strokeWidth="1.5" strokeDasharray="4 4" className={on ? 'animate-flow' : ''} />
      <path d="M56 1l7 5-7 5z" fill={on ? '#3b82f6' : '#1e2d4a'} />
    </svg>
  );
}
