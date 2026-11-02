'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { SENSORS, level, reading } from '@/lib/monitor';
import { activityProgress, days, isOverdue, money, overdueIssue, packageProgress, permitWarning, progressCurve, projectProgress, today, tug, variance } from '@/lib/construction/calc';
import { useEn, useText, useWords } from '@/lib/construction/text';
import { useStore } from '../Store';
import { Bars, Donut, LineChart } from '../Charts';
import { Bar, Drawer, Kpi, PageHead, Panel, Pill, Select, Table, toneOf, Loading } from '../Kit';
import WorkspaceMap, { type Pick } from '../WorkspaceMap';

// The management overview: every part of the workspace in one screen — KPI cards, charts, the map and a list of
// what's coming up. Every figure comes from lib/construction/calc.ts (the same rules as the reports), and every card
// or chart leads to the section with the detail. Filters: package and status, and the date the plan is measured at.

const W = {
  mn: {
    lead: 'Хуваарь, биет гүйцэтгэл, санхүүжилт, чанар, аюулгүй байдал, газар, зөвшөөрөл, дэд бүтэц, мэдрэгч, нийгмийн үзүүлэлт — нэг дор. Тоо бүр жишээ өгөгдлөөс, тайлантай ижил дүрмээр тооцогдоно.',
    asOf: 'Төлөвлөгөөг хэмжих огноо',
    projects: 'Төсөл / идэвхтэй багц',
    progress: 'Биет гүйцэтгэл (батлагдсан)',
    progressSub: (p: number, r: number) => `Төлөвлөгөө ${Math.round(p)}% · мэдүүлсэн ${Math.round(r)}%`,
    overdue: 'Хугацаа хэтэрсэн ажил',
    overdueSub: (v: number) => `Хамгийн их хоцрогдол ${v} хоног`,
    budget: 'Батлагдсан төсөв',
    committed: 'Гэрээгээр хүлээсэн',
    paid: 'Бодит зарцуулалт (төлөгдсөн)',
    paidSub: (p: string) => `Төлөвлөсөн санхүүжилт өнөөдрийг хүртэл: ${p}`,
    defects: 'Шийдвэрлээгүй гэмтэл, үл тохирол',
    safety: 'Нээлттэй ХАБЭА асуудал',
    land: 'Чөлөөлөгдсөн нэгж талбар',
    permits: 'Хүлээгдэж буй / хугацаа дууссан зөвшөөрөл',
    infra: 'Дэд бүтэц: дууссан / хоцорсон',
    iot: 'Мэдрэгчийн анхааруулга (симуляц)',
    esg: 'Байгаль орчин, нийгмийн үзүүлэлт',
    esgSub: (n: number) => `${n} нь өгөгдөлгүй`,
    curve: 'Төлөвлөсөн ба батлагдсан биет гүйцэтгэл (S-муруй)',
    planned: 'Төлөвлөгөө (үндсэн хуваарь)',
    approved: 'Батлагдсан гүйцэтгэл',
    reported: 'Мэдүүлсэн',
    byPkg: 'Багц тус бүрийн гүйцэтгэл',
    moneyByPkg: 'Санхүүжилт багцаар',
    issues: 'Чанар, аюулгүй байдлын асуудал',
    map: 'Газрын зураг',
    upcoming: 'Ойрын 60 хоногт',
    activity: 'Ажил',
    milestone: 'Төлбөрийн үе шат',
    rule: 'Нийт гүйцэтгэл = багцын батлагдсан төсвөөр жигнэсэн, багц доторх ажлууд жингээрээ. Зөвхөн батлагдсан бүртгэл тооцогдоно.',
    open: 'Хэсгийг нээх',
  },
  en: {
    lead: 'Schedule, physical progress, financing, quality, safety, land, permits, infrastructure, sensors and social indicators in one place. Every figure is from sample data, calculated by the same rules as the reports.',
    asOf: 'Measure the plan at',
    projects: 'Projects / active packages',
    progress: 'Physical progress (approved)',
    progressSub: (p: number, r: number) => `Planned ${Math.round(p)}% · reported ${Math.round(r)}%`,
    overdue: 'Overdue activities',
    overdueSub: (v: number) => `Largest slip ${v} days`,
    budget: 'Approved budget',
    committed: 'Committed by contract',
    paid: 'Actual expenditure (paid)',
    paidSub: (p: string) => `Planned financing to date: ${p}`,
    defects: 'Unresolved defects and NCRs',
    safety: 'Open H&S issues',
    land: 'Cleared parcels',
    permits: 'Permits pending / expired',
    infra: 'Infrastructure: completed / delayed',
    iot: 'Sensor alerts (simulated)',
    esg: 'Environmental and social indicators',
    esgSub: (n: number) => `${n} without data`,
    curve: 'Planned vs approved physical progress (S-curve)',
    planned: 'Planned (baseline)',
    approved: 'Approved progress',
    reported: 'Reported',
    byPkg: 'Progress by package',
    moneyByPkg: 'Financing by package',
    issues: 'Quality and safety issues',
    map: 'Map',
    upcoming: 'In the next 60 days',
    activity: 'Activity',
    milestone: 'Payment milestone',
    rule: 'Overall progress = packages weighted by approved budget, activities by their weight. Only approved records count.',
    open: 'Open section',
  },
};

