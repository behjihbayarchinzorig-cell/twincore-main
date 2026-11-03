'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { activityProgress, cashflow, days, isOverdue, latestBaseline, money, packageProgress, pct, plannedAt, progressCurve, today, tug } from '@/lib/construction/calc';
import { INSTRUCTIONS, type Instruction } from '@/lib/construction/extra/supervision';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { Data, PkgStatus } from '@/lib/construction/types';
import { LineChart } from '../Charts';
import { Bar, Kpi, Loading, PageHead, Panel, Pill, Select, Table, toneOf } from '../Kit';
import { useExtra } from '../extra';
import { useStore } from '../Store';

// Багцын гүйцэтгэл: each package's approved physical progress against where the approved baseline says it should be
// today, how far behind that is in points and in days, how its finish has moved, and whether the money paid runs
// ahead of the work. The packages furthest behind are pulled out on top, with what's holding them.
//
//  • Variance (points) = approved − planned today (calc.packageProgress).
//  • Variance (days) = how many days ago the baseline expected today's approved progress: the date when the planned
//    curve reached the approved figure, counted back from today (positive = behind, negative = ahead).
//  • Finish shift = last current finish − last baseline finish of the package's activities.
//  • Financial progress = paid ÷ contract value; it's compared with approved physical progress. Shown only to roles
//    with 'finance.view'; a package with no contract has none (—), not zero.

type Row = {
  id: string;
  name: string;
  contractor: string | null;
  status: PkgStatus;
  planned: number;
  approved: number;
  reported: number;
  pts: number;
  lagDays: number | null;
  shift: number | null;
  fin: number | null;
  overdue: number;
};
type Key = 'id' | 'planned' | 'approved' | 'pts' | 'lagDays' | 'shift' | 'fin';

const W = {
  mn: {
    lead: 'Багц бүрийн төлөвлөсөн ба батлагдсан гүйцэтгэл, оноо болон хоногоор илэрхийлсэн хоцрогдол, санхүүжилт ба биет гүйцэтгэлийн харьцаа.',
    avgPlanned: 'Төлөвлөсөн (жигнэсэн)',
    avgApproved: 'Батлагдсан (жигнэсэн)',
    behind: 'Хоцорч буй багц',
    behindSub: '5-аас дээш оноогоор',
    worstDays: 'Хамгийн их хоцрогдол',
    overdue: 'Хугацаа хэтэрсэн ажил',
    spotlight: 'Хамгийн их хоцорч буй багцууд',
    noneBehind: 'Төлөвлөгөөнөөс 5 оноогоор хоцорсон багц алга',
    table: 'Багцын гүйцэтгэл',
    contractor: 'Гүйцэтгэгч',
    planned: 'Төлөвлөсөн',
    approved: 'Батлагдсан',
    reported: 'Мэдээлсэн',
    pts: 'Зөрүү (оноо)',
    lagDays: 'Хоцрогдол (хоног)',
    shift: 'Дуусах огнооны шилжилт',
    fin: 'Санхүүгийн гүйцэтгэл',
    finSub: 'Төлсөн ÷ гэрээний дүн',
    notAwarded: 'Шалгаруулаагүй',
    curve: 'S-муруй',
    curveOf: 'Багц',
    plannedLine: 'Төлөвлөсөн (суурь)',
    approvedLine: 'Батлагдсан гүйцэтгэл',
    paidLine: 'Төлөгдсөн санхүүжилт (%)',
    activities: 'Ажлууд',
    days: 'хоног',
    ahead: 'урагш',
    late: 'хоцорсон',
    openNc: 'Нээлттэй үл тохирол',
    pending: 'Хянагдаагүй гүйцэтгэл',
    instr: 'Нээлттэй техникийн заавар',
    blockers: 'Саатуулж буй зүйлс',
    finAhead: 'Санхүүжилт биет гүйцэтгэлээс түрүүлж байна',
    sortHint: 'Баганын гарчиг дээр дарж эрэмбэлнэ',
    toProgress: 'Гүйцэтгэл рүү',
    toSchedule: 'Хуваарь руу',
    toSupervision: 'ТУХ руу',
    rule: 'Хоцрогдол (хоног): өнөөдрийн батлагдсан гүйцэтгэлд суурь хуваарийн дагуу хэдэн хоногийн өмнө хүрэх байсныг тооцно.',
    noFinance: 'Санхүүгийн дүн таны дүрд харагдахгүй',
  },
  en: {
    lead: 'Each package’s planned and approved progress, how far behind it is in points and in days, and how financial progress compares with physical.',
    avgPlanned: 'Planned (weighted)',
    avgApproved: 'Approved (weighted)',
    behind: 'Packages behind',
    behindSub: 'by more than 5 points',
    worstDays: 'Largest delay',
    overdue: 'Overdue activities',
    spotlight: 'Packages furthest behind',
    noneBehind: 'No package is more than 5 points behind plan',
    table: 'Package progress',
    contractor: 'Contractor',
    planned: 'Planned',
    approved: 'Approved',
    reported: 'Reported',
    pts: 'Variance (pts)',
    lagDays: 'Delay (days)',
    shift: 'Finish shift',
    fin: 'Financial progress',
    finSub: 'Paid ÷ contract value',
    notAwarded: 'Not awarded',
    curve: 'S-curve',
    curveOf: 'Package',
    plannedLine: 'Planned (baseline)',
    approvedLine: 'Approved progress',
    paidLine: 'Paid (%)',
    activities: 'Activities',
    days: 'days',
    ahead: 'ahead',
    late: 'behind',
    openNc: 'Open nonconformities',
    pending: 'Progress awaiting review',
    instr: 'Open site instructions',
    blockers: 'What’s holding it',
    finAhead: 'Payments run ahead of physical progress',
    sortHint: 'Tap a column heading to sort',
    toProgress: 'To progress',
    toSchedule: 'To the schedule',
    toSupervision: 'To supervision',
    rule: 'Delay (days): how many days earlier the baseline expected the progress approved today.',
    noFinance: 'Financial figures are not shown to your role',
  },
};

