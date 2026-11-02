'use client';

import { useState, type ReactNode } from 'react';
import { packageProgress, today } from '@/lib/construction/calc';
import { BLOCKS, PHASES, PHASE_COLOR, PLOTS, VERDICT_COLOR, checkPlot, cover, far, parkingNeed, plotArea, worst, zoneOf, type Check, type Plot, type PlotUse, type Tenure, type Verdict } from '@/lib/construction/extra/detailplan';
import { ZONES, areaHa, centre, type Zone } from '@/lib/construction/extra/masterplan';
import { SUBS, useEn, useText, useWords } from '@/lib/construction/text';
import type { Problem } from '@/lib/construction/validate';
import { useExtra, useSubView } from '../extra';
import { Bar, Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Table, toneOf, type Tone } from '../Kit';
import { useStore } from '../Store';
import { Dl, hit, LegendRow, PlanSvg, Row, SubTabs } from './MasterPlan';

// The detailed plan: the district's blocks, the plots (нэгж талбар) inside them, the buildings designed on each plot
// and the phases they are built in. Every plot's parameters are checked against its zone's limits in the master plan
// (the same saved limits a planner edits there); a plot that sits on a land-clearance parcel takes its land status
// from the shared records. A planner ('plan.edit') can revise a plot's parameters; each revision is kept in its history.

const USE_COLOR: Record<PlotUse, string> = { housing: '#93c5fd', commercial: '#f87171', school: '#a78bfa', kindergarten: '#c4b5fd', clinic: '#f472b6', utility: '#22d3ee', parking: '#64748b' };
const BLOCK_COLOR = ['#60a5fa', '#34d399', '#a78bfa', '#7dd3fc', '#f87171'];
const VTONE: Record<Verdict, Tone> = { pass: 'good', warn: 'warn', fail: 'bad', na: 'neutral' };

