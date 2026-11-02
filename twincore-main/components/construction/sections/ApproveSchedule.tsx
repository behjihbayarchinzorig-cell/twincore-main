'use client';

import { useMemo, useState } from 'react';
import { activityProgress, days, latestBaseline, today } from '@/lib/construction/calc';
import { REVISIONS, type Revision, type RevisionChange, type RevisionState } from '@/lib/construction/extra/approveSchedule';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { Activity, Data, Id } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { useExtra } from '../extra';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, toneOf, type Tone } from '../Kit';
import { nextId, useStore } from '../Store';

// Хуваарь батлах: schedule revisions a contractor or engineer has submitted, each compared activity by activity with
// the latest approved baseline — day shifts, the package finish, the activities that drive it (critical chain) and
// what stays overdue. Approving adds a NEW baseline (the previous one with this revision's dates) and moves the
// current dates; an approved baseline is never overwritten. Returning needs a comment so the submitter knows why.

const W = {
  mn: {
    lead: 'Гүйцэтгэгчийн ирүүлсэн хуваарийн өөрчлөлтийг батлагдсан суурь хуваарьтай ажил бүрээр харьцуулж, багцын дуусах хугацаа, эгзэгтэй ажил, хоцролтод үзүүлэх нөлөөг үнэлээд батлах эсвэл буцаах.',
    propose: 'Хуваарийн өөрчлөлт илгээх',
    waiting: 'Батлах хүлээгдэж буй',
    approvedMonth: 'Энэ сард батлагдсан',
    avgSlip: 'Дундаж хоцрол (хүлээгдэж буй)',
    avgSlipSub: 'багцын дуусах хугацаа, суурьтай харьцуулахад',
    baselines: 'Батлагдсан суурь хуваарь',
    list: 'Хуваарийн өөрчлөлтийн хүсэлт',
    state: { submitted: 'Батлах хүлээгдэж буй', approved: 'Батлагдсан', returned: 'Буцаагдсан' } as Record<RevisionState, string>,
    id: 'Дугаар',
    title: 'Гарчиг',
    by: 'Ирүүлсэн',
    submitted: 'Ирүүлсэн огноо',
    changed: 'Өөрчлөгдөх ажил',
    finishShift: 'Багц дуусах',
    compare: 'Суурь хуваарьтай харьцуулалт',
    pick: 'Харьцуулах хүсэлтээ жагсаалтаас сонгоно уу.',
    reason: 'Үндэслэл',
    activity: 'Ажил',
    baseline: 'Суурь',
    current: 'Одоогийн',
    proposed: 'Санал болгосон',
    dStart: 'Δ эхлэх',
    dFinish: 'Δ дуусах',
    vsCurrent: 'Одоогийнхоос',
    pkgFinish: 'Багц дуусах огноо',
    critical: 'Эгзэгтэй ажил',
    criticalSub: 'хугацаа нь хойшилсон',
    criticalTag: 'эгзэгтэй',
    lateAfter: 'Хугацаа хэтэрсэн хэвээр',
    lateAfterSub: 'батлагдсаны дараа ч',
    fixed: 'хугацаа хэтрэлтийг арилгана',
    late: 'хэтэрсэн',
    logic: 'өмнөх ажлаас өмнө дуусна',
    effects: 'Нөлөө',
    noEffects: 'Онцлох нөлөө алга.',
    effLogic: 'дараалал зөрчигдөж байна: өмнө дуусах ёстой ажлаас өмнө дуусахаар төлөвлөсөн',
    effCritical: 'эгзэгтэй замд байгаа тул багцын дуусах огноог шууд хойшлуулна',
    effLate: 'санал болгосон дуусах огноо өнгөрсөн, гүйцэтгэл 100% хүрээгүй',
    effFixed: 'одоо хугацаа хэтэрсэн, батлагдвал шинэ хугацаанд багтана',
    effMilestone: 'гэрээний төлбөрийн үе шат',
    effMilestoneTail: 'багцын шинэ дуусах огнооноос өмнө — гэрээний нэмэлт өөрчлөлт шаардлагатай эсэхийг шалгах',
    decision: 'Шийдвэр',
    approve: 'Батлах — шинэ суурь хуваарь үүсгэнэ',
    returnIt: 'Буцаах',
    commentRequired: 'Буцаах бол тайлбар заавал бичнэ',
    approveNote: 'Батлахад өмнөх суурь хуваарь хэвээр хадгалагдаж, энэ хүсэлтийн огноотой шинэ хувилбар нэмэгдэнэ; ажлын одоогийн огноо мөн шинэчлэгдэнэ.',
    becameBaseline: 'Суурь хуваарь болсон',
    resubmit: 'Засаж дахин илгээх',
    legendBase: 'Суурь хуваарь',
    legendProp: 'Санал болгосон',
    legendLater: 'Хойшилсон',
    newTitle: 'Хуваарийн өөрчлөлт илгээх',
    editTitle: 'Засаж дахин илгээх',
    formNote: 'Огноог өөрчилсөн ажлууд л хүсэлтэд орно (суурь хуваарьтай харьцуулна).',
    noChange: 'Дор хаяж нэг ажлын огноог суурь хуваариас өөрчилнө үү',
    send: 'Илгээх',
    start: 'Эхлэх',
    finish: 'Дуусах',
    approvedBy: 'Баталсан',
    blLabel: 'Үндсэн хуваарь',
    todayLine: 'Өнөөдөр',
    noBaseline: 'Суурь хуваарь батлагдаагүй',
  },
  en: {
    lead: 'Schedule revisions submitted by contractors, compared activity by activity with the approved baseline — effect on the package finish, the critical activities and overdue work — then approved or returned.',
    propose: 'Submit a schedule revision',
    waiting: 'Waiting for approval',
    approvedMonth: 'Approved this month',
    avgSlip: 'Average slip (waiting)',
    avgSlipSub: 'package finish against the baseline',
    baselines: 'Approved baselines',
    list: 'Schedule revision requests',
    state: { submitted: 'Waiting for approval', approved: 'Approved', returned: 'Returned' } as Record<RevisionState, string>,
    id: 'No.',
    title: 'Title',
    by: 'Submitted by',
    submitted: 'Submitted',
    changed: 'Activities changed',
    finishShift: 'Package finish',
    compare: 'Comparison with the baseline',
    pick: 'Pick a request from the list to compare it.',
    reason: 'Reason',
    activity: 'Activity',
    baseline: 'Baseline',
    current: 'Current',
    proposed: 'Proposed',
    dStart: 'Δ start',
    dFinish: 'Δ finish',
    vsCurrent: 'vs current',
    pkgFinish: 'Package finish',
    critical: 'Critical activities',
    criticalSub: 'pushed later',
    criticalTag: 'critical',
    lateAfter: 'Still overdue',
    lateAfterSub: 'even once approved',
    fixed: 'clears the overdue flag',
    late: 'overdue',
    logic: 'finishes before its predecessor',
    effects: 'Effects',
    noEffects: 'No notable effects.',
    effLogic: 'logic broken: planned to finish before an activity that must finish first',
    effCritical: 'is on the critical chain, so it moves the package finish directly',
    effLate: 'proposed finish has passed and progress is below 100%',
    effFixed: 'is overdue now and would be back within its dates once approved',
    effMilestone: 'contract payment milestone',
    effMilestoneTail: 'falls before the new package finish — check whether the contract needs amending',
    decision: 'Decision',
    approve: 'Approve — creates a new baseline',
    returnIt: 'Return',
    commentRequired: 'A comment is required to return a request',
    approveNote: 'Approving keeps the previous baseline and adds a new version with this request’s dates; the activities’ current dates are updated too.',
    becameBaseline: 'Became baseline',
    resubmit: 'Edit and resubmit',
    legendBase: 'Baseline',
    legendProp: 'Proposed',
    legendLater: 'Later',
    newTitle: 'Submit a schedule revision',
    editTitle: 'Edit and resubmit',
    formNote: 'Only activities whose dates differ from the baseline are included in the request.',
    noChange: 'Change at least one activity’s dates from the baseline',
    send: 'Submit',
    start: 'Start',
    finish: 'Finish',
    approvedBy: 'Approved by',
    blLabel: 'Baseline',
    todayLine: 'Today',
    noBaseline: 'No approved baseline',
  },
};

