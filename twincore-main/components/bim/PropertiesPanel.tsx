'use client';

import { useTranslations } from 'next-intl';
import { ELEMENTS } from '@/lib/bim';
import { FLOORS, FLOOR_HEIGHT_M } from '@/lib/twin';

const m = (n: number) => (Math.round(n * 100) / 100).toString();

// What the picked part of the building is, said plainly: no IFC class or GlobalId, the floor as "Floor 8 · 22.4 m".
export default function PropertiesPanel({ index, onClear, className = '' }: { index: number | null; onClear: () => void; className?: string }) {
  const t = useTranslations('bim');
  const tp = useTranslations('bim.plainProps');
  const tl = useTranslations('bim.plainLevel');
  const tw = useTranslations('twin');
  const e = index == null ? null : ELEMENTS[index];

  return (
    <aside className={`rounded-md border border-line bg-ink p-3 text-xs ${className}`} aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-fg">{tp('title')}</p>
        {e && (
          <button type="button" onClick={onClear} className="cursor-pointer text-mute underline underline-offset-2 hover:text-fg">
            {t('props.clear')}
          </button>
        )}
      </div>
      {e ? (
        <dl className="mt-2">
          {[
            [tp('name'), t(`ifc.${e.ifc}`)],
            [tp('group'), tp(`cat.${e.category}`)],
            [tp('level'), e.level < 0 ? tp('basement') : `${e.level >= FLOORS ? tl('roof') : tl('floor', { n: e.level + 1 })} · ${+(e.level * FLOOR_HEIGHT_M).toFixed(1)} ${tl('m')}`],
            [tp('material'), t(`material.${e.material}`)],
            [tp('size'), `${m(e.size[0])} × ${m(e.size[2])} × ${m(e.size[1])} ${tw('m')}`],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[96px_1fr] gap-2 border-t border-line/60 py-1.5">
              <dt className="text-mute">{k}</dt>
              <dd className="text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-mute">{tp('empty')}</p>
      )}
    </aside>
  );
}