const W = {
  mn: {
    lead: 'Хорооллын хэсэгчилсэн ерөнхий төлөвлөгөө: хэсэг, нэгж талбар, барилгын үзүүлэлт, үе шат. Барилгын үзүүлэлт бүрийг ерөнхий төлөвлөгөөний бүсийн хязгаартай тулгаж шалгана.',
    plan: 'Төлөвлөгөөний зураг',
    detail: 'Сонгосон объект',
    pick: 'Зураг эсвэл хүснэгтээс хэсэг, нэгж талбар сонгоно уу.',
    block: 'Хэсэг',
    blocks: 'Хэсгийн тоо',
    plot: 'Нэгж талбар',
    plots: 'Нэгж талбарын тоо',
    name: 'Нэр',
    zone: 'Бүс (ЕТ)',
    area: 'Талбай, га',
    areaM: 'Талбай, м²',
    households: 'Өрх',
    residents: 'Хүн ам',
    density: 'Хүн амын нягтшил, хүн/га',
    use: 'Зориулалт',
    tenure: 'Газрын эзэмшил',
    land: 'Газар чөлөөлөлт',
    landReady: 'Газар бэлэн',
    noParcel: 'Чөлөөлөлт шаардлагагүй',
    phase: 'Үе шат',
    floors: 'Давхар',
    height: 'Өндөр, м',
    footprint: 'Барилгын суурийн талбай, м²',
    gfa: 'Нийт талбай (GFA), м²',
    far: 'FAR',
    coverage: 'Барилгажилт, %',
    setback: 'Ухрах зай, м',
    parking: 'Зогсоол (байгаа / шаардлагатай)',
    parkingIn: 'Зогсоолын тоо',
    green: 'Ногоон байгууламж, %',
    result: 'Нийцэл',
    totalGfa: 'Нийт барилгын талбай',
    compliant: 'ЕТ-тэй нийцсэн',
    warn: 'Анхааруулга',
    fail: 'Зөрчилтэй',
    limit: 'хязгаар',
    required: 'шаардлага',
    check: 'Ерөнхий төлөвлөгөөтэй тулгасан',
    years: 'Хугацаа',
    pkgs: 'Багц',
    progress: 'Гүйцэтгэл (батлагдсан)',
    noPkg: 'Багц хараахан байгуулаагүй',
    current: 'Одоо',
    editParams: 'Үзүүлэлт засах',
    reason: 'Өөрчлөлтийн үндэслэл',
    preview: 'Хадгалахаас өмнөх шалгалт',
    canEdit: 'Төлөвлөлтийн мэдээлэл засах эрх: менежер, хяналтын инженер, админ.',
    owners: 'Иргэн, хуулийн этгээдийн нэр хувийн мэдээлэлд хамаарах тул энд харуулахгүй.',
    timeline: 'Үе шатын хуваарь',
    stagePlots: 'Нэгж талбар',
    checks: { far: 'Барилгажилтын нягтрал (FAR)', coverage: 'Барилгажилтын хувь', height: 'Өндөр', setback: 'Улаан шугамаас ухрах зай', green: 'Ногоон байгууламж', parking: 'Авто зогсоол' } as Record<Check['key'], string>,
    verdict: { pass: 'Нийцсэн', warn: 'Анхааруулга', fail: 'Зөрчилтэй', na: '—' } as Record<Verdict, string>,
    uses: { housing: 'Орон сууц', commercial: 'Худалдаа, үйлчилгээ', school: 'Сургууль', kindergarten: 'Цэцэрлэг', clinic: 'Эрүүл мэнд', utility: 'Инженерийн байгууламж', parking: 'Зогсоол' } as Record<PlotUse, string>,
    k2: 'мян. м²',
    tenures: { municipal: 'Нийслэлийн өмч', state: 'Төрийн өмч', acquired: 'Нөхөх олговроор чөлөөлж буй', private: 'Хувийн өмч (хэлэлцээртэй)' } as Record<Tenure, string>,
  },
  en: {
    lead: 'The district’s detailed plan: blocks, plots, building parameters and phasing. Every plot’s parameters are checked against its zone’s limits in the master plan.',
    plan: 'Plan',
    detail: 'Selected',
    pick: 'Pick a block or plot on the plan or in the table.',
    block: 'Block',
    blocks: 'Blocks',
    plot: 'Plot',
    plots: 'Plots',
    name: 'Name',
    zone: 'Zone (master plan)',
    area: 'Area, ha',
    areaM: 'Area, m²',
    households: 'Households',
    residents: 'Residents',
    density: 'Density, people/ha',
    use: 'Use',
    tenure: 'Tenure',
    land: 'Land clearance',
    landReady: 'Land ready',
    noParcel: 'No clearance needed',
    phase: 'Phase',
    floors: 'Floors',
    height: 'Height, m',
    footprint: 'Building footprint, m²',
    gfa: 'Gross floor area, m²',
    far: 'FAR',
    coverage: 'Coverage, %',
    setback: 'Setback, m',
    parking: 'Parking (provided / required)',
    parkingIn: 'Parking spaces',
    green: 'Green space, %',
    result: 'Compliance',
    totalGfa: 'Total floor area',
    compliant: 'Compliant with the master plan',
    warn: 'Warnings',
    fail: 'Non-compliant',
    limit: 'limit',
    required: 'required',
    check: 'Checked against the master plan',
    years: 'Years',
    pkgs: 'Packages',
    progress: 'Progress (approved)',
    noPkg: 'No package set up yet',
    current: 'Now',
    editParams: 'Edit parameters',
    reason: 'Reason for the change',
    preview: 'Check before saving',
    canEdit: 'Planning data may be edited by managers, supervising engineers and admins.',
    owners: 'Names of private owners are personal information and aren’t shown here.',
    timeline: 'Phase timeline',
    stagePlots: 'Plots',
    checks: { far: 'Floor area ratio (FAR)', coverage: 'Site coverage', height: 'Height', setback: 'Setback from the red line', green: 'Green space', parking: 'Parking' },
    verdict: { pass: 'Compliant', warn: 'Warning', fail: 'Non-compliant', na: '—' },
    uses: { housing: 'Housing', commercial: 'Commercial', school: 'School', kindergarten: 'Kindergarten', clinic: 'Health', utility: 'Utility', parking: 'Car park' },
    k2: '’000 m²',
    tenures: { municipal: 'Municipal land', state: 'State land', acquired: 'Being acquired with compensation', private: 'Private (under negotiation)' },
  },
};
type Words = typeof W.mn;

