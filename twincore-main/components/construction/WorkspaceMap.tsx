'use client';

import 'leaflet/dist/leaflet.css';
import type * as Leaflet from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { CENTRE, ll, rect } from '@/lib/construction/geo';
import { useText, useWords } from '@/lib/construction/text';
import type { Data } from '@/lib/construction/types';

// The workspace map: the same engine and imagery as the base-data map, with the construction records on it. Each
// kind of record is its own layer (switchable, with a legend); clicking a feature hands its kind and id back, so the
// page can open the record. Records without geometry simply aren't drawn (the page lists them as such).

export type MapLayer = 'packages' | 'parcels' | 'assets' | 'sensors' | 'issues';
export type Pick = { kind: 'package' | 'parcel' | 'asset' | 'sensor' | 'defect' | 'safety'; id: string };
type Props = {
  data: Data;
  layers: MapLayer[]; // which layers this page offers
  initial?: MapLayer[]; // which start switched on (default: all offered)
  only?: { pkgs?: string[] }; // filter by package
  selected?: string | null;
  onPick?: (p: Pick) => void;
  height?: string;
};

export const PKG_COLOR = { planned: '#8ea6cc', active: '#60a5fa', done: '#7fa36a', suspended: '#7dd3fc' } as const;
export const PARCEL_COLOR = { not_started: '#8ea6cc', negotiating: '#60a5fa', agreed: '#a78bfa', cleared: '#7fa36a', disputed: '#ef4444' } as const;
export const ASSET_COLOR = { water: '#60a5fa', heat: '#f87171', power: '#a78bfa', sewer: '#a3a3a3', telecom: '#34d399', road: '#e5e7eb' } as const;

