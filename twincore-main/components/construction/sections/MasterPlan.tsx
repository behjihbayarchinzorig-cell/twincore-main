'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { today } from '@/lib/construction/calc';
import { FRAME, NETWORKS, ROADS, ROAD_CLASSES, USES, ZONES, areaHa, centre, inside, lineLen, type Road, type RoadClass, type Use, type Zone, type ZoneKind } from '@/lib/construction/extra/masterplan';
import { SUBS, useEn, useText, useWords } from '@/lib/construction/text';
import type { Asset } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { Donut } from '../Charts';
import { useExtra, useSubView } from '../extra';
import { Bar, Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Table, toneOf, type Tone } from '../Kit';
import { useStore } from '../Store';
import { ASSET_COLOR } from '../WorkspaceMap';

// The district's master plan in five views — zoning, land use, building limits, roads and utility networks — on one
// stylised plan that redraws per view. Clicking a zone, road or network line selects it; a planner ('plan.edit') can
// change a zone's limits, and every change is kept in the zone's history. The limits feed the detailed plan and the
// suitability assessment (both read the same saved zones).

export const ZONE_COLOR: Record<ZoneKind, string> = { res: '#93c5fd', com: '#f87171', public: '#a78bfa', green: '#7fa36a', ind: '#94a3b8' };
export const USE_COLOR: Record<Use, string> = { housing: '#93c5fd', commercial: '#f87171', social: '#a78bfa', green: '#7fa36a', roads: '#64748b', utility: '#22d3ee' };
const ROAD_COLOR: Record<RoadClass, string> = { arterial: '#60a5fa', collector: '#e5e7eb', local: '#8ea6cc', ped: '#34d399' };