export default function DetailPlan() {
  const t = useText();
  const en = useEn();
  const w = useWords(W);
  const { data, can, log, user } = useStore();
  const [view, setView] = useSubView('detailplan', SUBS.detailplan!);
  const [zones] = useExtra<Zone[]>('masterplan.zones', ZONES);
  const [plots, setPlots] = useExtra<Plot[]>('detailplan.plots', PLOTS);
  const [selBlock, setSelBlock] = useState<string | null>(null);
  const [selPlot, setSelPlot] = useState<string | null>(null);
  const [selPhase, setSelPhase] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const L = (x: { mn: string; en: string }) => (en ? x.en : x.mn);
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? id;

  const checks = (p: Plot) => checkPlot(p, zoneOf(zones, p));
  const verdict = (p: Plot) => worst(checks(p).map((c) => c.verdict));
  const parcels = (p: Plot) => p.parcels.map((id) => data.parcels.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  const landReady = (p: Plot) => parcels(p).every((x) => x.status === 'cleared');
  const blockPlots = (b: string) => plots.filter((p) => p.block === b);
  const progress = (pkg: string) => packageProgress(data, pkg).approved;
  const plot = plots.find((p) => p.id === selPlot);
  const block = BLOCKS.find((b) => b.id === selBlock);
  const phase = PHASES.find((p) => p.id === selPhase);
  const edit = plots.find((p) => p.id === editing);
  const totalGfa = plots.reduce((s, p) => s + p.gfa, 0);
  const vs = plots.map(verdict);

  const savePlot = (id: string, next: Partial<Plot>, reason: string) => {
    const p = plots.find((x) => x.id === id)!;
    const keys = ['floors', 'height', 'footprint', 'gfa', 'setback', 'parking', 'green'] as const;
    const diff = keys.filter((k) => next[k] !== undefined && next[k] !== p[k]).map((k) => `${k} ${p[k]} → ${next[k]}`);
    if (!diff.length) return true;
    if (!log('plan.edit', id, diff.join('; '))) return false;
    setPlots((all) => all.map((x) => (x.id === id ? { ...x, ...next, history: [...x.history, { at: today(), by: user, action: diff.join('; '), comment: reason || undefined }] } : x)));
    return true;
  };

  // ---- figures per view ----
  const kpis: Record<string, ReactNode> = {
    blocks: (
      <>
        <Kpi label={w.blocks} value={BLOCKS.length} />
        <Kpi label={w.area} value={BLOCKS.reduce((s, b) => s + areaHa(b.r), 0).toFixed(1)} />
        <Kpi label={w.households} value={BLOCKS.reduce((s, b) => s + b.households, 0).toLocaleString('en-US')} />
        <Kpi label={w.residents} value={BLOCKS.reduce((s, b) => s + b.residents, 0).toLocaleString('en-US')} />
      </>
    ),
    plots: (
      <>
        <Kpi label={w.plots} value={plots.length} />
        <Kpi label={w.area} value={(plots.reduce((s, p) => s + plotArea(p), 0) / 10000).toFixed(2)} />
        <Kpi label={w.landReady} value={`${plots.filter(landReady).length} / ${plots.length}`} tone={plots.every(landReady) ? 'good' : 'warn'} />
        <Kpi label={t.parcelStatus.disputed} value={plots.filter((p) => parcels(p).some((x) => x.status === 'disputed')).length} tone={plots.some((p) => parcels(p).some((x) => x.status === 'disputed')) ? 'bad' : 'good'} />
      </>
    ),
    parameters: (
      <>
        <Kpi label={w.totalGfa} value={`${(totalGfa / 1000).toFixed(1)} ${w.k2}`} />
        <Kpi label={w.compliant} value={`${vs.filter((v) => v === 'pass').length} / ${plots.length}`} tone="good" />
        <Kpi label={w.warn} value={vs.filter((v) => v === 'warn').length} tone={vs.includes('warn') ? 'warn' : 'neutral'} />
        <Kpi label={w.fail} value={vs.filter((v) => v === 'fail').length} tone={vs.includes('fail') ? 'bad' : 'good'} />
      </>
    ),
    phasing: (
      <>
        {PHASES.map((ph) => (
          <Kpi key={ph.id} label={L(ph.name).split('—')[0].trim()} value={`${ph.from}–${ph.to}`} sub={`${plots.filter((p) => p.phase === ph.id).length} ${w.stagePlots.toLowerCase()} · ${(plots.filter((p) => p.phase === ph.id).reduce((s, p) => s + p.gfa, 0) / 1000).toFixed(1)} ${w.k2}`} />
        ))}
        <Kpi label={w.totalGfa} value={`${(totalGfa / 1000).toFixed(1)} ${w.k2}`} />
      </>
    ),
  };

  // ---- plan ----
  const plotFill = (p: Plot) => (view === 'plots' ? USE_COLOR[p.use] : view === 'parameters' ? VERDICT_COLOR[verdict(p)] : view === 'phasing' ? PHASE_COLOR[p.phase] : 'var(--color-mute)');
  const plotOn = (p: Plot) => (view === 'phasing' ? p.phase === selPhase : p.id === selPlot);
  const pickPlot = (p: Plot) => (view === 'phasing' ? setSelPhase(p.phase) : view === 'blocks' ? setSelBlock(p.block) : setSelPlot(p.id));
  const plan = (
    <PlanSvg label={`${t.section.detailplan} — ${t.sub[view]}`}>
      {zones.map((z) => (
        <g key={z.id} className="pointer-events-none">
          <rect x={z.r.x} y={z.r.y} width={z.r.w} height={z.r.h} fill="none" stroke="var(--color-mute)" strokeOpacity={0.35} strokeDasharray="2 4" />
          <text x={z.r.x + 6} y={z.r.y + 16} fontSize="12" fill="var(--color-mute)" className="font-mono">
            {z.id}
          </text>
        </g>
      ))}
      {view === 'blocks' &&
        BLOCKS.map((b, i) => (
          <g key={b.id} {...hit(() => setSelBlock(b.id), `${b.id} ${L(b.name)}`)}>
            <rect x={b.r.x} y={b.r.y} width={b.r.w} height={b.r.h} fill={BLOCK_COLOR[i]} fillOpacity={b.id === selBlock ? 0.32 : 0.16} stroke={b.id === selBlock ? 'var(--color-accent-hi)' : BLOCK_COLOR[i]} strokeWidth={b.id === selBlock ? 4 : 2} />
            <text x={b.r.x + b.r.w - 8} y={b.r.y + 22} textAnchor="end" fontSize="17" fill="var(--color-fg)" className="pointer-events-none font-mono">
              {b.id}
            </text>
          </g>
        ))}
      {plots.map((p) => (
        <g key={p.id} {...hit(() => pickPlot(p), `${p.id} ${L(p.name)}`)}>
          <rect x={p.r.x} y={p.r.y} width={p.r.w} height={p.r.h} fill={plotFill(p)} fillOpacity={view === 'blocks' ? 0.08 : plotOn(p) ? 0.7 : 0.42} stroke={plotOn(p) ? 'var(--color-accent-hi)' : 'var(--color-fg)'} strokeOpacity={plotOn(p) ? 1 : 0.55} strokeWidth={plotOn(p) ? 4 : 1.2} />
          {/* a building's footprint, drawn to scale in the middle of its plot */}
          {view === 'parameters' && <rect x={centre(p.r)[0] - Math.sqrt(p.footprint) / 2} y={centre(p.r)[1] - Math.sqrt(p.footprint) / 2} width={Math.sqrt(p.footprint)} height={Math.sqrt(p.footprint)} fill="var(--color-ink)" fillOpacity={0.55} className="pointer-events-none" />}
          <text x={p.r.x + 5} y={p.r.y + 16} fontSize="13" fill="var(--color-fg)" className="pointer-events-none font-mono">
            {view === 'parameters' ? `${p.id} · ${p.floors}F` : p.id}
          </text>
        </g>
      ))}
    </PlanSvg>
  );
  const legend: [string, string][] =
    view === 'plots'
      ? (Object.keys(USE_COLOR) as PlotUse[]).map((u) => [w.uses[u], USE_COLOR[u]])
      : view === 'parameters'
        ? (['pass', 'warn', 'fail'] as Verdict[]).map((v) => [w.verdict[v], VERDICT_COLOR[v]])
        : view === 'phasing'
          ? PHASES.map((ph) => [`${L(ph.name).split('—')[0].trim()} · ${ph.from}–${ph.to}`, PHASE_COLOR[ph.id]])
          : BLOCKS.map((b, i) => [b.id, BLOCK_COLOR[i]]);

  const landPills = (p: Plot) =>
    p.parcels.length ? (
      <span className="flex flex-wrap gap-1">
        {parcels(p).map((x) => (
          <Pill key={x.id} tone={toneOf(x.status)}>
            {x.id} · {t.parcelStatus[x.status]}
          </Pill>
        ))}
      </span>
    ) : (
      <span className="text-xs text-mute">{w.noParcel}</span>
    );

  return (
    <div className="space-y-6">
      <PageHead title={t.section.detailplan} lead={w.lead} />
      <SubTabs views={SUBS.detailplan!} view={view} onChange={setView} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis[view]}</div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title={`${w.plan} · ${t.sub[view]}`}>
          {plan}
          <LegendRow items={legend} />
        </Panel>
        <Panel title={w.detail}>
          {view === 'blocks' && block ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-mono text-xs text-mute">{block.id}</p>
                <p className="font-medium">{L(block.name)}</p>
              </div>
              <Dl
                rows={[
                  [w.zone, block.zone],
                  [w.area, areaHa(block.r).toFixed(2)],
                  [w.households, block.households || '—'],
                  [w.residents, block.residents || '—'],
                  [w.density, block.residents ? Math.round(block.residents / areaHa(block.r)) : '—'],
                  [w.totalGfa, `${(blockPlots(block.id).reduce((s, p) => s + p.gfa, 0) / 1000).toFixed(1)} ${w.k2}`],
                ]}
              />
              <ul className="space-y-1">
                {blockPlots(block.id).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelPlot(p.id);
                        setView('plots');
                      }}
                      className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-line px-3 text-left text-xs hover:border-mute"
                    >
                      <span>
                        <span className="font-mono text-mute">{p.id}</span> · {L(p.name)}
                      </span>
                      <Pill tone={VTONE[verdict(p)]}>{w.verdict[verdict(p)]}</Pill>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : view === 'phasing' && phase ? (
            <PhaseDetail phase={phase} plots={plots.filter((p) => p.phase === phase.id)} w={w} L={L} progress={progress} pkgName={(id) => data.packages.find((p) => p.id === id)?.name ?? id} />
          ) : (view === 'plots' || view === 'parameters') && plot ? (
            <PlotDetail plot={plot} checks={checks(plot)} zone={zoneOf(zones, plot)} land={landPills(plot)} w={w} L={L} name={name} canEdit={can('plan.edit')} onEdit={() => setEditing(plot.id)} />
          ) : (
            <p className="text-sm text-mute">{w.pick}</p>
          )}
        </Panel>
      </div>

      {view === 'blocks' && (
        <Panel title={t.sub.blocks}>
          <Table head={['ID', w.name, w.zone, w.area, w.plots, w.households, w.residents, w.density, w.result]}>
            {BLOCKS.map((b) => {
              const ps = blockPlots(b.id);
              const v = worst(ps.map(verdict));
              return (
                <Row key={b.id} on={b.id === selBlock} onClick={() => setSelBlock(b.id)}>
                  <td className="px-2 py-2 font-mono text-xs">{b.id}</td>
                  <td className="px-2 py-2">{L(b.name)}</td>
                  <td className="px-2 py-2 font-mono text-xs">{b.zone}</td>
                  <td className="px-2 py-2 font-mono text-xs">{areaHa(b.r).toFixed(2)}</td>
                  <td className="px-2 py-2 font-mono text-xs">{ps.length}</td>
                  <td className="px-2 py-2 font-mono text-xs">{b.households || '—'}</td>
                  <td className="px-2 py-2 font-mono text-xs">{b.residents || '—'}</td>
                  <td className="px-2 py-2 font-mono text-xs">{b.residents ? Math.round(b.residents / areaHa(b.r)) : '—'}</td>
                  <td className="px-2 py-2">
                    <Pill tone={VTONE[v]}>{w.verdict[v]}</Pill>
                  </td>
                </Row>
              );
            })}
          </Table>
        </Panel>
      )}
      {view === 'plots' && (
        <Panel title={t.sub.plots}>
          <Table head={['ID', w.name, w.block, w.use, w.areaM, w.tenure, w.land, w.pkgs, w.phase]}>
            {plots.map((p) => (
              <Row key={p.id} on={p.id === selPlot} onClick={() => setSelPlot(p.id)}>
                <td className="px-2 py-2 font-mono text-xs">{p.id}</td>
                <td className="px-2 py-2">{L(p.name)}</td>
                <td className="px-2 py-2 font-mono text-xs">{p.block}</td>
                <td className="px-2 py-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: USE_COLOR[p.use] }} />
                    {w.uses[p.use]}
                  </span>
                </td>
                <td className="px-2 py-2 font-mono text-xs">{plotArea(p).toLocaleString('en-US')}</td>
                <td className="px-2 py-2 text-xs text-mute">{w.tenures[p.tenure]}</td>
                <td className="px-2 py-2">{landPills(p)}</td>
                <td className="px-2 py-2 font-mono text-xs">{p.pkg ?? '—'}</td>
                <td className="px-2 py-2 font-mono text-xs">{p.phase}</td>
              </Row>
            ))}
          </Table>
          <p className="mt-3 text-xs text-mute">🔒 {w.owners}</p>
        </Panel>
      )}
      {view === 'parameters' && (
        <Panel title={t.sub.parameters} action={!can('plan.edit') && <Forbidden />}>
          <Table head={['ID', w.floors, w.height, w.gfa, w.far, w.coverage, w.setback, w.parking, w.green, w.result, '']}>
            {plots.map((p) => {
              const cs = checks(p);
              const cell = (k: Check['key'], text: string) => {
                const c = cs.find((x) => x.key === k);
                const cls = c?.verdict === 'fail' ? 'text-red-300' : c?.verdict === 'warn' ? 'text-sky-300' : '';
                return <td className={`px-2 py-2 font-mono text-xs ${cls}`} title={c ? `${w.limit}: ${fmt(c.limit)}` : undefined}>{text}</td>;
              };
              const v = verdict(p);
              return (
                <Row key={p.id} on={p.id === selPlot} onClick={() => setSelPlot(p.id)}>
                  <td className="px-2 py-2 font-mono text-xs">{p.id}</td>
                  <td className="px-2 py-2 font-mono text-xs">{p.floors}</td>
                  {cell('height', fmt(p.height))}
                  <td className="px-2 py-2 font-mono text-xs">{p.gfa.toLocaleString('en-US')}</td>
                  {cell('far', far(p).toFixed(2))}
                  {cell('coverage', cover(p).toFixed(1))}
                  {cell('setback', String(p.setback))}
                  {cell('parking', `${p.parking} / ${parkingNeed(p)}`)}
                  {cell('green', String(p.green))}
                  <td className="px-2 py-2">
                    <Pill tone={VTONE[v]}>{w.verdict[v]}</Pill>
                  </td>
                  <td className="px-2 py-2">
                    {can('plan.edit') && (
                      <button
                        type="button"
                        className="min-h-10 cursor-pointer rounded-full border border-line px-3 text-xs hover:border-mute"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(p.id);
                        }}
                      >
                        {t.common.edit}
                      </button>
                    )}
                  </td>
                </Row>
              );
            })}
          </Table>
        </Panel>
      )}
      {view === 'phasing' && (
        <Panel title={w.timeline}>
          <Timeline selected={selPhase} onPick={setSelPhase} L={L} now={w.current} />
          <div className="mt-6">
            <Table head={[w.phase, w.years, w.stagePlots, w.totalGfa, w.pkgs]}>
              {PHASES.map((ph) => {
                const ps = plots.filter((p) => p.phase === ph.id);
                return (
                  <Row key={ph.id} on={ph.id === selPhase} onClick={() => setSelPhase(ph.id)}>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PHASE_COLOR[ph.id] }} />
                        {L(ph.name)}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">
                      {ph.from}–{ph.to}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{ps.map((p) => p.id).join(', ')}</td>
                    <td className="px-2 py-2 font-mono text-xs">{ps.reduce((s, p) => s + p.gfa, 0).toLocaleString('en-US')}</td>
                    <td className="min-w-[180px] px-2 py-2 text-xs">
                      {ph.pkgs.length ? (
                        <ul className="space-y-1.5">
                          {ph.pkgs.map((k) => (
                            <li key={k}>
                              <span className="flex justify-between font-mono text-[11px]">
                                <span>{k}</span>
                                <span className="text-mute">{Math.round(progress(k))}%</span>
                              </span>
                              <Bar value={progress(k)} tone={progress(k) >= 100 ? 'good' : 'info'} label={k} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-mute">{w.noPkg}</span>
                      )}
                    </td>
                  </Row>
                );
              })}
            </Table>
          </div>
        </Panel>
      )}

      <Drawer open={!!edit} onClose={() => setEditing(null)} title={edit ? `${edit.id} · ${w.editParams}` : ''}>
        {edit && <ParamsForm key={edit.id} plot={edit} zone={zoneOf(zones, edit)} w={w} name={name} onSave={(n, r) => savePlot(edit.id, n, r)} onDone={() => setEditing(null)} />}
      </Drawer>
    </div>
  );
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 2 : 1));

