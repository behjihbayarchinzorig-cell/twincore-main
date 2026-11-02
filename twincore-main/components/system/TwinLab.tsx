'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import BimViewer from '@/components/bim/BimViewer';
import PropertiesPanel from '@/components/bim/PropertiesPanel';
import { designLook } from '@/components/bim/colors';
import { lodStyler, type Lod } from '@/components/bim/stages';
import { usePersistentState } from '@/lib/persist';
import { NEIGHBOURS, footing } from '@/components/bim/neighbours';
import { RIVER_LEVEL, floodedArea } from '@/components/bim/terrain';
import { FLOOR_HEIGHT_M } from '@/lib/twin';

const LODS: Lod[] = [1, 2, 3, 4];
type Sim = 'flood' | 'air' | 'traffic';
const SIMS: Sim[] = ['flood', 'air', 'traffic'];
const tabCls = (on: boolean) => `cursor-pointer rounded-full px-3 py-1.5 min-h-10 text-[13px] transition-colors sm:min-h-0 sm:px-3.5 sm:text-sm ${on ? 'bg-grad text-white' : 'text-mute hover:text-fg'}`;

// Digital twin module: the building at each CityGML level of detail, then risk simulations on the city model.
export function LodViewer() {
  const t = useTranslations('system.twin');
  const [lod, setLod] = usePersistentState<Lod>('twin.lod', 3);
  const [sel, setSel] = useState<number | null>(null);
  const styler = useMemo(() => lodStyler(lod), [lod]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div>
        <div role="radiogroup" aria-label="LOD" className="grid grid-cols-2 gap-1 rounded-2xl border border-line p-1 sm:flex sm:flex-wrap sm:rounded-full">
          {LODS.map((l) => (
            <button key={l} role="radio" aria-checked={lod === l} type="button" onClick={() => setLod(l)} className={tabCls(lod === l)}>
              {t(`lodName.${l}`)}
              <span className={`ml-1.5 hidden font-mono text-[10px] sm:inline ${lod === l ? 'text-white/70' : 'text-mute/70'}`}>LOD{l}</span>
            </button>
          ))}
        </div>
        <h3 className="mt-6 text-xl">
          {t(`lodName.${lod}`)} <span className="font-mono text-sm text-mute">LOD{lod}</span>
        </h3>
        <p className="mt-2 text-mute">{t(`lod${lod}`)}</p>
        <PropertiesPanel index={sel} onClear={() => setSel(null)} className="mt-6" />
      </div>
      <BimViewer
        className="h-[440px] lg:h-[560px]"
        cameraKey="twin.lod.cam"
        styler={styler}
        styleKey={`lod${lod}`}
        visible={{ structure: true, facade: true, mep: lod === 4 }}
        cut={lod === 4 ? 6 * FLOOR_HEIGHT_M + 1.2 : null}
        selected={(e) => e.index === sel}
        selectedKey={String(sel)}
        onPick={(e) => setSel(e ? e.index : null)}
        labels
        plain
      />
    </div>
  );
}

// Flood readouts, worked out from the terrain: land under water, and which objects the water reaches.
const nf = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
function floodReport(level: number) {
  const y = RIVER_LEVEL + level;
  const buildings = NEIGHBOURS.filter((n) => footing(n) < y).length + (y > 0 ? 1 : 0); // + the subject on level ground
  const stage: 'banks' | 'plain' | 'city' = y <= -2 ? 'banks' : y <= 0 ? 'plain' : 'city';
  return { area: floodedArea(level), buildings, street: y > 0.05, stage };
}
// Air readouts for the whole area: emissions build up, wind clears them. Direction only moves the fog.
function airReport(_dir: number, wind: number, pol: number) {
  const calm = 1 - Math.min(1, wind / 10);
  const density = Math.min(1, pol * (0.35 + 0.85 * calm));
  const pm = Math.round(12 + density * 260);
  const visibility = Math.max(0.4, 20 * (1 - density) ** 1.8);
  return { pm, visibility };
}