export default function Dashboard() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, ready } = useStore();
  const [pkg, setPkg] = useState('all');
  const [status, setStatus] = useState('all');
  const [asOf, setAsOf] = useState(today());
  const [picked, setPicked] = useState<Pick | null>(null);

  const pkgs = useMemo(() => data.packages.filter((p) => (pkg === 'all' || p.id === pkg) && (status === 'all' || p.status === status)).map((p) => p.id), [data, pkg, status]);
  const prog = projectProgress(data, pkgs, asOf);
  const acts = data.activities.filter((a) => pkgs.includes(a.pkg));
  const overdue = acts.filter((a) => isOverdue(data, a, asOf));
  const maxSlip = Math.max(0, ...acts.map((a) => variance(data, a) ?? 0));
  const m = money(data, pkgs);
  const defects = data.defects.filter((d) => pkgs.includes(d.pkg) && d.state !== 'resolved');
  const safety = data.safety.filter((s) => pkgs.includes(s.pkg) && s.state !== 'resolved');
  const parcels = data.parcels;
  const permits = data.permits.filter((p) => pkgs.includes(p.pkg));
  const assets = data.assets.filter((a) => pkgs.includes(a.pkg));
  const alerts = data.sensors.filter((s) => pkgs.includes(s.pkg)).filter((l) => {
    const s = SENSORS.find((x) => x.id === l.sensor);
    return s && level(s, reading(s, Date.now() / 1000)) !== 'ok';
  });
  const curve = useMemo(() => progressCurve(data, pkgs), [data, pkgs]);
  const soon = (d: string) => d >= asOf && days(asOf, d) <= 60;

  if (!ready) return <Loading />;

  const issueParts = (['open', 'review', 'resolved'] as const).map((s, i) => ({
    key: s,
    name: t.issueState[s],
    value: data.defects.filter((d) => pkgs.includes(d.pkg) && d.state === s).length + data.safety.filter((x) => pkgs.includes(x.pkg) && x.state === s).length,
    color: ['#7dd3fc', '#3b82f6', '#7fa36a'][i],
  }));
  const pickedHref = picked ? { package: '/construction/schedule', parcel: '/construction/land', asset: '/construction/infra', sensor: '/construction/iot', defect: '/construction/quality', safety: '/construction/safety' }[picked.kind] : '';

  return (
    <div className="space-y-6">
      <PageHead title={t.section.dashboard} lead={w.lead} />

      {/* filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Select label={t.filter.project} value="P-1" onChange={() => {}} options={data.projects.map((p) => [p.id, p.name])} />
        <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p) => [p.id, `${p.id} · ${p.name}`] as [string, string])]} />
        <Select label={t.filter.status} value={status} onChange={setStatus} options={[['all', t.filter.all], ...(['planned', 'active', 'done', 'suspended'] as const).map((s) => [s, t.pkgStatus[s]] as [string, string])]} />
        <label className="flex flex-col gap-1 text-xs text-mute">
          {w.asOf}
          <input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} className="h-9 rounded-lg border border-line bg-ink px-2 text-sm text-fg" />
        </label>
      </div>

      {/* KPI cards: each leads to its section */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Kpi label={w.projects} value={`${data.projects.length} / ${data.packages.filter((p) => pkgs.includes(p.id) && p.status === 'active').length}`} href="/construction/schedule" />
        <Kpi label={w.progress} value={`${Math.round(prog.approved)}%`} sub={w.progressSub(prog.planned, prog.reported)} tone={prog.approved < prog.planned - 5 ? 'warn' : 'neutral'} href="/construction/progress" />
        <Kpi label={w.overdue} value={overdue.length} sub={w.overdueSub(maxSlip)} tone={overdue.length ? 'bad' : 'good'} href="/construction/schedule" />
        <Kpi label={w.budget} value={tug(m.budget, en)} sub={`${w.committed}: ${tug(m.hasContract ? m.committed : null, en)}`} href="/construction/finance" />
        <Kpi label={w.paid} value={tug(m.paid, en)} sub={w.paidSub(tug(m.plannedToDate, en))} href="/construction/finance" />
        <Kpi label={w.defects} value={defects.length} sub={`${t.common.overdue}: ${defects.filter((d) => overdueIssue(d.due, d.state, asOf)).length}`} tone={defects.length ? 'warn' : 'good'} href="/construction/quality" />
        <Kpi label={w.safety} value={safety.length} sub={`${t.common.overdue}: ${safety.filter((s) => overdueIssue(s.due, s.state, asOf)).length}`} tone={safety.some((s) => s.severity === 'high') ? 'bad' : safety.length ? 'warn' : 'good'} href="/construction/safety" />
        <Kpi label={w.land} value={`${parcels.filter((p) => p.status === 'cleared').length} / ${parcels.length}`} sub={`${t.parcelStatus.disputed}: ${parcels.filter((p) => p.status === 'disputed').length}`} tone={parcels.some((p) => p.status === 'disputed') ? 'warn' : 'neutral'} href="/construction/land" />
        <Kpi label={w.permits} value={`${permits.filter((p) => p.status === 'pending').length} / ${permits.filter((p) => p.status === 'expired' || permitWarning(p, asOf) === 'expired').length}`} sub={`${t.common.soon}: ${permits.filter((p) => permitWarning(p, asOf) === 'soon').length}`} href="/construction/permits" />
        <Kpi label={w.infra} value={`${assets.filter((a) => a.status === 'completed').length} / ${assets.filter((a) => a.status === 'delayed').length}`} sub={`${t.assetStatus.ongoing}: ${assets.filter((a) => a.status === 'ongoing').length}`} tone={assets.some((a) => a.status === 'delayed') ? 'warn' : 'neutral'} href="/construction/infra" />
        <Kpi label={w.iot} value={alerts.length} sub="SIM" tone={alerts.length ? 'warn' : 'neutral'} href="/construction/iot" />
        <Kpi label={w.esg} value={data.indicators.length} sub={w.esgSub(data.indicators.filter((i) => i.current == null).length)} href="/construction/esg" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title={w.curve} action={<Link href="/construction/progress" className="text-xs text-accent-hi hover:underline">{w.open} →</Link>}>
          <LineChart
            labels={curve.map((c) => c.month.slice(2))}
            unit="%"
            max={100}
            series={[
              { name: w.planned, color: '#8ea6cc', values: curve.map((c) => c.planned), dashed: true },
              { name: w.approved, color: '#60a5fa', values: curve.map((c) => c.approved) },
            ]}
          />
          <p className="mt-2 text-[11px] text-mute">{w.rule}</p>
        </Panel>
        <Panel title={w.map}>
          <WorkspaceMap data={data} layers={['packages', 'parcels', 'assets', 'sensors', 'issues']} initial={['packages', 'issues', 'sensors']} only={{ pkgs }} selected={picked?.id} onPick={setPicked} height="h-[300px]" />
        </Panel>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <Panel title={w.byPkg} action={<Link href="/construction/progress" className="text-xs text-accent-hi hover:underline">{w.open} →</Link>}>
          <ul className="space-y-3">
            {data.packages
              .filter((p) => pkgs.includes(p.id))
              .map((p) => {
                const v = packageProgress(data, p.id, asOf);
                return (
                  <li key={p.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate">
                        <span className="font-mono text-mute">{p.id}</span> {p.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Pill tone={toneOf(p.status)}>{t.pkgStatus[p.status]}</Pill>
                        <span className="font-mono tabular-nums">{Math.round(v.approved)}%</span>
                      </span>
                    </div>
                    <Bar value={v.approved} planned={v.planned} tone={v.approved < v.planned - 5 ? 'warn' : 'info'} label={p.id} />
                  </li>
                );
              })}
          </ul>
          <p className="mt-3 text-[11px] text-mute">▏ = {w.planned}</p>
        </Panel>
        <Panel title={w.moneyByPkg} action={<Link href="/construction/finance" className="text-xs text-accent-hi hover:underline">{w.open} →</Link>}>
          <Bars
            unit={en ? '₮ m' : 'сая ₮'}
            fmt={(v) => tug(v, en)}
            measures={[
              { name: w.budget, color: '#8ea6cc' },
              { name: w.committed, color: '#a78bfa' },
              { name: w.paid, color: '#60a5fa' },
            ]}
            rows={data.packages
              .filter((p) => pkgs.includes(p.id))
              .map((p) => {
                const mm = money(data, [p.id]);
                return { label: p.id, values: [mm.budget, mm.hasContract ? mm.committed : null, mm.hasContract ? mm.paid : null] };
              })}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Panel title={w.issues} action={<Link href="/construction/quality" className="text-xs text-accent-hi hover:underline">{w.open} →</Link>}>
          <Donut parts={issueParts} label={w.issues} />
        </Panel>
        <Panel title={w.upcoming}>
          <Table head={[t.common.date, w.activity, t.common.package, t.common.status]} empty={!acts.some((a) => soon(a.finish)) && !data.milestones.some((x) => soon(x.due))}>
            {acts
              .filter((a) => soon(a.finish))
              .map((a) => (
                <tr key={a.id}>
                  <td className="px-2 py-2 font-mono text-xs">{a.finish}</td>
                  <td className="px-2 py-2">{a.name}</td>
                  <td className="px-2 py-2 font-mono text-xs text-mute">{a.pkg}</td>
                  <td className="px-2 py-2">
                    <Pill tone="info">{Math.round(activityProgress(data, a.id).approved)}%</Pill>
                  </td>
                </tr>
              ))}
            {data.milestones
              .filter((x) => soon(x.due))
              .map((x) => {
                const c = data.contracts.find((cc) => cc.id === x.contract);
                if (!c || !pkgs.includes(c.pkg)) return null;
                return (
                  <tr key={x.id}>
                    <td className="px-2 py-2 font-mono text-xs">{x.due}</td>
                    <td className="px-2 py-2">
                      {w.milestone}: {x.name}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-mute">{c.pkg}</td>
                    <td className="px-2 py-2 font-mono text-xs">{tug(x.amount, en)}</td>
                  </tr>
                );
              })}
          </Table>
        </Panel>
      </div>

      {/* a feature picked on the map: what it is, and where its record lives */}
      <Drawer open={!!picked} onClose={() => setPicked(null)} title={picked?.id ?? ''}>
        {picked && <PickedSummary pick={picked} />}
        {picked && (
          <Link href={pickedHref} className="mt-5 inline-flex text-sm text-accent-hi hover:underline">
            {w.open} →
          </Link>
        )}
      </Drawer>
    </div>
  );
}

function PickedSummary({ pick }: { pick: Pick }) {
  const t = useText();
  const en = useEn();
  const { data } = useStore();
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-line/60 py-1.5 text-sm">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
  if (pick.kind === 'package') {
    const p = data.packages.find((x) => x.id === pick.id)!;
    const v = packageProgress(data, p.id);
    return (
      <dl>
        {row(t.common.package, p.name)}
        {row(t.common.status, <Pill tone={toneOf(p.status)}>{t.pkgStatus[p.status]}</Pill>)}
        {row('%', `${Math.round(v.approved)}% / ${Math.round(v.planned)}%`)}
        {row('₮', tug(p.budget, en))}
        {p.twin && row(t.common.inTwin, <Link href={p.twin} className="text-accent-hi hover:underline">→</Link>)}
      </dl>
    );
  }
  if (pick.kind === 'parcel') {
    const p = data.parcels.find((x) => x.id === pick.id)!;
    return <dl>{row(t.common.status, <Pill tone={toneOf(p.status)}>{t.parcelStatus[p.status]}</Pill>)}{row(t.common.due, p.target)}{p.issues && row(t.common.comment, p.issues)}</dl>;
  }
  if (pick.kind === 'asset') {
    const a = data.assets.find((x) => x.id === pick.id)!;
    return <dl>{row(t.assetKind[a.kind], a.name)}{row(t.common.status, <Pill tone={toneOf(a.status)}>{t.assetStatus[a.status]}</Pill>)}{row('%', `${a.actual ?? '—'} / ${a.planned}`)}</dl>;
  }
  if (pick.kind === 'sensor') {
    const s = SENSORS.find((x) => x.id === pick.id);
    return <dl>{row('ID', `${pick.id} (SIM)`)}{s && row(s.kind, `${reading(s, Date.now() / 1000).toFixed(1)} ${s.unit}`)}</dl>;
  }
  const d = pick.kind === 'defect' ? data.defects.find((x) => x.id === pick.id) : data.safety.find((x) => x.id === pick.id);
  return d ? <dl>{row(t.common.status, <Pill tone={toneOf(d.state)}>{t.issueState[d.state]}</Pill>)}{row(t.common.due, d.due)}{row('', d.title)}</dl> : null;
}
