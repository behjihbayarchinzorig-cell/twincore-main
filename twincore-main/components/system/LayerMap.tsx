'use client';

import 'leaflet/dist/leaflet.css';
import type * as Leaflet from 'leaflet';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import BasemapSwitch from '@/components/BasemapSwitch';
import { Link } from '@/i18n/navigation';
import { BASEMAPS, basemapUrl, type Basemap } from '@/lib/basemaps';
import { CENTRE, ll, rect } from '@/lib/construction/geo';
import { PACKAGES, STATUS_FILL, type Pkg } from '@/lib/packages';
import { usePersistentState } from '@/lib/persist';

// Base data module: a district of central Ulaanbaatar on satellite imagery (the orthophoto base), with the
// platform's layers on top. Every object has an ID that ties it to the rest of the system. Overlays are sample data.
//
// Each layer lives in its own map pane, so switching it fades it in or out instead of popping. The map flies in when
// it first comes into view and the layers arrive one after another; picking a zone, package or building glides the
// map to it and lights it up. Utility lines flow, late packages pulse.

type Layer = 'ortho' | 'dem' | 'zoning' | 'roads' | 'utilities' | 'works' | 'bim';
const LAYERS: Layer[] = ['ortho', 'dem', 'zoning', 'roads', 'utilities', 'works', 'bim'];
const SWATCH: Record<Layer, string> = {
  ortho: '#6f7d5c',
  dem: '#8ea6cc',
  zoning: '#93c5fd',
  roads: '#eaf1ff',
  utilities: '#6b93c4',
  works: '#60a5fa',
  bim: '#d6cfc9',
};
// stacking: imagery and relief at the bottom, then plans, works and buildings, street names on top
const PANE_Z: Record<Layer, number> = { ortho: 210, dem: 250, zoning: 400, utilities: 410, works: 420, bim: 430, roads: 440 };


type Zone = { id: string; kind: 'res' | 'com' | 'green' | 'public' | 'ind'; r: [number, number, number, number]; far: number; height: number };
const ZONES: Zone[] = [
  { id: 'Z-101', kind: 'res', r: [20, 20, 280, 180], far: 3.0, height: 45 },
  { id: 'Z-102', kind: 'com', r: [330, 20, 230, 130], far: 4.5, height: 60 },
  { id: 'Z-103', kind: 'green', r: [590, 20, 190, 210], far: 0.2, height: 6 },
  { id: 'Z-104', kind: 'public', r: [330, 180, 230, 140], far: 2.0, height: 24 },
  { id: 'Z-105', kind: 'res', r: [20, 230, 280, 270], far: 2.4, height: 38 },
  { id: 'Z-106', kind: 'ind', r: [330, 350, 230, 150], far: 1.2, height: 18 },
  { id: 'Z-107', kind: 'res', r: [590, 260, 190, 240], far: 2.8, height: 42 },
];
const ZONE_FILL: Record<Zone['kind'], string> = { res: '#93c5fd', com: '#3b82f6', green: '#7fa36a', public: '#8ea6cc', ind: '#8f8681' };

const UTILITIES: { kind: 'water' | 'heat' | 'power'; pts: [number, number][] }[] = [
  { kind: 'water', pts: [[0, 225], [800, 225]] },
  { kind: 'water', pts: [[325, 0], [325, 520]] },
  { kind: 'heat', pts: [[0, 205], [800, 205]] },
  { kind: 'heat', pts: [[565, 0], [565, 520]] },
  { kind: 'power', pts: [[0, 345], [800, 345]] },
  { kind: 'power', pts: [[305, 0], [305, 520]] },
];
// dashed so the flow shows (the dashes run along the line)
const UTIL_STYLE = { water: { color: '#60a5fa', dashArray: '10 6' }, heat: { color: '#f87171', dashArray: '8 5' }, power: { color: '#a78bfa', dashArray: '2 6' } };

const BIM_RECT: [number, number, number, number] = [80, 70, 48, 36];
const EASE = [0.22, 0.8, 0.2, 1] as const;