// the date when the package's planned curve reached `target` %, by halving the interval between its first start and last finish
function plannedDateFor(d: Data, pkg: string, target: number) {
  const acts = d.activities.filter((a) => a.pkg === pkg);
  const bl = latestBaseline(d);
  if (!acts.length) return null;
  const span = acts.flatMap((a) => [bl?.dates[a.id]?.start ?? a.start, bl?.dates[a.id]?.finish ?? a.finish]).sort();
  const t0 = Date.parse(span[0]);
  const t1 = Date.parse(span[span.length - 1]);
  const at = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const W_ = acts.reduce((s, a) => s + a.weight, 0) || 1;
  const planned = (on: string) => acts.reduce((s, a) => s + a.weight * plannedAt(a, bl, on), 0) / W_;
  if (target <= 0) return at(t0);
  if (target >= planned(at(t1))) return at(t1);
  let lo = t0;
  let hi = t1;
  for (let i = 0; i < 30 && hi - lo > 86400000; i++) {
    const mid = (lo + hi) / 2;
    if (planned(at(mid)) < target) lo = mid;
    else hi = mid;
  }
  return at(hi);
}

export default function PackageProgress() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, ready, can } = useStore();
  const [instructions, , r1] = useExtra<Instruction[]>('supervision.instructions', INSTRUCTIONS);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: 'pts', dir: 1 });
  const [status, setStatus] = useState<'all' | PkgStatus>('all');
  const [pick, setPick] = useState<string | null>(null);
  const now = today();
  const fin = can('finance.view');

  const rows: Row[] = useMemo(
    () =>
      data.packages.map((p) => {
        const v = packageProgress(data, p.id, now);
        const acts = data.activities.filter((a) => a.pkg === p.id);
        const bl = latestBaseline(data);
        const reached = plannedDateFor(data, p.id, v.approved);
        // only meaningful once the work was due to start; finished work is behind by nothing
        const lagDays = v.approved >= 100 ? 0 : v.planned > 0 && reached ? days(reached, now) : null;
        const cur = acts.map((a) => a.finish).sort().pop();
        const base = acts.map((a) => bl?.dates[a.id]?.finish).filter((x): x is string => !!x).sort().pop();
        const m = money(data, [p.id]);
        return {
          id: p.id,
          name: p.name,
          contractor: p.contractor,
          status: p.status,
          planned: v.planned,
          approved: v.approved,
          reported: v.reported,
          pts: v.approved - v.planned,
          lagDays,
          shift: cur && base ? days(base, cur) : null,
          fin: m.hasContract && m.committed > 0 ? (m.paid / m.committed) * 100 : null,
          overdue: acts.filter((a) => isOverdue(data, a, now)).length,
        };
      }),
    [data, now],
  );

  if (!ready || !r1) return <Loading />;

  const shown = rows
    .filter((r) => status === 'all' || r.status === status)
    .sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      // missing values always sink to the bottom
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)) * sort.dir;
    });
  const behind = rows.filter((r) => r.pts < -5).sort((a, b) => a.pts - b.pts);
  const budgetW = data.packages.reduce((s, p) => s + p.budget, 0) || 1;
  const wavg = (k: 'planned' | 'approved') => rows.reduce((s, r) => s + (data.packages.find((p) => p.id === r.id)!.budget * r[k]) / budgetW, 0);
  const worst = rows.reduce<Row | null>((m, r) => (r.lagDays != null && r.lagDays > (m?.lagDays ?? 0) ? r : m), null);
  const sel = pick ?? behind[0]?.id ?? rows[0]?.id;
  const orgName = (id: string | null) => (id ? (data.orgs.find((o) => o.id === id)?.name ?? id) : w.notAwarded);

  const head = (k: Key, label: string) => (
    <button
      type="button"
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : 1 }))}
      className={`inline-flex min-h-10 cursor-pointer items-center gap-1 text-left hover:text-fg ${sort.key === k ? 'text-fg' : ''}`}
      aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
    >
      {label}
      <span className="text-[10px]">{sort.key === k ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</span>
    </button>
  );
  const signed = (v: number | null, digits = 0) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(digits)}`);

  return (
    <div className="space-y-6">
      <PageHead title={t.section.pkgProgress} lead={w.lead} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={w.avgPlanned} value={pct(wavg('planned'))} />
        <Kpi label={w.avgApproved} value={pct(wavg('approved'))} tone={wavg('approved') < wavg('planned') - 5 ? 'warn' : 'good'} href="/construction/progress" />
        <Kpi label={w.behind} value={`${behind.length} / ${rows.length}`} sub={w.behindSub} tone={behind.length ? 'warn' : 'good'} />
        <Kpi label={w.worstDays} value={worst ? `${worst.lagDays}` : '—'} sub={worst ? `${worst.id} · ${w.days}` : undefined} tone={worst && (worst.lagDays ?? 0) > 30 ? 'bad' : 'neutral'} />
        <Kpi label={w.overdue} value={rows.reduce((s, r) => s + r.overdue, 0)} tone={rows.some((r) => r.overdue) ? 'bad' : 'good'} href="/construction/schedule" />
      </div>

      {/* spotlight: the packages most behind, with what is holding each */}
      <Panel title={w.spotlight}>
        {behind.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {behind.slice(0, 3).map((r) => {
              const openNc = data.defects.filter((x) => x.pkg === r.id && x.state !== 'resolved').length;
              const actIds = data.activities.filter((a) => a.pkg === r.id).map((a) => a.id);
              const pending = data.progress.filter((x) => actIds.includes(x.activity) && x.state === 'submitted').length;
              const instr = instructions.filter((x) => x.pkg === r.id && x.state === 'open').length;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setPick(r.id)} className={`block w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors hover:border-accent/60 ${sel === r.id ? 'border-accent/60 bg-accent/[0.05]' : 'border-line bg-surface/30'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm">
                        <span className="font-mono text-xs text-mute">{r.id}</span> {r.name}
                      </p>
                      <Pill tone="bad">{signed(r.pts)}</Pill>
                    </div>
                    <div className="mt-2">
                      <Bar value={r.approved} planned={r.planned} tone="warn" label={r.id} />
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] text-mute tabular-nums">
                      {pct(r.approved)} / {pct(r.planned)}
                      {r.lagDays != null && ` · ${r.lagDays} ${w.days} ${w.late}`}
                    </p>
                    <p className="mt-2 text-[11px] text-mute">{w.blockers}</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {r.overdue > 0 && <li className="text-red-700">• {w.overdue}: {r.overdue}</li>}
                      {openNc > 0 && <li className="text-amber-700">• {w.openNc}: {openNc}</li>}
                      {instr > 0 && <li className="text-amber-700">• {w.instr}: {instr}</li>}
                      {pending > 0 && <li className="text-accent-hi">• {w.pending}: {pending}</li>}
                      {fin && r.fin != null && r.fin > r.approved + 10 && <li className="text-amber-700">• {w.finAhead}</li>}
                      {!r.overdue && !openNc && !instr && !pending && <li className="text-mute">—</li>}
                    </ul>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-mute">{w.noneBehind}</p>
        )}
      </Panel>

      <Panel
        title={w.table}
        action={<Select label={t.filter.status} value={status} onChange={setStatus} options={[['all', t.filter.all], ...(['planned', 'active', 'done', 'suspended'] as PkgStatus[]).map((s) => [s, t.pkgStatus[s]] as [PkgStatus, string])]} />}
      >
        <Table head={[head('id', t.common.package), w.contractor, head('planned', w.planned), head('approved', w.approved), head('pts', w.pts), head('lagDays', w.lagDays), head('shift', w.shift), head('fin', w.fin), t.common.status]} empty={!shown.length}>
          {shown.map((r) => (
            <tr key={r.id} className={`cursor-pointer align-top hover:bg-surface/60 ${sel === r.id ? 'bg-accent/[0.05]' : ''}`} onClick={() => setPick(r.id)}>
              <td className="px-2 py-2">
                <button type="button" className="min-h-10 cursor-pointer text-left underline-offset-2 hover:underline" onClick={() => setPick(r.id)}>
                  <span className="font-mono text-xs text-mute">{r.id}</span> {r.name}
                </button>
              </td>
              <td className="px-2 py-2 text-xs">{orgName(r.contractor)}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums text-mute">{pct(r.planned)}</td>
              <td className="w-36 px-2 py-2">
                <div className="mb-1 font-mono text-xs tabular-nums">
                  {pct(r.approved)}
                  {r.reported > r.approved + 0.5 && <span className="text-mute"> ({w.reported} {pct(r.reported)})</span>}
                </div>
                <Bar value={r.approved} planned={r.planned} tone={r.pts < -5 ? 'warn' : r.approved >= 100 ? 'good' : 'info'} label={r.id} />
              </td>
              <td className={`px-2 py-2 font-mono text-xs tabular-nums ${r.pts < -5 ? 'text-red-700' : r.pts < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{signed(r.pts, 1)}</td>
              <td className={`px-2 py-2 font-mono text-xs tabular-nums ${(r.lagDays ?? 0) > 30 ? 'text-red-700' : (r.lagDays ?? 0) > 0 ? 'text-amber-700' : 'text-mute'}`}>{r.lagDays == null ? '—' : signed(r.lagDays)}</td>
              <td className={`px-2 py-2 font-mono text-xs tabular-nums ${(r.shift ?? 0) > 0 ? 'text-amber-700' : 'text-mute'}`}>{r.shift == null ? '—' : `${signed(r.shift)} ${w.days}`}</td>
              <td className="w-32 px-2 py-2">
                {!fin ? (
                  <span className="text-xs">🔒</span>
                ) : r.fin == null ? (
                  <span className="text-xs text-mute">—</span>
                ) : (
                  <>
                    <div className={`mb-1 font-mono text-xs tabular-nums ${r.fin > r.approved + 10 ? 'text-amber-700' : ''}`}>{pct(r.fin)}</div>
                    <Bar value={r.fin} planned={r.approved} tone={r.fin > r.approved + 10 ? 'warn' : 'neutral'} label={`${r.id} ${w.fin}`} />
                  </>
                )}
              </td>
              <td className="px-2 py-2">
                <span className="flex flex-wrap gap-1">
                  <Pill tone={toneOf(r.status)}>{t.pkgStatus[r.status]}</Pill>
                  {r.overdue > 0 && <Pill tone="bad">{t.common.overdue}</Pill>}
                </span>
              </td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-[11px] text-mute">
          {w.sortHint}. ▏ = {w.planned}. {fin ? `${w.fin}: ${w.finSub}; ▏ = ${w.approved}.` : `🔒 ${w.noFinance}`}
        </p>
        <p className="mt-1 text-[11px] text-mute">{w.rule}</p>
      </Panel>

      {sel && <PackageCurve id={sel} onPick={setPick} words={w} fin={fin} en={en} />}
    </div>
  );
}

// one package's S-curve (planned vs approved, and paid share if the role may see money) and its activities
function PackageCurve({ id, onPick, words: w, fin, en }: { id: string; onPick: (id: string) => void; words: (typeof W)['mn']; fin: boolean; en: boolean }) {
  const t = useText();
  const { data } = useStore();
  const now = today();
  const curve = useMemo(() => progressCurve(data, [id]), [data, id]);
  const flow = useMemo(() => cashflow(data, [id]), [data, id]);
  const total = flow.length ? flow[flow.length - 1].planned : 0;
  const bl = latestBaseline(data);
  const acts = data.activities.filter((a) => a.pkg === id);
  const m = money(data, [id]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Panel
        title={`${w.curve} · ${id}`}
        action={<Select label={w.curveOf} value={id} onChange={onPick} options={data.packages.map((p) => [p.id, `${p.id} · ${p.name}`] as [string, string])} />}
      >
        {curve.length ? (
          <LineChart
            labels={curve.map((c) => c.month.slice(2))}
            unit="%"
            max={100}
            series={[
              { name: w.plannedLine, color: '#8ea6cc', values: curve.map((c) => c.planned), dashed: true },
              { name: w.approvedLine, color: '#60a5fa', values: curve.map((c) => c.approved) },
              ...(fin && total > 0 ? [{ name: w.paidLine, color: '#a78bfa', values: flow.map((f) => (f.paid == null ? null : Math.min(100, (f.paid / total) * 100))) }] : []),
            ]}
          />
        ) : (
          <p className="py-6 text-center text-sm text-mute">{t.common.none}</p>
        )}
        {fin && (
          <p className="mt-2 text-[11px] text-mute">
            {w.paidLine}: {tug(m.hasContract ? m.paid : null, en)} / {tug(total, en)}
          </p>
        )}
      </Panel>
      <Panel
        title={w.activities}
        action={
          <span className="flex gap-3 text-xs">
            <Link href="/construction/progress" className="text-accent-hi hover:underline">
              {w.toProgress} →
            </Link>
            <Link href="/construction/schedule" className="text-accent-hi hover:underline">
              {w.toSchedule} →
            </Link>
          </span>
        }
      >
        <ul className="space-y-3">
          {acts.map((a) => {
            const p = activityProgress(data, a.id).approved;
            const plan = plannedAt(a, bl, now);
            const late = isOverdue(data, a, now);
            return (
              <li key={a.id} className="text-xs">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="font-mono text-mute">{a.id}</span> {a.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {late && <Pill tone="bad">{t.common.overdue}</Pill>}
                    <span className="font-mono tabular-nums">
                      {pct(p)} <span className="text-mute">/ {pct(plan)}</span>
                    </span>
                  </span>
                </div>
                <Bar value={p} planned={plan} tone={late ? 'bad' : p >= 100 ? 'good' : plan - p > 5 ? 'warn' : 'info'} label={a.name} />
                <p className="mt-0.5 font-mono text-[10px] text-mute">
                  {a.start} → {a.finish}
                </p>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
