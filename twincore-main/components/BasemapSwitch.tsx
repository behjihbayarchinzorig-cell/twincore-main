'use client';

import { useLocale } from 'next-intl';
import { BASEMAPS, type Basemap } from '@/lib/basemaps';

// The basemap picker that sits over a map's top-right corner: one pill per Esri basemap.
export default function BasemapSwitch({ value, onChange, at = 'top-3 right-3' }: { value: Basemap; onChange: (b: Basemap) => void; at?: string }) {
  const L = useLocale() === 'en' ? 1 : 0;
  return (
    <div role="radiogroup" aria-label={L ? 'Basemap' : 'Суурь зураг'} className={`absolute ${at} z-[500] flex gap-0.5 rounded-full border border-white/10 bg-ink/70 p-0.5 text-[11px] backdrop-blur-md`}>
      {BASEMAPS.map((b) => (
        <button
          key={b.id}
          type="button"
          role="radio"
          aria-checked={value === b.id}
          onClick={() => onChange(b.id)}
          className={`cursor-pointer rounded-full px-2.5 py-1 transition-colors ${value === b.id ? 'bg-grad text-white' : 'text-fg/75 hover:text-fg'}`}
        >
          {b.name[L]}
        </button>
      ))}
    </div>
  );
}