export function RiskSim() {
  const t = useTranslations('system.twin');
  const [sim, setSim] = usePersistentState<Sim>('twin.sim', 'flood');
  const [level, setLevel] = usePersistentState('twin.flood2', 2.4);
  const [dir, setDir] = usePersistentState('twin.wind3', 20);
  const [windSpeed, setWindSpeed] = usePersistentState('twin.windSpeed', 4);
  const [pollution, setPollution] = usePersistentState('twin.pollution', 0.6);
  const air = useMemo(() => airReport(dir, windSpeed, pollution), [dir, windSpeed, pollution]);
  const [load, setLoad] = usePersistentState('twin.traffic', 0.5);

  const flood = useMemo(() => floodReport(level), [level]);
  const rows: [string, string, boolean?][] =
    sim === 'flood'
      ? [
          [t('flood.level'), `+${level.toFixed(1)} ${t('m')}`],
          [t('flood.area'), `${(flood.area / 10000).toFixed(1)} ${t('ha')}`, flood.area > 40000],
          [t('flood.risk'), String(flood.buildings), flood.buildings > 0],
          [t('flood.state'), t(`flood.st.${flood.stage}`), flood.stage === 'city'],
        ]
      : sim === 'air'
        ? [
            [t('air.dir'), `${dir}°`],
            [t('air.pm'), `${air.pm} µg/m³`, air.pm > 75],
            [t('air.visibility'), `${air.visibility.toFixed(1)} ${t('km')}`, air.visibility < 4],
            [t('air.status'), air.pm > 75 ? t('air.bad') : air.pm > 35 ? t('air.mid') : t('air.ok'), air.pm > 75],
          ]
        : [
            [t('traffic.load'), `${Math.round(load * 100)}%`],
            [t('traffic.cars'), String(load > 0 ? Math.round(4 + load ** 0.8 * 40) : 6)],
            [t('traffic.speed'), `${Math.round(60 * (1 - 0.25 * load) * (1 - 0.45 * load ** 3))} ${t('kmh')}`, load > 0.8],
            [t('traffic.jams'), String(Math.round(load * load * 9)), load > 0.7],
          ];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div>
        <div role="tablist" className="flex flex-wrap gap-1 rounded-full border border-line p-1">
          {SIMS.map((s) => (
            <button key={s} role="tab" aria-selected={sim === s} type="button" onClick={() => setSim(s)} className={tabCls(sim === s)}>
              {t(`${s}.name`)}
            </button>
          ))}
        </div>
        <p className="mt-6 text-mute">{t(`${sim}.desc`)}</p>

        <div className="mt-6 space-y-4 text-sm">
          {sim === 'flood' && <Slider label={t('flood.level')} min={0} max={6} step={0.1} value={level} onChange={setLevel} unit={t('m')} />}
          {sim === 'air' && (
            <>
              <Slider label={t('air.dir')} min={0} max={359} step={1} value={dir} onChange={setDir} unit="°" />
              <Slider label={t('air.speed')} min={0} max={15} step={0.5} value={windSpeed} onChange={setWindSpeed} unit={t('ms')} />
              <Slider label={t('air.strength')} min={0.05} max={1} step={0.05} value={pollution} onChange={setPollution} />
            </>
          )}
          {sim === 'traffic' && <Slider label={t('traffic.load')} min={0} max={1} step={0.05} value={load} onChange={setLoad} />}
        </div>

        <dl className="mt-6 border-t border-line font-mono text-sm" aria-live="polite">
          {rows.map(([k, v, warn]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-2">
              <dt className="text-mute">{k}</dt>
              <dd className={warn ? 'text-accent' : 'text-fg'}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-mute">{t('simNote')}</p>
      </div>

      <BimViewer
        className="h-[440px] lg:h-[560px]"
        cameraKey="twin.sim.cam2"
        styler={designLook}
        styleKey="sim"
        visible={{ structure: true, facade: true, mep: false }}
        pickable={() => false}
        terrain
        defaultView={{ position: [150, 95, 190], target: [-10, -2, -40] }}
        water={sim === 'flood' ? level : null}
        plume={sim === 'air' ? { dir, wind: windSpeed, pollution } : null}
        traffic={sim === 'traffic'}
        congestion={sim === 'traffic' ? load : 0}
      />
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step, unit = '' }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-mute">
        {label}
        <span className="text-fg tabular-nums">
          {step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value}
          {unit && ` ${unit}`}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-accent" />
    </label>
  );
}