type Sel = { kind: 'zone'; z: Zone } | { kind: 'pkg'; p: Pkg } | { kind: 'bim' } | null;

export default function LayerMap() {
  const t = useTranslations('system.data');
  const still = useReducedMotion();
  const [on, setOn] = usePersistentState<Record<Layer, boolean>>('data.layers2', {
    ortho: true,
    dem: false,
    zoning: true,
    roads: true,
    utilities: false,
    works: true,
    bim: true,
  });
  const [base, setBase] = usePersistentState<Basemap>('map.basemap', 'imagery');
  const baseLayer = useRef<Leaflet.TileLayer | null>(null);
  const [mapReady, setMapReady] = useState(false); // Leaflet loads after the first render
  const [sel, setSel] = useState<Sel>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(16);
  const [ready, setReady] = useState(false); // the layers have arrived after the fly-in
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const shapes = useRef<{ zones: Map<string, Leaflet.Polygon>; pkgs: Map<string, Leaflet.Polygon>; bim: Leaflet.Polygon | null }>({ zones: new Map(), pkgs: new Map(), bim: null });
  const lit = useRef<Leaflet.Path | null>(null);
  const toggle = (l: Layer) => setOn((v) => ({ ...v, [l]: !v[l] }));
  const count = LAYERS.filter((l) => on[l]).length;

  // Build the map once (Leaflet needs the browser). Every layer gets its own pane, so it can fade.
  useEffect(() => {
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !box.current || map.current) return;
      const m = L.map(box.current, { center: CENTRE, zoom: still ? 16 : 14, minZoom: 13, maxZoom: 19, zoomControl: true, scrollWheelZoom: false, attributionControl: true, zoomSnap: 0.25 });
      m.attributionControl.setPrefix(false);
      L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(m);
      m.on('mousemove', (e: Leaflet.LeafletMouseEvent) => setCursor([e.latlng.lat, e.latlng.lng]));
      m.on('zoomend', () => setZoom(m.getZoom()));
      m.on('click', () => setSel(null));
      for (const l of LAYERS) {
        const p = m.createPane(l);
        p.style.zIndex = String(PANE_Z[l]);
        p.classList.add('tc-pane');
        p.style.opacity = '0';
      }

      const esri = (path: string, pane: Layer, opts: Leaflet.TileLayerOptions = {}) =>
        L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${path}/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, pane, ...opts });
      const tip = (pane: Layer, permanent = false, direction: Leaflet.Direction = 'center') => ({ pane, permanent, direction, className: 'tc-tip' });

      esri('Elevation/World_Hillshade', 'dem', { opacity: 0.55, attribution: 'Hillshade © Esri' }).addTo(m);
      esri('Reference/World_Transportation', 'roads', { opacity: 0.9 }).addTo(m);
      esri('Reference/World_Boundaries_and_Places', 'roads', { opacity: 0.9 }).addTo(m);
      for (const z of ZONES) {
        const poly = L.polygon(rect(...z.r), { pane: 'zoning', color: ZONE_FILL[z.kind], weight: 2, fillColor: ZONE_FILL[z.kind], fillOpacity: 0.22, className: 'tc-shape' })
          .bindTooltip(z.id, tip('zoning'))
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSel({ kind: 'zone', z });
          })
          .addTo(m);
        shapes.current.zones.set(z.id, poly);
      }
      for (const u of UTILITIES) L.polyline(u.pts.map(([x, y]) => ll(x, y)), { pane: 'utilities', ...UTIL_STYLE[u.kind], weight: 3.5, opacity: 0.95, className: `tc-flow tc-flow-${u.kind}` }).addTo(m);
      for (const p of PACKAGES) {
        const poly = L.polygon(rect(p.x, p.y, p.w, p.h), {
          pane: 'works',
          color: STATUS_FILL[p.status],
          weight: 2.5,
          dashArray: '6 4',
          fillColor: STATUS_FILL[p.status],
          fillOpacity: 0.28,
          className: `tc-shape ${p.status === 'late' ? 'tc-late' : ''}`,
        })
          .bindTooltip(p.id, tip('works', true))
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSel({ kind: 'pkg', p });
          })
          .addTo(m);
        shapes.current.pkgs.set(p.id, poly);
      }
      shapes.current.bim = L.polygon(rect(...BIM_RECT), { pane: 'bim', color: '#060b18', weight: 2, fillColor: '#eaf1ff', fillOpacity: 0.85, className: 'tc-shape' })
        .bindTooltip('BIM · BLD-0412', tip('bim', true, 'top'))
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSel({ kind: 'bim' });
        })
        .addTo(m);
      map.current = m;
      setMapReady(true);

      // the first time it comes into view: fly in, and the layers arrive one by one
      const arrive = () => {
        if (!still) m.flyTo(CENTRE, 16, { duration: 2.2, easeLinearity: 0.2 });
        setTimeout(() => setReady(true), still ? 0 : 900);
      };
      io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          io?.disconnect();
          arrive();
        },
        { threshold: 0.35 },
      );
      io.observe(box.current);
    })();
    return () => {
      cancelled = true;
      io?.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The basemap sits in the ortho pane, so the ortho switch still fades it; picking another swaps the tiles.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const b = BASEMAPS.find((x) => x.id === base) ?? BASEMAPS[0];
    let gone = false;
    import('leaflet').then((L) => {
      if (gone) return;
      baseLayer.current?.remove();
      baseLayer.current = L.tileLayer(basemapUrl(b.path), { pane: 'ortho', maxZoom: 19, maxNativeZoom: b.native, attribution: b.attribution }).addTo(m);
    });
    return () => {
      gone = true;
    };
  }, [base, mapReady]);

  // Show / hide: each layer's pane fades (staggered on arrival, at once after that).
  const arrived = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    LAYERS.forEach((l, k) => {
      const pane = m.getPane(l);
      if (!pane) return;
      pane.style.transitionDelay = arrived.current || still ? '0ms' : `${k * 220}ms`;
      pane.style.opacity = on[l] ? '1' : '0';
      pane.style.pointerEvents = on[l] ? '' : 'none';
    });
    arrived.current = true;
  }, [on, ready, still]);

  // Picking something glides the map to it and lights it up.
  useEffect(() => {
    const m = map.current;
    lit.current?.getElement()?.classList.remove('tc-lit');
    lit.current = null;
    if (!m || !sel) return;
    const shape = sel.kind === 'zone' ? shapes.current.zones.get(sel.z.id) : sel.kind === 'pkg' ? shapes.current.pkgs.get(sel.p.id) : shapes.current.bim;
    if (!shape) return;
    shape.getElement()?.classList.add('tc-lit');
    lit.current = shape;
    m.flyToBounds(shape.getBounds(), { padding: [90, 90], maxZoom: 18, duration: still ? 0 : 0.9 });
  }, [sel, still]);

  const selKey = sel ? (sel.kind === 'zone' ? sel.z.id : sel.kind === 'pkg' ? sel.p.id : 'bim') : 'none';

  return (
    <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)]">
      <div className="order-2 lg:order-1">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-mute">{t('layers')}</p>
          <p className="font-mono text-xs text-accent-hi tabular-nums">
            {count} / {LAYERS.length}
          </p>
        </div>
        {/* the layers, as switches */}
        <ul className="mt-3 grid gap-1.5">
          {LAYERS.map((l, k) => (
            <motion.li key={l} initial={still ? false : { opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: k * 0.06, ease: EASE }}>
              <button
                type="button"
                role="switch"
                aria-checked={on[l]}
                onClick={() => toggle(l)}
                className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${on[l] ? 'border-accent/30 bg-accent/[0.07]' : 'border-line/60 bg-transparent hover:border-line'}`}
              >
                <span className="mt-1 h-3 w-3 shrink-0 rounded-[4px] transition-shadow duration-300" style={{ background: SWATCH[l], boxShadow: on[l] ? `0 0 12px 1px ${SWATCH[l]}` : 'none', opacity: on[l] ? 1 : 0.45 }} />
                <span className="min-w-0 flex-1">
                  <span className={`block transition-colors ${on[l] ? 'text-fg' : 'text-mute'}`}>{t(`layer.${l}`)}</span>
                  <span className="hidden text-xs text-mute sm:block">{t(`layerDesc.${l}`)}</span>
                </span>
                {/* the switch */}
                <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 ${on[l] ? 'bg-grad justify-end' : 'justify-start bg-line'}`}>
                  <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 34 }} className="h-4 w-4 rounded-full bg-white shadow" />
                </span>
              </button>
            </motion.li>
          ))}
        </ul>

        {/* what was picked */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface/70 p-4 text-sm sm:mt-6 sm:min-h-[150px]" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: still ? 0 : 0.3, ease: EASE }}>
              {sel == null && <p className="text-mute">{t('pick')}</p>}
              {sel?.kind === 'zone' && (
                <Attrs
                  swatch={ZONE_FILL[sel.z.kind]}
                  title={t(`zone.${sel.z.kind}`)}
                  id={sel.z.id}
                  rows={[
                    [t('far'), sel.z.far.toFixed(1)],
                    [t('maxHeight'), `${sel.z.height} ${t('m')}`],
                  ]}
                />
              )}
              {sel?.kind === 'pkg' && (
                <>
                  <Attrs
                    swatch={STATUS_FILL[sel.p.status]}
                    title={t('package')}
                    id={sel.p.id}
                    rows={[
                      [t('status'), t(`st.${sel.p.status}`)],
                      [t('contractor'), sel.p.contractor ? t('company', { c: sel.p.contractor }) : t('notAwarded')],
                      [t('due'), sel.p.due],
                    ]}
                  />
                  <div className="mt-3">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-mute">{t('progress')}</span>
                      <span className="text-fg">{sel.p.progress}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                      <motion.div className="h-full rounded-full" style={{ background: STATUS_FILL[sel.p.status] }} initial={{ width: 0 }} animate={{ width: `${sel.p.progress}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }} />
                    </div>
                  </div>
                </>
              )}
              {sel?.kind === 'bim' && (
                <>
                  <Attrs swatch="#eaf1ff" title={t('bimTitle')} id="BLD-0412" rows={[[t('format'), 'IFC 4'], [t('elements'), '2 106'], [t('floors'), '12']]} />
                  <Link href="/system/twin" className="mt-3 inline-flex items-center gap-1 text-accent-hi hover:underline">
                    {t('openTwin')} →
                  </Link>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <div className="relative isolate rounded-2xl bg-gradient-to-br from-accent/40 via-line/40 to-transparent p-px shadow-[0_30px_80px_-30px_rgba(37,99,235,0.45)]">
          <BasemapSwitch value={base} onChange={setBase} at="top-12 left-14 sm:top-3 sm:left-auto sm:right-3" />
          <div ref={box} className="tc-map shimmer isolate h-[380px] w-full overflow-hidden rounded-[15px] sm:h-[460px] lg:h-[580px]" aria-label={t('mapLabel')} />
          {/* the readout over the map */}
          <div className="pointer-events-none absolute top-3 left-14 z-[500] flex items-center gap-2 rounded-full border border-white/10 bg-ink/60 px-3 py-1.5 font-mono text-[11px] text-fg/85 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            <span className="tabular-nums">
              {count}/{LAYERS.length} · Z{zoom.toFixed(1)}
            </span>
            {cursor && (
              <span className="hidden text-mute tabular-nums sm:inline">
                · {cursor[0].toFixed(5)}° N, {cursor[1].toFixed(5)}° E
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-mute">
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {(['done', 'active', 'late', 'planned'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_FILL[s] }} />
                {t(`st.${s}`)}
              </span>
            ))}
          </span>
          <span className="font-mono">{t('place')}</span>
        </div>
      </div>
    </div>
  );
}

function Attrs({ swatch, title, id, rows }: { swatch: string; title: string; id: string; rows: [string, string][] }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-fg">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: swatch, boxShadow: `0 0 10px ${swatch}` }} />
          {title}
        </p>
        <p className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-accent-hi">ID {id}</p>
      </div>
      <dl className="mt-3 font-mono text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-t border-line/60 py-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="text-fg">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