function Checks({ list, w }: { list: Check[]; w: Words }) {
  return (
    <ul className="space-y-1.5 text-xs">
      {list.map((c) => (
        <li key={c.key} className="flex items-center justify-between gap-2 border-b border-line/50 pb-1.5">
          <span className="text-mute">{w.checks[c.key]}</span>
          <span className="flex items-center gap-2">
            <span className="font-mono">
              {fmt(c.value)} <span className="text-mute">{['setback', 'green', 'parking'].includes(c.key) ? '≥' : '≤'} {fmt(c.limit)}</span>
            </span>
            <Pill tone={VTONE[c.verdict]}>{w.verdict[c.verdict]}</Pill>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlotDetail({ plot: p, checks, zone, land, w, L, name, canEdit, onEdit }: { plot: Plot; checks: Check[]; zone?: Zone; land: ReactNode; w: Words; L: (x: { mn: string; en: string }) => string; name: (id: string) => string; canEdit: boolean; onEdit: () => void }) {
  const t = useText();
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-mono text-xs text-mute">{p.id}</p>
        <p className="font-medium">{L(p.name)}</p>
      </div>
      <Dl
        rows={[
          [w.use, w.uses[p.use]],
          [w.areaM, plotArea(p).toLocaleString('en-US')],
          [w.block, p.block],
          [w.zone, zone ? `${zone.id} · ${L(zone.name)}` : '—'],
          [w.tenure, w.tenures[p.tenure]],
          [w.land, land],
          [t.common.package, p.pkg ?? '—'],
          [w.phase, p.phase],
          [w.floors, p.floors],
          [w.gfa, p.gfa.toLocaleString('en-US')],
        ]}
      />
      <div>
        <p className="mb-2 text-xs text-mute">{w.check}</p>
        <Checks list={checks} w={w} />
      </div>
      {canEdit ? <Btn onClick={onEdit}>✎ {w.editParams}</Btn> : <p className="text-xs text-mute">🔒 {w.canEdit}</p>}
      <div>
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={[...p.history].reverse()} name={name} />
      </div>
    </div>
  );
}

function PhaseDetail({ phase, plots, w, L, progress, pkgName }: { phase: (typeof PHASES)[number]; plots: Plot[]; w: Words; L: (x: { mn: string; en: string }) => string; progress: (pkg: string) => number; pkgName: (id: string) => string }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-mono text-xs text-mute">{phase.id}</p>
        <p className="font-medium">{L(phase.name)}</p>
        <p className="font-mono text-xs text-mute">
          {phase.from}–{phase.to}
        </p>
      </div>
      <div>
        <p className="mb-1 text-xs text-mute">{w.stagePlots}</p>
        <ul className="space-y-0.5 text-xs">
          {plots.map((p) => (
            <li key={p.id}>
              <span className="font-mono text-mute">{p.id}</span> · {L(p.name)}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-xs text-mute">{w.progress}</p>
        {phase.pkgs.length ? (
          <ul className="space-y-2 text-xs">
            {phase.pkgs.map((k) => (
              <li key={k}>
                <span className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-mono">{k}</span> · {pkgName(k)}
                  </span>
                  <span className="font-mono text-mute">{Math.round(progress(k))}%</span>
                </span>
                <Bar value={progress(k)} tone={progress(k) >= 100 ? 'good' : 'info'} label={k} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mute">{w.noPkg}</p>
        )}
      </div>
    </div>
  );
}

// phases as bars on a 2025–2031 year axis, with a marker for today
function Timeline({ selected, onPick, L, now }: { selected: string | null; onPick: (id: string) => void; L: (x: { mn: string; en: string }) => string; now: string }) {
  const Y0 = 2025;
  const Y1 = 2032;
  const pos = (y: number) => ((y - Y0) / (Y1 - Y0)) * 100;
  const d = new Date();
  const nowY = d.getFullYear() + d.getMonth() / 12;
  return (
    <div className="relative">
      <div className="mb-2 grid text-[11px] text-mute" style={{ gridTemplateColumns: `repeat(${Y1 - Y0}, minmax(0,1fr))` }}>
        {Array.from({ length: Y1 - Y0 }, (_, i) => (
          <span key={i} className="border-l border-line pl-1 font-mono">
            {Y0 + i}
          </span>
        ))}
      </div>
      <div className="relative space-y-2">
        {PHASES.map((ph) => (
          <button
            key={ph.id}
            type="button"
            onClick={() => onPick(ph.id)}
            aria-pressed={selected === ph.id}
            className="relative block h-10 w-full cursor-pointer rounded-lg bg-line/30 text-left"
          >
            <span
              className={`absolute inset-y-1 flex items-center overflow-hidden rounded-md px-2 text-xs whitespace-nowrap text-ink ${selected === ph.id ? 'ring-2 ring-accent-hi' : ''}`}
              style={{ left: `${pos(ph.from)}%`, width: `${pos(ph.to + 1) - pos(ph.from)}%`, background: PHASE_COLOR[ph.id] }}
            >
              {L(ph.name).split('—')[0].trim()}
            </span>
          </button>
        ))}
        {nowY >= Y0 && nowY <= Y1 && (
          <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-fg/80" style={{ left: `${pos(nowY)}%` }} title={now}>
            <span className="absolute -top-4 -translate-x-1/2 text-[10px] text-fg">{now}</span>
          </span>
        )}
      </div>
    </div>
  );
}

type Params = Pick<Plot, 'floors' | 'height' | 'footprint' | 'gfa' | 'setback' | 'parking' | 'green'>;
const PRANGE: Record<keyof Params, [number, number]> = { floors: [1, 60], height: [3, 200], footprint: [10, 100000], gfa: [10, 1000000], setback: [0, 50], parking: [0, 5000], green: [0, 100] };

function ParamsForm({ plot, zone, w, name, onSave, onDone }: { plot: Plot; zone?: Zone; w: Words; name: (id: string) => string; onSave: (n: Params, reason: string) => boolean; onDone: () => void }) {
  const t = useText();
  const keys = Object.keys(PRANGE) as (keyof Params)[];
  const [f, setF] = useState<Record<keyof Params, string>>(Object.fromEntries(keys.map((k) => [k, String(plot[k])])) as Record<keyof Params, string>);
  const [reason, setReason] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const label: Record<keyof Params, string> = { floors: w.floors, height: w.height, footprint: w.footprint, gfa: w.gfa, setback: w.setback, parking: w.parkingIn, green: w.green };
  const bad = (k: keyof Params) => {
    const v = Number(f[k]);
    return f[k].trim() === '' || Number.isNaN(v) || v < PRANGE[k][0] || v > PRANGE[k][1];
  };
  // the check runs as the planner types, so a breach shows before it's saved
  const draft: Plot = { ...plot, ...(Object.fromEntries(keys.map((k) => [k, bad(k) ? plot[k] : Number(f[k])])) as Params) };
  const save = () => {
    const p: Problem[] = keys.filter(bad).map((k) => ({ field: k, code: 'range' as const }));
    if (Number(f.footprint) > plotArea(plot)) p.push({ field: 'footprint', code: 'range' });
    if (!reason.trim()) p.push({ field: 'reason', code: 'required' });
    setProblems(p);
    if (p.length) return;
    if (!onSave(Object.fromEntries(keys.map((k) => [k, Number(f[k])])) as Params, reason.trim())) setProblems([{ field: 'role', code: 'forbidden' }]);
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
        {w.areaM}: <span className="font-mono">{plotArea(plot).toLocaleString('en-US')}</span> · {w.zone}: {zone?.id ?? '—'}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {keys.map((k) => (
          <Field key={k} label={label[k]} error={problems.some((p) => p.field === k) ? t.problem.range : undefined}>
            <input type="number" inputMode="decimal" step="any" className={`${inputCls} h-10`} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <div className="rounded-lg border border-line p-3">
        <p className="mb-2 text-xs text-mute">{w.preview}</p>
        <Checks list={checkPlot(draft, zone)} w={w} />
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
        <History items={[...plot.history].reverse()} name={name} />
      </div>
    </form>
  );
}