type Words = typeof W.mn;
const sd = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const shiftTone = (n: number) => (n > 0 ? 'text-sky-300' : n < 0 ? 'text-emerald-300' : 'text-mute');
const maxDate = (xs: string[]) => xs.reduce((m, d) => (d > m ? d : m), '0000-00-00');

// the activities that drive the package finish: from the latest-finishing activity back through whichever
// predecessor finishes last (dependencies in the sample are within a package)
function drivingChain(acts: { id: Id; deps: Id[]; finish: string }[]) {
  const by = new Map(acts.map((a) => [a.id, a]));
  const chain = new Set<Id>();
  let cur = acts.reduce<(typeof acts)[number] | null>((m, a) => (!m || a.finish > m.finish ? a : m), null);
  while (cur && !chain.has(cur.id)) {
    chain.add(cur.id);
    const preds = cur.deps.map((id) => by.get(id)).filter((x): x is (typeof acts)[number] => !!x);
    cur = preds.reduce<(typeof acts)[number] | null>((m, a) => (!m || a.finish > m.finish ? a : m), null);
  }
  return chain;
}

// everything the comparison needs for one revision, against the latest approved baseline
function compare(data: Data, rev: Revision, now: string) {
  const bl = latestBaseline(data);
  const acts = data.activities.filter((a) => a.pkg === rev.pkg);
  const rows = acts.map((a) => {
    const base = bl?.dates[a.id] ?? { start: a.start, finish: a.finish };
    const ch = rev.changes.find((c) => c.activity === a.id);
    const prop = ch ? { start: ch.start, finish: ch.finish } : { start: a.start, finish: a.finish };
    const done = activityProgress(data, a.id).approved >= 100;
    return {
      a,
      base,
      prop,
      changed: !!ch,
      dStart: days(base.start, prop.start),
      dFinish: days(base.finish, prop.finish),
      vsCurrent: days(a.finish, prop.finish),
      lateNow: !done && a.finish < now,
      lateAfter: !done && prop.finish < now,
    };
  });
  const propActs = rows.map((r) => ({ id: r.a.id, deps: r.a.deps, finish: r.prop.finish }));
  const chain = drivingChain(propActs);
  const propOf = new Map(rows.map((r) => [r.a.id, r.prop]));
  // a successor planned to finish before one of its predecessors
  const logic = rows.filter((r) => r.a.deps.some((d) => (propOf.get(d)?.finish ?? '') > r.prop.finish)).map((r) => r.a.id);
  const finish = { base: maxDate(rows.map((r) => r.base.finish)), current: maxDate(acts.map((a) => a.finish)), prop: maxDate(rows.map((r) => r.prop.finish)) };
  const contract = data.contracts.find((c) => c.pkg === rev.pkg);
  const lastMilestone = contract ? data.milestones.filter((m) => m.contract === contract.id).sort((x, y) => y.due.localeCompare(x.due))[0] : undefined;
  return {
    bl,
    rows,
    chain,
    logic,
    finish,
    slip: rows.length ? days(finish.base, finish.prop) : 0,
    criticalLater: rows.filter((r) => chain.has(r.a.id) && r.changed && r.dFinish > 0),
    lateAfter: rows.filter((r) => r.lateAfter),
    fixed: rows.filter((r) => r.lateNow && !r.lateAfter),
    milestone: lastMilestone && lastMilestone.due < finish.prop && finish.prop > finish.base ? lastMilestone : undefined,
  };
}