const W = {
  mn: {
    lead: 'Хорооллын ерөнхий төлөвлөгөө: бүсчлэл, газар ашиглалт, барилгажилтын хязгаар, авто замын ангилал, инженерийн шугам сүлжээ — нэг төлөвлөгөөний зураг дээр. Бүс, зам, шугамыг дарж дэлгэрэнгүйг харна.',
    plan: 'Төлөвлөгөөний зураг',
    detail: 'Сонгосон объект',
    pick: 'Зураг эсвэл хүснэгтээс бүс, зам, шугам сонгоно уу.',
    zone: 'Бүс',
    name: 'Нэр',
    kind: 'Төрөл',
    area: 'Талбай, га',
    far: 'Барилгажилтын нягтрал (FAR)',
    farShort: 'FAR',
    coverage: 'Барилгажилтын хувь, %',
    height: 'Өндрийн хязгаар, м',
    green: 'Ногоон байгууламж, ≥ %',
    setback: 'Улаан шугамаас ухрах зай, м',
    gfa: 'Зөвшөөрөгдөх нийт талбай, мян. м²',
    pkgs: 'Багцууд',
    zones: 'Бүсийн тоо',
    total: 'Нийт талбай',
    resShare: 'Орон сууцны бүс',
    greenShare: 'Ногоон байгууламж',
    use: 'Газар ашиглалт',
    share: 'Эзлэх хувь',
    mixTitle: 'Бүс тус бүрийн газар ашиглалтын бүтэц, %',
    district: 'Хорооллын нийт бүтэц',
    avgFar: 'Дундаж FAR (талбайгаар жигнэсэн)',
    maxHeight: 'Хамгийн өндөр хязгаар',
    maxGfa: 'Зөвшөөрөгдөх нийт талбай',
    roadLen: 'Замын нийт урт',
    arterial: 'Магистраль',
    density: 'Замын сүлжээний нягтшил',
    newRoads: 'Шинээр барих',
    cls: 'Ангилал',
    width: 'Улаан шугамын өргөн, м',
    lanes: 'Эгнээ',
    speed: 'Тооцоот хурд, км/ц',
    length: 'Урт, м',
    state: 'Төлөв',
    netLen: 'Шугамын нийт урт',
    netDone: 'Ашиглалтад орсон',
    netLate: 'Хоцорсон',
    netGeom: 'Байршилгүй',
    capacity: 'Хүчин чадал',
    demand: 'Хэрэгцээ',
    load: 'Ачаалал',
    org: 'Хариуцагч',
    note: 'Тэмдэглэл',
    openInfra: 'Инженерийн дэд бүтэц хэсэгт нээх',
    noGeom: 'Шугамын байршил ирээгүй тул зураг дээр харагдахгүй',
    editLimits: 'Хязгаар засах',
    reason: 'Өөрчлөлтийн үндэслэл',
    approved: 'Батлагдсан',
    canEdit: 'Төлөвлөлтийн мэдээлэл засах эрх: менежер, хяналтын инженер, админ.',
    mix: 'Газар ашиглалтын бүтэц',
    kinds: { res: 'Орон сууцны бүс', com: 'Худалдаа, үйлчилгээ, оффисын бүс', public: 'Нийгмийн дэд бүтцийн бүс', green: 'Ногоон байгууламж, амралтын бүс', ind: 'Үйлдвэрлэл, агуулахын бүс' } as Record<ZoneKind, string>,
    uses: { housing: 'Орон сууц', commercial: 'Худалдаа, үйлчилгээ', social: 'Нийгмийн үйлчилгээ', green: 'Ногоон байгууламж', roads: 'Зам, талбай', utility: 'Инженерийн байгууламж' } as Record<Use, string>,
    classes: { arterial: 'Хотын чанартай магистраль', collector: 'Дүүргийн чанартай гудамж', local: 'Орон нутгийн гудамж', ped: 'Явган хүний зам' } as Record<RoadClass, string>,
    roadState: { existing: 'Одоо байгаа', upgrade: 'Өргөтгөх, шинэчлэх', new: 'Шинээр барих' } as Record<Road['state'], string>,
    scale: '100 м',
    maxCoverage: 'Хамгийн их барилгажилтын хувь',
    u: { ha: 'га', km: 'км', m: 'м', mm2: 'сая м²', dens: 'км/км²' },
  },
  en: {
    lead: 'The district master plan: zoning, land use, building limits, the road hierarchy and the utility networks — on one plan. Tap a zone, road or line for its details.',
    plan: 'Plan',
    detail: 'Selected',
    pick: 'Pick a zone, road or network on the plan or in the table.',
    zone: 'Zone',
    name: 'Name',
    kind: 'Type',
    area: 'Area, ha',
    far: 'Floor area ratio (FAR)',
    farShort: 'FAR',
    coverage: 'Site coverage, %',
    height: 'Height limit, m',
    green: 'Green space, ≥ %',
    setback: 'Setback from the red line, m',
    gfa: 'Allowed floor area, ’000 m²',
    pkgs: 'Packages',
    zones: 'Zones',
    total: 'Total area',
    resShare: 'Residential zones',
    greenShare: 'Green space',
    use: 'Land use',
    share: 'Share',
    mixTitle: 'Land-use mix per zone, %',
    district: 'District as a whole',
    avgFar: 'Average FAR (area-weighted)',
    maxHeight: 'Highest height limit',
    maxGfa: 'Allowed floor area',
    roadLen: 'Total road length',
    arterial: 'Arterials',
    density: 'Road network density',
    newRoads: 'New roads',
    cls: 'Class',
    width: 'Red-line width, m',
    lanes: 'Lanes',
    speed: 'Design speed, km/h',
    length: 'Length, m',
    state: 'Status',
    netLen: 'Total network length',
    netDone: 'In service',
    netLate: 'Delayed',
    netGeom: 'No geometry',
    capacity: 'Capacity',
    demand: 'Demand',
    load: 'Load',
    org: 'Responsible',
    note: 'Note',
    openInfra: 'Open in Engineering infrastructure',
    noGeom: 'No route geometry yet, so it isn’t drawn',
    editLimits: 'Edit limits',
    reason: 'Reason for the change',
    approved: 'Approved',
    canEdit: 'Planning data may be edited by managers, supervising engineers and admins.',
    mix: 'Land-use mix',
    kinds: { res: 'Residential', com: 'Commercial and office', public: 'Public services', green: 'Green space and recreation', ind: 'Light industry and storage' },
    uses: { housing: 'Housing', commercial: 'Commercial', social: 'Public services', green: 'Green space', roads: 'Roads and squares', utility: 'Utilities' },
    classes: { arterial: 'City arterial', collector: 'District collector', local: 'Local street', ped: 'Footpath' },
    roadState: { existing: 'Existing', upgrade: 'To be widened', new: 'New' },
    scale: '100 m',
    maxCoverage: 'Highest site coverage',
    u: { ha: 'ha', km: 'km', m: 'm', mm2: 'M m²', dens: 'km/km²' },
  },
};
type Words = typeof W.mn;