export default function WorkspaceMap({ data, layers, initial, only, selected, onPick, height = 'h-[420px]' }: Props) {
  const t = useText();
  const w = useWords({
    mn: { packages: 'Багц', parcels: 'Нэгж талбар', assets: 'Дэд бүтэц', sensors: 'Мэдрэгч (симуляц)', issues: 'QA/QC, ХАБЭА', qa: 'QA/QC асуудал', hs: 'ХАБЭА асуудал' },
    en: { packages: 'Packages', parcels: 'Parcels', assets: 'Infrastructure', sensors: 'Sensors (simulated)', issues: 'QA/QC, H&S', qa: 'QA/QC issue', hs: 'H&S issue' },
  });
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const group = useRef<Partial<Record<MapLayer, Leaflet.LayerGroup>>>({});
  const [on, setOn] = useState<MapLayer[]>(initial ?? layers);
  const [loaded, setLoaded] = useState(false);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    let gone = false;
    (async () => {
      const lib = await import('leaflet');
      if (gone || !box.current || map.current) return;
      L.current = lib;
      const m = lib.map(box.current, { center: CENTRE, zoom: 16, minZoom: 13, maxZoom: 19, scrollWheelZoom: false, attributionControl: true });
      m.attributionControl.setPrefix(false);
      lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics', opacity: 0.85 }).addTo(m);
      lib.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(m);
      map.current = m;
      setLoaded(true);
    })();
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // (re)draw the records whenever they, the filter or the selection change
  useEffect(() => {
    const m = map.current;
    const lib = L.current;
    if (!m || !lib) return;
    for (const g of Object.values(group.current)) g?.remove();
    group.current = {};
    const inPkg = (pkg: string) => !only?.pkgs || only.pkgs.includes(pkg);
    const sel = (id: string) => (id === selected ? { weight: 4, fillOpacity: 0.55 } : {});
    const click = (p: Pick) => (e: Leaflet.LeafletMouseEvent) => {
      lib.DomEvent.stopPropagation(e);
      pick.current?.(p);
    };
    const g: Partial<Record<MapLayer, Leaflet.LayerGroup>> = {};
    if (layers.includes('packages'))
      g.packages = lib.layerGroup(
        data.packages
          .filter((p) => inPkg(p.id))
          .map((p) =>
            lib
              .polygon(rect(p.geom.x, p.geom.y, p.geom.w, p.geom.h), { color: PKG_COLOR[p.status], weight: 2, dashArray: '6 4', fillColor: PKG_COLOR[p.status], fillOpacity: 0.22, ...sel(p.id) })
              .bindTooltip(`${p.id} · ${p.name}`, { className: 'tc-tip', sticky: true })
              .on('click', click({ kind: 'package', id: p.id })),
          ),
      );
    if (layers.includes('parcels'))
      g.parcels = lib.layerGroup(
        data.parcels
          .filter((p) => p.geom)
          .map((p) =>
            lib
              .polygon(rect(p.geom!.x, p.geom!.y, p.geom!.w, p.geom!.h), { color: PARCEL_COLOR[p.status], weight: 1.5, fillColor: PARCEL_COLOR[p.status], fillOpacity: 0.3, ...sel(p.id) })
              .bindTooltip(`${p.id} · ${t.parcelStatus[p.status]}`, { className: 'tc-tip', sticky: true })
              .on('click', click({ kind: 'parcel', id: p.id })),
          ),
      );
    if (layers.includes('assets'))
      g.assets = lib.layerGroup(
        data.assets
          .filter((a) => a.geom && inPkg(a.pkg))
          .map((a) =>
            lib
              .polyline(a.geom!.map(([x, y]) => ll(x, y)), { color: ASSET_COLOR[a.kind], weight: a.id === selected ? 7 : 4, opacity: a.status === 'planned' ? 0.55 : 0.95, dashArray: a.status === 'planned' ? '4 6' : a.status === 'delayed' ? '10 5' : undefined })
              .bindTooltip(`${a.id} · ${a.name} · ${t.assetStatus[a.status]}`, { className: 'tc-tip', sticky: true })
              .on('click', click({ kind: 'asset', id: a.id })),
          ),
      );
    if (layers.includes('sensors'))
      g.sensors = lib.layerGroup(
        data.sensors
          .filter((s) => inPkg(s.pkg))
          .map((s) =>
            lib
              .circleMarker(ll(...s.at), { radius: s.sensor === selected ? 8 : 6, color: '#060b18', weight: 1.5, fillColor: '#22d3ee', fillOpacity: 0.95 })
              .bindTooltip(`${s.sensor} (SIM)`, { className: 'tc-tip' })
              .on('click', click({ kind: 'sensor', id: s.sensor })),
          ),
      );
    if (layers.includes('issues'))
      g.issues = lib.layerGroup([
        ...data.defects
          .filter((d) => d.at && d.state !== 'resolved' && inPkg(d.pkg))
          .map((d) => lib.circleMarker(ll(...d.at!), { radius: 6, color: '#060b18', weight: 1.5, fillColor: '#7dd3fc', fillOpacity: 0.95 }).bindTooltip(`${d.id} · ${d.title}`, { className: 'tc-tip' }).on('click', click({ kind: 'defect', id: d.id }))),
        ...data.safety
          .filter((s) => s.at && s.state !== 'resolved' && inPkg(s.pkg))
          .map((s) => lib.circleMarker(ll(...s.at!), { radius: 6, color: '#060b18', weight: 1.5, fillColor: '#ef4444', fillOpacity: 0.95 }).bindTooltip(`${s.id} · ${s.title}`, { className: 'tc-tip' }).on('click', click({ kind: 'safety', id: s.id }))),
      ]);
    for (const [k, layer] of Object.entries(g) as [MapLayer, Leaflet.LayerGroup][]) if (on.includes(k)) layer.addTo(m);
    group.current = g;
  }, [data, layers, on, only?.pkgs, selected, loaded, t]);

  const legend: Record<MapLayer, [string, string][]> = {
    packages: Object.entries(PKG_COLOR).map(([k, c]) => [t.pkgStatus[k as keyof typeof PKG_COLOR], c]),
    parcels: Object.entries(PARCEL_COLOR).map(([k, c]) => [t.parcelStatus[k as keyof typeof PARCEL_COLOR], c]),
    assets: Object.entries(ASSET_COLOR).map(([k, c]) => [t.assetKind[k as keyof typeof ASSET_COLOR], c]),
    sensors: [['SIM', '#22d3ee']],
    issues: [
      [w.qa, '#7dd3fc'],
      [w.hs, '#ef4444'],
    ],
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label={t.common.onMap}>
        {layers.map((l) => {
          const active = on.includes(l);
          return (
            <button
              key={l}
              type="button"
              aria-pressed={active}
              onClick={() => setOn((v) => (active ? v.filter((x) => x !== l) : [...v, l]))}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${active ? 'border-accent/50 bg-accent/10 text-fg' : 'border-line text-mute hover:text-fg'}`}
            >
              {w[l]}
            </button>
          );
        })}
      </div>
      <div className="relative isolate">
        <div ref={box} className={`tc-map shimmer ${height} w-full overflow-hidden rounded-xl border border-line`} aria-label={t.common.onMap} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
        {layers
          .filter((l) => on.includes(l))
          .flatMap((l) => legend[l])
          .map(([n, c]) => (
            <span key={n + c} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
              {n}
            </span>
          ))}
      </div>
    </div>
  );
}