const revTone = (s: RevisionState): Tone => (s === 'returned' ? 'bad' : toneOf(s));

export default function ApproveSchedule() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, can, change, log, user, role } = useStore();
  const [revs, setRevs] = useExtra<Revision[]>('approveSchedule.revisions', REVISIONS);
  const [state, setState] = useState<'all' | RevisionState>('all');
  const [pkg, setPkg] = useState('all');
  const [sel, setSel] = useState<Id | null>(null);
  const [comment, setComment] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [form, setForm] = useState<{ id: Id | null; pkg: Id; title: string; reason: string; dates: Record<Id, { start: string; finish: string }> } | null>(null);
  const [formProblems, setFormProblems] = useState<{ list: Problem[]; msg?: string }>({ list: [] });
  const now = today();
  const month = now.slice(0, 7);

  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const pkgName = (id: string) => `${id} · ${data.packages.find((p) => p.id === id)?.name ?? ''}`;
  const actName = (id: string) => data.activities.find((a) => a.id === id)?.name ?? id;

  // contractors propose revisions for their own packages (progress.submit); engineers and managers via schedule.edit
  const proposeAction = can('schedule.edit') ? 'schedule.edit' : can('progress.submit') ? 'progress.submit' : null;
  const myOrg = data.users.find((u) => u.id === user)?.org;
  const myPkgs = data.packages.filter((p) => role !== 'contractor' || p.contractor === myOrg);

  const cmp = useMemo(() => new Map(revs.map((r) => [r.id, compare(data, r, now)])), [revs, data, now]);
  const waiting = revs.filter((r) => r.state === 'submitted');
  const approvedMonth = revs.filter((r) => r.state === 'approved' && r.history.some((h) => h.action === 'approved' && h.at.startsWith(month))).length;
  const avgSlip = waiting.length ? Math.round(waiting.reduce((s, r) => s + (cmp.get(r.id)?.slip ?? 0), 0) / waiting.length) : null;
  const bl = latestBaseline(data);

  const shown = revs
    .filter((r) => (state === 'all' || r.state === state) && (pkg === 'all' || r.pkg === pkg))
    .sort((a, b) => (a.state === 'submitted' ? 0 : 1) - (b.state === 'submitted' ? 0 : 1) || b.submitted.localeCompare(a.submitted));
  const rev = revs.find((r) => r.id === (sel ?? shown[0]?.id)) ?? null;
  const c = rev ? cmp.get(rev.id)! : null;

  const pickRev = (id: Id) => {
    setSel(id);
    setComment('');
    setProblems([]);
  };

  const approve = (r: Revision) => {
    const blId = nextId('BL', data.baselines.map((b) => b.id));
    const ok = change('baseline.approve', r.id, `approved → ${blId}`, (d: Data) => {
      const prev = latestBaseline(d);
      const dates = { ...(prev?.dates ?? Object.fromEntries(d.activities.map((a) => [a.id, { start: a.start, finish: a.finish }]))) };
      for (const ch of r.changes) {
        dates[ch.activity] = { start: ch.start, finish: ch.finish };
        const a = d.activities.find((x) => x.id === ch.activity);
        if (a) {
          a.start = ch.start;
          a.finish = ch.finish;
        }
      }
      d.baselines.push({ id: blId, label: `${w.blLabel} v${d.baselines.length + 1} · ${r.pkg}`, approvedAt: now, approvedBy: user, dates });
    });
    if (!ok) return setProblems([{ field: 'role', code: 'forbidden' }]);
    setRevs((xs) => xs.map((x) => (x.id === r.id ? { ...x, state: 'approved', baseline: blId, history: [...x.history, { at: now, by: user, action: 'approved', comment: comment.trim() || undefined }] } : x)));
    setComment('');
    setProblems([]);
  };
  const giveBack = (r: Revision) => {
    if (!comment.trim()) return setProblems([{ field: 'comment', code: 'required' }]);
    if (!log('baseline.approve', r.id, 'returned')) return setProblems([{ field: 'role', code: 'forbidden' }]);
    setRevs((xs) => xs.map((x) => (x.id === r.id ? { ...x, state: 'returned', history: [...x.history, { at: now, by: user, action: 'returned', comment: comment.trim() }] } : x)));
    setComment('');
    setProblems([]);
  };

  // the form starts from the current dates (or the returned request's), one row per activity of the package
  const openForm = (r?: Revision) => {
    const p = r?.pkg ?? (pkg !== 'all' && myPkgs.some((x) => x.id === pkg) ? pkg : myPkgs[0]?.id);
    if (!p) return;
    setFormProblems({ list: [] });
    setForm({ id: r?.id ?? null, pkg: p, title: r?.title ?? '', reason: r?.reason ?? '', dates: datesFor(data, p, r?.changes) });
  };
  const send = () => {
    if (!form || !proposeAction) return;
    const list: Problem[] = [];
    if (!form.title.trim() || !form.reason.trim()) list.push({ field: 'text', code: 'required' });
    const acts = data.activities.filter((a) => a.pkg === form.pkg);
    if (acts.some((a) => form.dates[a.id].finish < form.dates[a.id].start)) list.push({ field: 'dates', code: 'dateOrder' });
    const changes: RevisionChange[] = acts
      .filter((a) => {
        const b = bl?.dates[a.id] ?? { start: a.start, finish: a.finish };
        const f = form.dates[a.id];
        return f.start !== b.start || f.finish !== b.finish;
      })
      .map((a) => ({ activity: a.id, ...form.dates[a.id] }));
    const msg = changes.length ? undefined : w.noChange;
    setFormProblems({ list, msg });
    if (list.length || msg) return;
    const id = form.id ?? nextId('REV', revs.map((r) => r.id));
    if (!log(proposeAction, id, form.id ? 'resubmitted' : 'submitted')) return setFormProblems({ list: [{ field: 'role', code: 'forbidden' }] });
    setRevs((xs) =>
      form.id
        ? xs.map((x) => (x.id === form.id ? { ...x, title: form.title.trim(), reason: form.reason.trim(), changes, state: 'submitted', submitted: now, history: [...x.history, { at: now, by: user, action: 'resubmitted' }] } : x))
        : [...xs, { id, pkg: form.pkg, title: form.title.trim(), reason: form.reason.trim(), by: user, submitted: now, changes, state: 'submitted', history: [{ at: now, by: user, action: 'submitted' }] }],
    );
    setSel(id);
    setForm(null);
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.approveSchedule}
        lead={w.lead}
        action={
          proposeAction && myPkgs.length ? (
            <Btn kind="primary" onClick={() => openForm()}>
              + {w.propose}
            </Btn>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={w.waiting} value={waiting.length} tone={waiting.length ? 'info' : 'good'} />
        <Kpi label={w.approvedMonth} value={approvedMonth} />
        <Kpi label={w.avgSlip} value={avgSlip == null ? '—' : `${sd(avgSlip)} ${t.common.days}`} sub={w.avgSlipSub} tone={avgSlip && avgSlip > 30 ? 'bad' : avgSlip && avgSlip > 0 ? 'warn' : 'neutral'} />
        <Kpi label={w.baselines} value={data.baselines.length} sub={bl ? `${bl.label} · ${bl.approvedAt}` : w.noBaseline} />
      </div>

      <Panel
        title={w.list}
        action={
          <div className="flex flex-wrap items-end gap-3">
            <Select label={t.filter.status} value={state} onChange={setState} options={[['all', t.filter.all], ...(['submitted', 'approved', 'returned'] as RevisionState[]).map((s): [RevisionState, string] => [s, w.state[s]])]} />
            <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, p.id])]} />
          </div>
        }
      >
        <Table head={[w.submitted, w.id, w.title, t.common.package, w.by, w.changed, w.finishShift, t.common.status]} empty={!shown.length}>
          {shown.map((r) => {
            const k = cmp.get(r.id)!;
            const active = rev?.id === r.id;
            return (
              <tr key={r.id} className={`cursor-pointer hover:bg-surface/60 ${active ? 'bg-accent/[0.06]' : ''}`} onClick={() => pickRev(r.id)}>
                <td className="px-2 py-2.5 font-mono text-xs text-mute">{r.submitted}</td>
                <td className="px-2 py-2.5 font-mono text-xs">
                  <button type="button" className="cursor-pointer underline-offset-2 hover:underline" aria-pressed={active} onClick={() => pickRev(r.id)}>
                    {r.id}
                  </button>
                </td>
                <td className="px-2 py-2.5">{r.title}</td>
                <td className="px-2 py-2.5 font-mono text-xs">{r.pkg}</td>
                <td className="px-2 py-2.5 text-xs">{name(r.by)}</td>
                <td className="px-2 py-2.5 text-center font-mono text-xs">{r.changes.length}</td>
                <td className={`px-2 py-2.5 font-mono text-xs tabular-nums ${r.state === 'submitted' ? shiftTone(k.slip) : 'text-mute'}`}>{r.state === 'submitted' ? `${sd(k.slip)} ${t.common.days}` : '—'}</td>
                <td className="px-2 py-2.5">
                  <Pill tone={revTone(r.state)}>{w.state[r.state]}</Pill>
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Panel title={rev ? `${w.compare} · ${rev.id}` : w.compare}>
        {!rev || !c ? (
          <p className="py-6 text-center text-sm text-mute">{w.pick}</p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{rev.title}</p>
                <Pill tone={revTone(rev.state)}>{w.state[rev.state]}</Pill>
                {rev.baseline && <Pill tone="good">{`${w.becameBaseline}: ${rev.baseline}`}</Pill>}
              </div>
              <p className="text-xs text-mute">
                {pkgName(rev.pkg)} · {name(rev.by)} · {rev.submitted} · {w.baseline}: {c.bl ? `${c.bl.label} (${c.bl.approvedAt})` : w.noBaseline}
              </p>
              <p className="rounded-lg border border-line bg-ink/40 px-3 py-2 text-sm text-fg/90">
                <span className="text-xs text-mute">{w.reason}: </span>
                {rev.reason}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Kpi label={w.pkgFinish} value={`${sd(c.slip)} ${t.common.days}`} sub={`${c.finish.base} → ${c.finish.prop}`} tone={c.slip > 30 ? 'bad' : c.slip > 0 ? 'warn' : 'good'} />
              <Kpi label={w.critical} value={c.criticalLater.length} sub={w.criticalSub} tone={c.criticalLater.length ? 'warn' : 'neutral'} />
              <Kpi label={w.lateAfter} value={c.lateAfter.length} sub={w.lateAfterSub} tone={c.lateAfter.length ? 'bad' : 'good'} />
            </div>

            <MiniGantt rows={c.rows} chain={c.chain} now={now} words={w} />

            <Table head={[w.activity, w.baseline, w.proposed, w.dStart, w.dFinish, w.vsCurrent, '']}>
              {c.rows.map((r) => (
                <tr key={r.a.id} className={`align-top ${r.changed ? '' : 'text-fg/60'}`}>
                  <td className="px-2 py-2">
                    <span className="font-mono text-[10px] text-mute">{r.a.id}</span> {r.a.name}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] whitespace-nowrap text-mute">
                    {r.base.start}
                    <br />
                    {r.base.finish}
                  </td>
                  <td className={`px-2 py-2 font-mono text-[11px] whitespace-nowrap ${r.changed ? 'text-fg' : 'text-mute'}`}>
                    {r.prop.start}
                    <br />
                    {r.prop.finish}
                  </td>
                  <td className={`px-2 py-2 font-mono text-xs tabular-nums ${shiftTone(r.dStart)}`}>{sd(r.dStart)}</td>
                  <td className={`px-2 py-2 font-mono text-xs tabular-nums ${shiftTone(r.dFinish)}`}>{sd(r.dFinish)}</td>
                  <td className={`px-2 py-2 font-mono text-xs tabular-nums ${shiftTone(r.vsCurrent)}`}>{r.vsCurrent ? sd(r.vsCurrent) : '0'}</td>
                  <td className="px-2 py-2">
                    <span className="flex flex-wrap gap-1">
                      {c.chain.has(r.a.id) && <Pill tone="info">{w.criticalTag}</Pill>}
                      {r.lateAfter && <Pill tone="bad">{w.late}</Pill>}
                      {r.lateNow && !r.lateAfter && <Pill tone="good">{w.fixed}</Pill>}
                      {c.logic.includes(r.a.id) && <Pill tone="warn">{w.logic}</Pill>}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
            <p className="text-[11px] text-mute">
              {en ? 'Shifts in days against the baseline (+ = later); “vs current” compares with today’s working dates.' : 'Шилжилтийг суурь хуваарьтай харьцуулсан хоногоор (+ = хойш); “Одоогийнхоос” нь одоо мөрдөж буй огноотой харьцуулна.'}
            </p>

            <div>
              <p className="mb-2 text-xs text-mute">{w.effects}</p>
              <ul className="space-y-1.5 text-sm">
                {c.logic.map((id) => (
                  <li key={`l-${id}`} className="text-sky-300">
                    ⚠ {id} {actName(id)} — {w.effLogic}
                  </li>
                ))}
                {c.criticalLater.map((r) => (
                  <li key={`c-${r.a.id}`} className="text-fg/90">
                    • {r.a.id} {r.a.name} ({sd(r.dFinish)} {t.common.days}) — {w.effCritical}
                  </li>
                ))}
                {c.lateAfter.map((r) => (
                  <li key={`a-${r.a.id}`} className="text-red-300">
                    • {r.a.id} {r.a.name} — {w.effLate}
                  </li>
                ))}
                {c.fixed.map((r) => (
                  <li key={`f-${r.a.id}`} className="text-emerald-300">
                    • {r.a.id} {r.a.name} — {w.effFixed}
                  </li>
                ))}
                {c.milestone && (
                  <li className="text-sky-300">
                    ⚠ {w.effMilestone} {c.milestone.id} “{c.milestone.name}” ({c.milestone.due}) {w.effMilestoneTail}
                  </li>
                )}
                {!c.logic.length && !c.criticalLater.length && !c.lateAfter.length && !c.fixed.length && !c.milestone && <li className="text-mute">{w.noEffects}</li>}
              </ul>
            </div>

            {rev.state === 'submitted' && (
              <div className="space-y-2 rounded-xl border border-line p-3">
                <p className="text-xs text-mute">{w.decision}</p>
                {can('baseline.approve') ? (
                  <>
                    <Field label={t.common.comment} error={problems.some((p) => p.field === 'comment') ? w.commentRequired : undefined}>
                      <textarea className={`${inputCls} h-16 py-1.5`} value={comment} onChange={(e) => setComment(e.target.value)} />
                    </Field>
                    <p className="text-[11px] text-mute">{w.approveNote}</p>
                    <div className="flex flex-wrap gap-2">
                      <Btn kind="primary" onClick={() => approve(rev)}>
                        ✓ {w.approve}
                      </Btn>
                      <Btn kind="danger" onClick={() => giveBack(rev)}>
                        ↩ {w.returnIt}
                      </Btn>
                    </div>
                    <Problems list={problems.filter((p) => p.field !== 'comment')} />
                  </>
                ) : (
                  <Forbidden />
                )}
              </div>
            )}
            {rev.state === 'returned' && proposeAction && myPkgs.some((p) => p.id === rev.pkg) && <Btn onClick={() => openForm(rev)}>✎ {w.resubmit}</Btn>}

            <div>
              <p className="mb-2 text-xs text-mute">{t.common.history}</p>
              <History items={rev.history} name={name} />
            </div>
          </div>
        )}
      </Panel>

      <Panel title={w.baselines}>
        <Table head={['ID', w.title, t.common.date, w.approvedBy]} empty={!data.baselines.length}>
          {[...data.baselines].reverse().map((b) => (
            <tr key={b.id}>
              <td className="px-2 py-2 font-mono text-xs">{b.id}</td>
              <td className="px-2 py-2">{b.label}</td>
              <td className="px-2 py-2 font-mono text-xs text-mute">{b.approvedAt}</td>
              <td className="px-2 py-2 text-xs">{name(b.approvedBy)}</td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? `${w.editTitle} · ${form.id}` : w.newTitle}>
        {form && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Field label={t.common.package}>
              <select className={`${inputCls} h-10`} value={form.pkg} disabled={!!form.id} onChange={(e) => setForm({ ...form, pkg: e.target.value, dates: datesFor(data, e.target.value) })}>
                {myPkgs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pkgName(p.id)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={w.title}>
              <input className={`${inputCls} h-10`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label={w.reason}>
              <textarea className={`${inputCls} h-20 py-1.5`} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
            <p className="text-[11px] text-mute">{w.formNote}</p>
            <div className="space-y-3">
              {data.activities
                .filter((a) => a.pkg === form.pkg)
                .map((a) => (
                  <ActivityDates key={a.id} a={a} base={bl?.dates[a.id]} value={form.dates[a.id]} onChange={(v) => setForm({ ...form, dates: { ...form.dates, [a.id]: v } })} words={w} />
                ))}
            </div>
            <Problems list={formProblems.list} />
            {formProblems.msg && <p className="rounded-lg border border-red-400/40 bg-red-400/[0.07] px-3 py-2 text-xs text-red-200">• {formProblems.msg}</p>}
            <div className="flex gap-2">
              <Btn kind="primary" type="submit">
                {w.send}
              </Btn>
              <Btn onClick={() => setForm(null)}>{t.common.cancel}</Btn>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}

function datesFor(data: Data, pkg: Id, changes?: RevisionChange[]) {
  return Object.fromEntries(
    data.activities
      .filter((a) => a.pkg === pkg)
      .map((a) => {
        const ch = changes?.find((c) => c.activity === a.id);
        return [a.id, ch ? { start: ch.start, finish: ch.finish } : { start: a.start, finish: a.finish }];
      }),
  );
}

function ActivityDates({ a, base, value, onChange, words: w }: { a: Activity; base?: { start: string; finish: string }; value: { start: string; finish: string }; onChange: (v: { start: string; finish: string }) => void; words: Words }) {
  const shift = base ? days(base.finish, value.finish) : 0;
  return (
    <fieldset className="rounded-lg border border-line p-3">
      <legend className="px-1 text-xs text-fg/90">
        <span className="font-mono text-[10px] text-mute">{a.id}</span> {a.name}
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <Field label={w.start}>
          <input type="date" className={`${inputCls} h-10`} value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} />
        </Field>
        <Field label={w.finish}>
          <input type="date" className={`${inputCls} h-10`} value={value.finish} onChange={(e) => onChange({ ...value, finish: e.target.value })} />
        </Field>
      </div>
      {base && (
        <p className="mt-1.5 text-[11px] text-mute">
          {w.baseline}: {base.start} → {base.finish} · <span className={shiftTone(shift)}>{sd(shift)}</span>
        </p>
      )}
    </fieldset>
  );
}

// baseline (thin ghost) against the proposal for the revision's package; amber where the proposal finishes later
function MiniGantt({ rows, chain, now, words: w }: { rows: { a: Activity; base: { start: string; finish: string }; prop: { start: string; finish: string }; dFinish: number; changed: boolean }[]; chain: Set<Id>; now: string; words: Words }) {
  if (!rows.length) return null;
  const ms = (d: string) => Date.parse(d + 'T00:00:00Z');
  const all = rows.flatMap((r) => [r.base.start, r.base.finish, r.prop.start, r.prop.finish]);
  const lo = ms(all.reduce((m, d) => (d < m ? d : m))) - 15 * 86400000;
  const hi = ms(all.reduce((m, d) => (d > m ? d : m))) + 15 * 86400000;
  const xp = (d: string) => ((ms(d) - lo) / (hi - lo)) * 100;
  const tx = xp(now);
  return (
    <div>
      <p className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-5 rounded-sm bg-fg/40" />
          {w.legendBase}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-sm bg-accent/70" />
          {w.legendProp}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-sm bg-sky-400/80" />
          {w.legendLater}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-sky-300" />
          {w.todayLine}
        </span>
      </p>
      <div className="-mx-1 overflow-x-auto">
        <div className="min-w-[520px] space-y-1">
          {rows.map((r) => (
            <div key={r.a.id} className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-3 text-xs" title={`${r.a.name}: ${r.base.start} → ${r.base.finish} / ${r.prop.start} → ${r.prop.finish}`}>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 font-mono text-[10px] text-mute">{r.a.id}</span>
                <span className={`truncate ${chain.has(r.a.id) ? 'text-fg' : 'text-fg/70'}`}>{r.a.name}</span>
              </span>
              <span className="relative block h-5">
                {tx >= 0 && tx <= 100 && <span className="absolute inset-y-0 w-px bg-sky-300/80" style={{ left: `${tx}%` }} />}
                <span className="absolute bottom-0 h-1 rounded-sm bg-fg/35" style={{ left: `${xp(r.base.start)}%`, width: `${Math.max(0.5, xp(r.base.finish) - xp(r.base.start))}%` }} />
                <span
                  className={`absolute top-0.5 h-3 rounded-sm ${r.dFinish > 0 ? 'bg-sky-400/70' : 'bg-accent/60'} ${chain.has(r.a.id) ? 'ring-1 ring-fg/50' : ''}`}
                  style={{ left: `${xp(r.prop.start)}%`, width: `${Math.max(0.5, xp(r.prop.finish) - xp(r.prop.start))}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