export default function MasterPlan() {
  const t = useText();
  const en = useEn();
  const w = useWords(W);
  const { data, can, log, user } = useStore();
  const [view, setView] = useSubView('masterplan', SUBS.masterplan!);
  const [zones, setZones] = useExtra<Zone[]>('masterplan.zones', ZONES);
  const [selZone, setSelZone] = useState<string | null>(null);
  const [selRoad, setSelRoad] = useState<string | null>(null);
  const [selNet, setSelNet] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const L = (x: { mn: string; en: string }) => (en ? x.en : x.mn);

  const totalHa = areaHa({ x: 0, y: 0, ...FRAME });
  const zoneHa = zones.reduce((s, z) => s + areaHa(z.r), 0);
  const pkgsIn = (z: Zone) => data.packages.filter((p) => inside(z.r, centre(p.geom)));
  const useHa = (u: Use) => zones.reduce((s, z) => s + (areaHa(z.r) * z.mix[u]) / 100, 0);
  const nets = data.assets.filter((a) => a.kind !== 'road');
  const roadLen = (r: Road) => Math.round(lineLen(r.line));
  const zone = zones.find((z) => z.id === selZone);
  const road = ROADS.find((r) => r.id === selRoad);
  const net = nets.find((a) => a.id === selNet);
  const edit = zones.find((z) => z.id === editing);
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const orgName = (id: string) => data.orgs.find((o) => o.id === id)?.name ?? id;
  const zoneView = view === 'zoning' || view === 'landuse' || view === 'limits';

  const saveLimits = (id: string, next: Pick<Zone, 'far' | 'coverage' | 'height' | 'green' | 'setback'>, reason: string) => {
    const z = zones.find((x) => x.id === id)!;
    const diff = (['far', 'coverage', 'height', 'green', 'setback'] as const).filter((k) => z[k] !== next[k]).map((k) => `${k} ${z[k]} → ${next[k]}`);
    if (!diff.length) return true;
    if (!log('plan.edit', id, diff.join('; '))) return false;
    setZones((all) => all.map((x) => (x.id === id ? { ...x, ...next, history: [...x.history, { at: today(), by: user, action: diff.join('; '), comment: reason || undefined }] } : x)));
    return true;
  };

  // ---- figures per view ----
  const avgFar = zones.reduce((s, z) => s + z.far * areaHa(z.r), 0) / zoneHa;
  const allowedGfa = zones.reduce((s, z) => s + z.r.w * z.r.h * z.far, 0);
  const totalRoad = ROADS.reduce((s, r) => s + roadLen(r), 0);
  const netLen = nets.reduce((s, a) => s + (a.geom ? lineLen(a.geom) : 0), 0);
  const kpis: Record<string, ReactNode> = {
    zoning: (
      <>
        <Kpi label={w.total} value={`${totalHa.toFixed(1)} ${w.u.ha}`} />
        <Kpi label={w.zones} value={zones.length} />
        <Kpi label={w.resShare} value={`${((zones.filter((z) => z.kind === 'res').reduce((s, z) => s + areaHa(z.r), 0) / zoneHa) * 100).toFixed(0)}%`} />
        <Kpi label={w.greenShare} value={`${((useHa('green') / zoneHa) * 100).toFixed(0)}%`} tone="good" />
      </>
    ),
    landuse: (
      <>
        {(['housing', 'social', 'green', 'roads'] as Use[]).map((u) => (
          <Kpi key={u} label={w.uses[u]} value={`${useHa(u).toFixed(1)} ${w.u.ha}`} sub={`${((useHa(u) / zoneHa) * 100).toFixed(0)}%`} />
        ))}
      </>
    ),
    limits: (
      <>
        <Kpi label={w.avgFar} value={avgFar.toFixed(2)} />
        <Kpi label={w.maxHeight} value={`${Math.max(...zones.map((z) => z.height))} ${w.u.m}`} />
        <Kpi label={w.maxGfa} value={`${(allowedGfa / 1e6).toFixed(2)} ${w.u.mm2}`} />
        <Kpi label={w.maxCoverage} value={`${Math.max(...zones.map((z) => z.coverage))}%`} />
      </>
    ),
    roads: (
      <>
        <Kpi label={w.roadLen} value={`${(totalRoad / 1000).toFixed(2)} ${w.u.km}`} />
        <Kpi label={w.arterial} value={`${(ROADS.filter((r) => r.cls === 'arterial').reduce((s, r) => s + roadLen(r), 0) / 1000).toFixed(2)} ${w.u.km}`} />
        <Kpi label={w.density} value={`${(totalRoad / 1000 / (totalHa / 100)).toFixed(1)} ${w.u.dens}`} />
        <Kpi label={w.newRoads} value={`${(ROADS.filter((r) => r.state === 'new').reduce((s, r) => s + roadLen(r), 0) / 1000).toFixed(2)} ${w.u.km}`} tone="info" />
      </>
    ),
    networks: (
      <>
        <Kpi label={w.netLen} value={`${(netLen / 1000).toFixed(1)} ${w.u.km}`} />
        <Kpi label={w.netDone} value={`${nets.filter((a) => a.status === 'completed').length} / ${nets.length}`} tone="good" />
        <Kpi label={w.netLate} value={nets.filter((a) => a.status === 'delayed').length} tone={nets.some((a) => a.status === 'delayed') ? 'bad' : 'good'} />
        <Kpi label={w.netGeom} value={nets.filter((a) => !a.geom).length} tone={nets.some((a) => !a.geom) ? 'warn' : 'neutral'} />
      </>
    ),
  };

  // ---- the plan per view ----
  const zoneFill = (z: Zone) => (view === 'limits' ? '#60a5fa' : ZONE_COLOR[z.kind]);
  const zoneOpacity = (z: Zone) => (view === 'limits' ? 0.12 + (z.height / 60) * 0.5 : view === 'zoning' ? 0.38 : 0);
  const plan = (
    <PlanSvg label={`${t.section.masterplan} — ${t.sub[view]}`} roads={view !== 'roads'} scale={w.scale}>
      {zones.map((z) => {
        const on = zoneView && z.id === selZone;
        let y = z.r.y;
        return (
          <g key={z.id} {...(zoneView ? hit(() => setSelZone(z.id), `${z.id} ${L(z.name)}`) : {})}>
            <rect x={z.r.x} y={z.r.y} width={z.r.w} height={z.r.h} fill={zoneFill(z)} fillOpacity={zoneView ? zoneOpacity(z) : 0.06} stroke={on ? 'var(--color-accent-hi)' : zoneView ? ZONE_COLOR[z.kind] : 'var(--color-line)'} strokeWidth={on ? 4 : 1.5} />
            {/* land use: the zone split into bands, one per use, by its share */}
            {view === 'landuse' &&
              USES.filter((u) => z.mix[u] > 0).map((u) => {
                const h = (z.r.h * z.mix[u]) / 100;
                const band = <rect key={u} x={z.r.x + 2} y={y} width={z.r.w - 4} height={h} fill={USE_COLOR[u]} fillOpacity={0.5} />;
                y += h;
                return band;
              })}
            {zoneView && (
              <>
                <text x={z.r.x + 10} y={z.r.y + 24} fontSize="17" fill="var(--color-fg)" className="pointer-events-none font-mono">
                  {z.id}
                </text>
                {view === 'limits' && (
                  <text x={z.r.x + 10} y={z.r.y + 46} fontSize="15" fill="var(--color-fg)" className="pointer-events-none">
                    {`FAR ${z.far} · ≤${z.height} ${w.u.m}`}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
      {view === 'roads' &&
        ROADS.map((r) => (
          <g key={r.id} {...hit(() => setSelRoad(r.id), `${r.id} ${L(r.name)}`)}>
            <polyline points={r.line.map((p) => p.join(',')).join(' ')} fill="none" stroke={ROAD_COLOR[r.cls]} strokeOpacity={r.id === selRoad ? 0.95 : 0.6} strokeWidth={Math.max(r.width * 0.7, 6)} strokeDasharray={r.state === 'new' ? '14 8' : undefined} />
            {r.id === selRoad && <polyline points={r.line.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--color-accent-hi)" strokeWidth={3} />}
          </g>
        ))}
      {view === 'networks' &&
        nets
          .filter((a) => a.geom)
          .map((a) => (
            <g key={a.id} {...hit(() => setSelNet(a.id), `${a.id} ${a.name}`)}>
              {/* a wide invisible line so a thin network is easy to tap */}
              <polyline points={a.geom!.map((p) => p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth={18} />
              <polyline points={a.geom!.map((p) => p.join(',')).join(' ')} fill="none" stroke={ASSET_COLOR[a.kind]} strokeWidth={a.id === selNet ? 10 : 5} strokeOpacity={a.status === 'planned' ? 0.6 : 0.95} strokeDasharray={a.status === 'planned' ? '8 8' : a.status === 'delayed' ? '18 6' : undefined} />
            </g>
          ))}
      {/* packages as dashed outlines for orientation */}
      {data.packages.map((p) => (
        <g key={p.id} className="pointer-events-none">
          <rect x={p.geom.x} y={p.geom.y} width={p.geom.w} height={p.geom.h} fill="none" stroke="var(--color-fg)" strokeOpacity={0.5} strokeDasharray="5 4" strokeWidth={1.2} />
          <text x={p.geom.x + 4} y={p.geom.y + p.geom.h - 6} fontSize="12" fill="var(--color-fg)" fillOpacity={0.75} className="font-mono">
            {p.id}
          </text>
        </g>
      ))}
    </PlanSvg>
  );
  const legend: [string, string][] =
    view === 'zoning'
      ? (Object.keys(ZONE_COLOR) as ZoneKind[]).map((k) => [w.kinds[k], ZONE_COLOR[k]])
      : view === 'landuse'
        ? USES.map((u) => [w.uses[u], USE_COLOR[u]])
        : view === 'limits'
          ? [[`${w.height.split(',')[0]}: 6 ${w.u.m}`, 'rgba(96,165,250,0.2)'], [`… 60 ${w.u.m}`, 'rgba(96,165,250,0.62)']]
          : view === 'roads'
            ? ROAD_CLASSES.map((c) => [w.classes[c], ROAD_COLOR[c]])
            : (Object.keys(ASSET_COLOR) as (keyof typeof ASSET_COLOR)[]).filter((k) => k !== 'road').map((k) => [t.assetKind[k], ASSET_COLOR[k]]);

  return (
    <div className="space-y-6">
      <PageHead title={t.section.masterplan} lead={w.lead} />
      <SubTabs views={SUBS.masterplan!} view={view} onChange={setView} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis[view]}</div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title={`${w.plan} · ${t.sub[view]}`}>
          {plan}
          <LegendRow items={legend} />
        </Panel>
        <Panel title={w.detail}>
          {zoneView && zone ? (
            <ZoneDetail zone={zone} w={w} L={L} pkgs={pkgsIn(zone).map((p) => p.id)} name={name} canEdit={can('plan.edit')} onEdit={() => setEditing(zone.id)} />
          ) : view === 'roads' && road ? (
            <RoadDetail road={road} w={w} L={L} asset={data.assets.find((a) => a.id === road.asset)} />
          ) : view === 'networks' && net ? (
            <NetDetail a={net} w={w} L={L} org={orgName(net.org)} />
          ) : view === 'landuse' ? (
            <>
              <p className="mb-3 text-xs text-mute">{w.district}</p>
              <Donut label={w.mix} parts={USES.map((u) => ({ key: u, name: w.uses[u], value: Math.round((useHa(u) / zoneHa) * 100), color: USE_COLOR[u] }))} />
              <p className="mt-4 text-xs text-mute">{w.pick}</p>
            </>
          ) : view === 'networks' && nets.some((a) => !a.geom) ? (
            <div className="space-y-3 text-xs text-mute">
              <p>{w.pick}</p>
              {nets
                .filter((a) => !a.geom)
                .map((a) => (
                  <button key={a.id} type="button" onClick={() => setSelNet(a.id)} className="block min-h-10 w-full cursor-pointer rounded-lg border border-amber-500/40 px-3 py-2 text-left text-amber-700">
                    {a.id} · {a.name} — {w.noGeom}
                  </button>
                ))}
            </div>
          ) : (
            <p className="text-sm text-mute">{w.pick}</p>
          )}
        </Panel>
      </div>

      {/* the table for the view */}
      {view === 'zoning' && (
        <Panel title={t.sub.zoning}>
          <Table head={['ID', w.name, w.kind, w.area, w.farShort, w.coverage, w.height, w.pkgs]}>
            {zones.map((z) => (
              <Row key={z.id} on={z.id === selZone} onClick={() => setSelZone(z.id)}>
                <td className="px-2 py-2 font-mono text-xs">{z.id}</td>
                <td className="px-2 py-2">{L(z.name)}</td>
                <td className="px-2 py-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: ZONE_COLOR[z.kind] }} />
                    {w.kinds[z.kind]}
                  </span>
                </td>
                <td className="px-2 py-2 font-mono text-xs">{areaHa(z.r).toFixed(2)}</td>
                <td className="px-2 py-2 font-mono text-xs">{z.far}</td>
                <td className="px-2 py-2 font-mono text-xs">{z.coverage}</td>
                <td className="px-2 py-2 font-mono text-xs">{z.height}</td>
                <td className="px-2 py-2 font-mono text-xs text-mute">{pkgsIn(z).map((p) => p.id).join(', ') || '—'}</td>
              </Row>
            ))}
          </Table>
        </Panel>
      )}
      {view === 'landuse' && (
        <Panel title={w.mixTitle}>
          <Table head={['ID', w.area, ...USES.map((u) => w.uses[u])]}>
            {zones.map((z) => (
              <Row key={z.id} on={z.id === selZone} onClick={() => setSelZone(z.id)}>
                <td className="px-2 py-2 font-mono text-xs">{z.id}</td>
                <td className="px-2 py-2 font-mono text-xs">{areaHa(z.r).toFixed(2)}</td>
                {USES.map((u) => (
                  <td key={u} className={`px-2 py-2 font-mono text-xs ${z.mix[u] ? '' : 'text-mute'}`}>
                    {z.mix[u]}
                  </td>
                ))}
              </Row>
            ))}
            <tr className="border-t border-line font-medium">
              <td className="px-2 py-2 text-xs">{w.district}</td>
              <td className="px-2 py-2 font-mono text-xs">{zoneHa.toFixed(2)}</td>
              {USES.map((u) => (
                <td key={u} className="px-2 py-2 font-mono text-xs">
                  {((useHa(u) / zoneHa) * 100).toFixed(0)}
                </td>
              ))}
            </tr>
          </Table>
        </Panel>
      )}
      {view === 'limits' && (
        <Panel title={t.sub.limits} action={!can('plan.edit') && <Forbidden />}>
          <Table head={['ID', w.name, w.farShort, w.coverage, w.height, w.green, w.setback, w.gfa, '']}>
            {zones.map((z) => (
              <Row key={z.id} on={z.id === selZone} onClick={() => setSelZone(z.id)}>
                <td className="px-2 py-2 font-mono text-xs">{z.id}</td>
                <td className="px-2 py-2">{L(z.name)}</td>
                <td className="px-2 py-2 font-mono text-xs">{z.far}</td>
                <td className="px-2 py-2 font-mono text-xs">{z.coverage}</td>
                <td className="px-2 py-2 font-mono text-xs">{z.height}</td>
                <td className="px-2 py-2 font-mono text-xs">{z.green}</td>
                <td className="px-2 py-2 font-mono text-xs">{z.setback}</td>
                <td className="px-2 py-2 font-mono text-xs">{((z.r.w * z.r.h * z.far) / 1000).toFixed(1)}</td>
                <td className="px-2 py-2">
                  {can('plan.edit') && (
                    <button
                      type="button"
                      className="min-h-10 cursor-pointer rounded-full border border-line px-3 text-xs hover:border-mute"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(z.id);
                      }}
                    >
                      {t.common.edit}
                    </button>
                  )}
                </td>
              </Row>
            ))}
          </Table>
        </Panel>
      )}
      {view === 'roads' && (
        <Panel title={t.sub.roads}>
          <Table head={['ID', w.name, w.cls, w.width, w.lanes, w.speed, w.length, w.state, t.common.package]}>
            {ROADS.map((r) => {
              const a = data.assets.find((x) => x.id === r.asset);
              return (
                <Row key={r.id} on={r.id === selRoad} onClick={() => setSelRoad(r.id)}>
                  <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-2 py-2">{L(r.name)}</td>
                  <td className="px-2 py-2 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 shrink-0" style={{ background: ROAD_COLOR[r.cls] }} />
                      {w.classes[r.cls]}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{r.width}</td>
                  <td className="px-2 py-2 font-mono text-xs">{r.lanes || '—'}</td>
                  <td className="px-2 py-2 font-mono text-xs">{r.speed || '—'}</td>
                  <td className="px-2 py-2 font-mono text-xs">{roadLen(r)}</td>
                  <td className="px-2 py-2">
                    <span className="flex flex-wrap gap-1">
                      <Pill tone={r.state === 'new' ? 'info' : r.state === 'upgrade' ? 'warn' : 'neutral'}>{w.roadState[r.state]}</Pill>
                      {a && <Pill tone={toneOf(a.status)}>{t.assetStatus[a.status]}</Pill>}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-mute">{r.pkg ?? '—'}</td>
                </Row>
              );
            })}
          </Table>
        </Panel>
      )}
      {view === 'networks' && (
        <Panel title={t.sub.networks}>
          <Table head={['ID', w.name, w.kind, w.length, w.capacity, w.demand, w.load, w.state]}>
            {nets.map((a) => {
              const c = NETWORKS[a.id];
              const load = c ? (c.demand / c.capacity) * 100 : null;
              return (
                <Row key={a.id} on={a.id === selNet} onClick={() => setSelNet(a.id)}>
                  <td className="px-2 py-2 font-mono text-xs">{a.id}</td>
                  <td className="px-2 py-2">
                    {a.name}
                    {!a.geom && <span className="block text-[11px] text-amber-700">{t.common.noGeom}</span>}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 shrink-0" style={{ background: ASSET_COLOR[a.kind] }} />
                      {t.assetKind[a.kind]}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{a.geom ? Math.round(lineLen(a.geom)) : '—'}</td>
                  <td className="px-2 py-2 font-mono text-xs">{c ? `${c.capacity.toLocaleString('en-US')} ${c.unit}` : '—'}</td>
                  <td className="px-2 py-2 font-mono text-xs">{c ? c.demand.toLocaleString('en-US') : '—'}</td>
                  <td className="w-28 px-2 py-2">
                    {load != null ? (
                      <>
                        <Bar value={load} tone={loadTone(load)} label={w.load} />
                        <span className="font-mono text-[11px] text-mute">{load.toFixed(0)}%</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Pill tone={toneOf(a.status)}>{t.assetStatus[a.status]}</Pill>
                  </td>
                </Row>
              );
            })}
          </Table>
        </Panel>
      )}

      <Drawer open={!!edit} onClose={() => setEditing(null)} title={edit ? `${edit.id} · ${w.editLimits}` : ''}>
        {edit && <LimitsForm key={edit.id} zone={edit} w={w} name={name} onSave={(n, r) => saveLimits(edit.id, n, r)} onDone={() => setEditing(null)} />}
      </Drawer>
    </div>
  );
}

const loadTone = (pct: number): Tone => (pct >= 90 ? 'bad' : pct >= 75 ? 'warn' : 'good');

// ---- shared pieces (also used by the detailed plan and the suitability assessment) ---------------------------------------

// keyboard- and tap-friendly SVG shape props
export const hit = (onPick: () => void, label: string) => ({
  role: 'button',
  tabIndex: 0,
  'aria-label': label,
  className: 'cursor-pointer outline-none [&:focus-visible>*:first-child]:stroke-[var(--color-accent-hi)]',
  onClick: onPick,
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick();
    }
  },
});

// the district plan frame: a faint 50 m grid, the roads underneath (unless the view draws its own), a scale bar and a
// north arrow; the view draws its own shapes on top. Scales to the panel's width.
export function PlanSvg({ label, roads = true, scale = '100 m', children }: { label: string; roads?: boolean; scale?: string; children: ReactNode }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} className="h-auto w-full rounded-xl border border-line bg-ink" role="group" aria-label={label}>
      <defs>
        <pattern id={`g${id}`} width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0H0V50" fill="none" stroke="var(--color-line)" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width={FRAME.w} height={FRAME.h} fill={`url(#g${id})`} />
      {roads &&
        ROADS.map((r) => (
          <polyline key={r.id} points={r.line.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--color-raised)" strokeWidth={Math.max(r.width * 0.7, 5)} strokeLinecap="square" className="pointer-events-none" />
        ))}
      {children}
      <g className="pointer-events-none" transform={`translate(${FRAME.w - 150} ${FRAME.h - 22})`}>
        <rect x="-8" y="-20" width="146" height="34" rx="6" fill="var(--color-ink)" fillOpacity="0.75" />
        <line x1="0" x2="100" y1="0" y2="0" stroke="var(--color-fg)" strokeWidth="3" />
        <line x1="0" x2="0" y1="-5" y2="5" stroke="var(--color-fg)" strokeWidth="2" />
        <line x1="100" x2="100" y1="-5" y2="5" stroke="var(--color-fg)" strokeWidth="2" />
        <text x="108" y="5" fontSize="14" fill="var(--color-fg)">
          {scale}
        </text>
      </g>
      <g className="pointer-events-none" transform={`translate(${FRAME.w - 28} 34)`}>
        <path d="M0 -18 L8 8 L0 3 L-8 8 Z" fill="var(--color-fg)" fillOpacity="0.85" />
        <text y="24" textAnchor="middle" fontSize="13" fill="var(--color-fg)">
          N
        </text>
      </g>
    </svg>
  );
}

export function LegendRow({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
      {items.map(([n, c]) => (
        <span key={n + c} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
          {n}
        </span>
      ))}
    </div>
  );
}

// the page's own views as tabs; they scroll sideways on a phone and stay in step with the sidebar (#hash)
export function SubTabs({ views, view, onChange }: { views: string[]; view: string; onChange: (v: string) => void }) {
  const t = useText();
  return (
    <div role="tablist" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {views.map((k) => (
        <button
          key={k}
          role="tab"
          type="button"
          aria-selected={view === k}
          onClick={() => onChange(k)}
          className={`min-h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm whitespace-nowrap transition-colors ${view === k ? 'border-accent/50 bg-accent/10 text-fg' : 'border-line text-mute hover:text-fg'}`}
        >
          {t.sub[k] ?? k}
        </button>
      ))}
    </div>
  );
}

// a clickable table row, highlighted when selected
export function Row({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <tr className={`cursor-pointer align-top hover:bg-surface/60 ${on ? 'bg-accent/[0.08]' : ''}`} onClick={onClick} aria-selected={on}>
      {children}
    </tr>
  );
}

export function Dl({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="space-y-1.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 border-b border-line/50 pb-1.5">
          <dt className="text-mute">{k}</dt>
          <dd className="text-fg/90">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---- detail panels -------------------------------------------------------------------------------------------------------

function ZoneDetail({ zone: z, w, L, pkgs, name, canEdit, onEdit }: { zone: Zone; w: Words; L: (x: { mn: string; en: string }) => string; pkgs: string[]; name: (id: string) => string; canEdit: boolean; onEdit: () => void }) {
  const t = useText();
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-mono text-xs text-mute">{z.id}</p>
        <p className="font-medium">{L(z.name)}</p>
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-mute">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ZONE_COLOR[z.kind] }} />
          {w.kinds[z.kind]}
        </span>
      </div>
      <Dl
        rows={[
          [w.area, areaHa(z.r).toFixed(2)],
          [w.far, z.far],
          [w.coverage, z.coverage],
          [w.height, z.height],
          [w.green, z.green],
          [w.setback, z.setback],
          [w.gfa, ((z.r.w * z.r.h * z.far) / 1000).toFixed(1)],
          [w.pkgs, pkgs.join(', ') || '—'],
        ]}
      />
      <div>
        <p className="mb-2 text-xs text-mute">{w.mix}</p>
        <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={w.mix}>
          {USES.filter((u) => z.mix[u]).map((u) => (
            <span key={u} style={{ width: `${z.mix[u]}%`, background: USE_COLOR[u] }} title={`${w.uses[u]} ${z.mix[u]}%`} />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-mute">
          {USES.filter((u) => z.mix[u]).map((u) => (
            <li key={u}>
              {w.uses[u]} <span className="font-mono text-fg/80">{z.mix[u]}%</span>
            </li>
          ))}
        </ul>
      </div>
      {canEdit ? <Btn onClick={onEdit}>✎ {w.editLimits}</Btn> : <p className="text-xs text-mute">🔒 {w.canEdit}</p>}
      <div>
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={[...z.history].reverse()} name={name} />
      </div>
    </div>
  );
}

function RoadDetail({ road: r, w, L, asset }: { road: Road; w: Words; L: (x: { mn: string; en: string }) => string; asset?: Asset }) {
  const t = useText();
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-mono text-xs text-mute">{r.id}</p>
        <p className="font-medium">{L(r.name)}</p>
      </div>
      <Dl
        rows={[
          [w.cls, w.classes[r.cls]],
          [w.width, r.width],
          [w.lanes, r.lanes || '—'],
          [w.speed, r.speed || '—'],
          [w.length, Math.round(lineLen(r.line))],
          [w.state, w.roadState[r.state]],
          [t.common.package, r.pkg ?? '—'],
          ...(asset ? ([[t.section.infra, `${asset.id} · ${t.assetStatus[asset.status]} · ${asset.actual ?? '—'}%`]] as [string, string][]) : []),
        ]}
      />
      {asset && (
        <Link href="/construction/infra" className="inline-flex min-h-10 items-center text-xs text-accent-hi hover:underline">
          {w.openInfra} →
        </Link>
      )}
    </div>
  );
}

function NetDetail({ a, w, L, org }: { a: Asset; w: Words; L: (x: { mn: string; en: string }) => string; org: string }) {
  const t = useText();
  const c = NETWORKS[a.id];
  const load = c ? (c.demand / c.capacity) * 100 : null;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-mono text-xs text-mute">{a.id}</p>
        <p className="font-medium">{a.name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Pill>{t.assetKind[a.kind]}</Pill>
          <Pill tone={toneOf(a.status)}>{t.assetStatus[a.status]}</Pill>
        </div>
      </div>
      <Dl
        rows={[
          [w.length, a.geom ? Math.round(lineLen(a.geom)) : w.noGeom],
          [w.capacity, c ? `${c.capacity.toLocaleString('en-US')} ${c.unit}` : '—'],
          [w.demand, c ? `${c.demand.toLocaleString('en-US')} ${c.unit}` : '—'],
          [w.org, org],
          [t.common.package, a.pkg],
          ...Object.entries(a.attrs),
          ...(c ? ([[w.note, L(c.note)]] as [string, string][]) : []),
        ]}
      />
      {load != null && (
        <div>
          <p className="mb-1 text-xs text-mute">
            {w.load} · <span className="font-mono">{load.toFixed(0)}%</span>
          </p>
          <Bar value={load} tone={loadTone(load)} label={w.load} />
        </div>
      )}
      <Link href="/construction/infra" className="inline-flex min-h-10 items-center text-xs text-accent-hi hover:underline">
        {w.openInfra} →
      </Link>
    </div>
  );
}

type Limits = Pick<Zone, 'far' | 'coverage' | 'height' | 'green' | 'setback'>;
const RANGE: Record<keyof Limits, [number, number]> = { far: [0.1, 10], coverage: [1, 100], height: [3, 200], green: [0, 100], setback: [0, 50] };

function LimitsForm({ zone, w, name, onSave, onDone }: { zone: Zone; w: Words; name: (id: string) => string; onSave: (n: Limits, reason: string) => boolean; onDone: () => void }) {
  const t = useText();
  const [f, setF] = useState<Record<keyof Limits, string>>({ far: String(zone.far), coverage: String(zone.coverage), height: String(zone.height), green: String(zone.green), setback: String(zone.setback) });
  const [reason, setReason] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const label: Record<keyof Limits, string> = { far: w.far, coverage: w.coverage, height: w.height, green: w.green, setback: w.setback };
  const save = () => {
    const p: Problem[] = [];
    const n = {} as Limits;
    for (const k of Object.keys(RANGE) as (keyof Limits)[]) {
      const v = Number(f[k]);
      if (f[k].trim() === '' || Number.isNaN(v) || v < RANGE[k][0] || v > RANGE[k][1]) p.push({ field: k, code: 'range' });
      n[k] = v;
    }
    // a change to approved limits needs its reason on record
    if (!reason.trim()) p.push({ field: 'reason', code: 'required' });
    setProblems(p);
    if (p.length) return;
    if (!onSave(n, reason.trim())) setProblems([{ field: 'role', code: 'forbidden' }]);
    else onDone();
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <p className="text-xs text-mute">
        {w.approved}: {zone.history[0]?.at} · {zone.history[0]?.comment}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.keys(RANGE) as (keyof Limits)[]).map((k) => (
          <Field key={k} label={label[k]} error={problems.some((p) => p.field === k) ? `${t.problem.range} (${RANGE[k][0]}–${RANGE[k][1]})` : undefined}>
            <input type="number" inputMode="decimal" step="any" className={`${inputCls} h-10`} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <Field label={w.reason} error={problems.some((p) => p.field === 'reason') ? t.problem.required : undefined}>
        <textarea className={`${inputCls} h-20 py-1.5`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Problems list={problems.filter((p) => p.code === 'forbidden')} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onDone}>{t.common.cancel}</Btn>
      </div>
      <div className="pt-3">
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={[...zone.history].reverse()} name={name} />
      </div>
    </form>
  );
}
