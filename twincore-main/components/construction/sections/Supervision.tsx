'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { days, today } from '@/lib/construction/calc';
import { INSTRUCTIONS, VISITS, type Instruction, type InstructionState, type Visit, type VisitKind } from '@/lib/construction/extra/supervision';
import { useText, useWords } from '@/lib/construction/text';
import type { Problem } from '@/lib/construction/validate';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, Loading, PageHead, Panel, Pill, Problems, Select, Table, type Tone } from '../Kit';
import { useExtra } from '../extra';
import { nextId, useStore } from '../Store';

// Техникийн удирдлага, хяналт (ТУХ): the supervising engineer's site visits and the written site instructions they
// lead to. An instruction names the package, what must be done and by when; the contractor answers it, the
// supervisor then closes it (or sends it back to open if the answer doesn't settle it).
//
// Who may do what:
//  • issuing instructions, recording visits, closing / reopening: 'supervision.edit' (supervisor, manager, admin)
//  • answering: 'progress.submit' — the contractor's own reporting right (answering an instruction is the contractor
//    reporting on its own works), and only for packages the person's organisation holds; the manager / admin may
//    record an answer received on paper. An engineer also holds 'progress.submit' but never answers their own
//    instruction, so the organisation check keeps them out.
//
// Visits and instructions are the page's own records (useExtra), each change permission-checked and audited (log).

const STATES: InstructionState[] = ['open', 'answered', 'closed'];
const KINDS: VisitKind[] = ['planned', 'unplanned', 'joint'];
const STATE_TONE: Record<InstructionState, Tone> = { open: 'warn', answered: 'info', closed: 'good' };

const W = {
  mn: {
    lead: 'Хяналтын инженерийн талбайн үзлэг, илрүүлсэн зөрчил, гүйцэтгэгчид өгсөн техникийн заавар ба түүний хариу, биелэлт.',
    instructions: 'Техникийн заавар',
    visits: 'Талбайн үзлэг',
    issue: 'Заавар өгөх',
    record: 'Үзлэг бүртгэх',
    openN: 'Нээлттэй заавар',
    overdueN: 'Хариу хугацаа хэтэрсэн',
    answeredN: 'Хариу ирсэн, хаагдаагүй',
    visitsMonth: 'Энэ сарын үзлэг',
    visitsSub: (n: number) => `Нийт ${n} үзлэг`,
    avgReply: 'Хариу өгсөн дундаж хугацаа',
    ref: 'Дугаар',
    issued: 'Өгсөн',
    subject: 'Сэдэв',
    action: 'Авах арга хэмжээ',
    due: 'Хариу өгөх хугацаа',
    visit: 'Үзлэг',
    state: { open: 'Нээлттэй', answered: 'Хариу ирсэн', closed: 'Хаагдсан' } as Record<InstructionState, string>,
    kind: { planned: 'Төлөвлөгөөт', unplanned: 'Гэнэтийн', joint: 'Хамтарсан' } as Record<VisitKind, string>,
    kindLabel: 'Үзлэгийн төрөл',
    crew: 'Талбай дээрх ажилчид',
    summary: 'Тойм',
    findings: 'Илэрсэн зөрчил, тэмдэглэл',
    findingsHint: 'Мөр бүрт нэг',
    noRemarks: 'Зөрчилгүй',
    remarks: (n: number) => `${n} тэмдэглэл`,
    inspection: 'QA/QC шалгалт',
    none: 'Холбоогүй',
    response: 'Гүйцэтгэгчийн хариу',
    noResponse: 'Хариу ирээгүй',
    answer: 'Хариу илгээх',
    answerOnBehalf: 'Хариуг бүртгэх (цаасаар ирсэн)',
    notYours: 'Энэ багц таны байгууллагад хамаарахгүй',
    close: 'Хаах',
    reopen: 'Дахин нээх',
    reopenNote: 'Хариу хангалтгүй бол шалтгааныг бичнэ',
    daysLeft: (d: number) => (d >= 0 ? `${d} хоног үлдсэн` : `${-d} хоног хэтэрсэн`),
    fromVisit: 'Үзлэгээс өгөх заавар',
    instructionsOfVisit: 'Энэ үзлэгээс өгсөн заавар',
    by: 'Хянагч',
    contractor: 'Гүйцэтгэгч',
    search: 'Сэдэв, дугаараар хайх…',
    replyDays: 'хоног',
    toQuality: 'Чанар руу',
    dueOrder: 'Хариу өгөх хугацаа өгсөн огнооноос өмнө байна',
    issuedH: 'Заавар өгсөн',
    reopenedH: 'Дахин нээсэн',
  },
  en: {
    lead: 'The supervising engineer’s site visits and findings, the technical instructions issued to contractors, their answers and close-out.',
    instructions: 'Site instructions',
    visits: 'Site visits',
    issue: 'Issue an instruction',
    record: 'Record a visit',
    openN: 'Open instructions',
    overdueN: 'Overdue answers',
    answeredN: 'Answered, not closed',
    visitsMonth: 'Visits this month',
    visitsSub: (n: number) => `${n} visits in all`,
    avgReply: 'Average time to answer',
    ref: 'Number',
    issued: 'Issued',
    subject: 'Subject',
    action: 'Required action',
    due: 'Answer due',
    visit: 'Visit',
    state: { open: 'Open', answered: 'Answered', closed: 'Closed' },
    kind: { planned: 'Scheduled', unplanned: 'Unannounced', joint: 'Joint' },
    kindLabel: 'Visit type',
    crew: 'Workers on site',
    summary: 'Summary',
    findings: 'Findings',
    findingsHint: 'One per line',
    noRemarks: 'No remarks',
    remarks: (n: number) => `${n} findings`,
    inspection: 'QA/QC inspection',
    none: 'None',
    response: 'Contractor’s answer',
    noResponse: 'No answer yet',
    answer: 'Send answer',
    answerOnBehalf: 'Record the answer (received on paper)',
    notYours: 'This package is not your organisation’s',
    close: 'Close',
    reopen: 'Reopen',
    reopenNote: 'If the answer doesn’t settle it, say why',
    daysLeft: (d: number) => (d >= 0 ? `${d} days left` : `${-d} days overdue`),
    fromVisit: 'Issue an instruction from this visit',
    instructionsOfVisit: 'Instructions from this visit',
    by: 'Inspector',
    contractor: 'Contractor',
    search: 'Search subject or number…',
    replyDays: 'days',
    toQuality: 'To quality',
    dueOrder: 'The answer due date is before the issue date',
    issuedH: 'Issued',
    reopenedH: 'Reopened',
  },
};
type Words = (typeof W)['mn'];

const late = (i: Instruction, on: string) => i.state === 'open' && i.due < on;

export default function Supervision() {
  const t = useText();
  const w = useWords(W);
  const { data, ready, can, log, user, role } = useStore();
  const [list, setList, r1] = useExtra<Instruction[]>('supervision.instructions', INSTRUCTIONS);
  const [visits, setVisits, r2] = useExtra<Visit[]>('supervision.visits', VISITS);
  const [tab, setTab] = useState<'instructions' | 'visits'>('instructions');
  const [pkg, setPkg] = useState('all');
  const [state, setState] = useState<'all' | InstructionState | 'overdue'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [openVisit, setOpenVisit] = useState<string | null>(null);
  const [adding, setAdding] = useState<null | { kind: 'instruction'; visit: string | null; pkg: string } | { kind: 'visit' }>(null);
  const now = today();

  if (!ready || !r1 || !r2) return <Loading />;

  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const pkgOf = (id: string) => data.packages.find((p) => p.id === id);
  const myOrg = data.users.find((u) => u.id === user)?.org;
  // who may answer a given instruction (see the note at the top)
  const mayAnswer = (i: Instruction) => can('progress.submit') && (role === 'manager' || role === 'admin' || (!!myOrg && pkgOf(i.pkg)?.contractor === myOrg));

  const month = now.slice(0, 7);
  const kOpen = list.filter((i) => i.state === 'open').length;
  const kLate = list.filter((i) => late(i, now)).length;
  const kAnswered = list.filter((i) => i.state === 'answered').length;
  const kVisits = visits.filter((v) => v.date.startsWith(month)).length;
  const replied = list.filter((i) => i.response);
  const avg = replied.length ? Math.round(replied.reduce((s, i) => s + days(i.issued, i.response!.at), 0) / replied.length) : null;

  const shown = list
    .filter((i) => (pkg === 'all' || i.pkg === pkg) && (state === 'all' ? true : state === 'overdue' ? late(i, now) : i.state === state))
    .filter((i) => !q.trim() || `${i.ref} ${i.subject} ${i.action}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.issued.localeCompare(a.issued) || b.id.localeCompare(a.id));
  const shownVisits = visits.filter((v) => pkg === 'all' || v.pkg === pkg).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const ins = open ? list.find((i) => i.id === open) : undefined;
  const vis = openVisit ? visits.find((v) => v.id === openVisit) : undefined;

  // one step of an instruction's life: checked against the role, written to the audit log, kept in its history
  const step = (i: Instruction, action: 'supervision.edit' | 'progress.submit', to: InstructionState, comment: string, response?: string) => {
    if (!log(action, i.id, `${i.ref}: ${i.state} → ${to}`)) return false;
    setList((xs) =>
      xs.map((x) =>
        x.id !== i.id
          ? x
          : {
              ...x,
              state: to,
              response: response != null ? { at: now, by: user, text: response } : x.response,
              history: [...x.history, { at: now, by: user, action: to === 'open' ? 'reopened' : to, comment: comment || undefined }],
            },
      ),
    );
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.supervision}
        lead={w.lead}
        action={
          can('supervision.edit') ? (
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" onClick={() => setAdding({ kind: 'instruction', visit: null, pkg: pkg === 'all' ? data.packages[0].id : pkg })}>
                + {w.issue}
              </Btn>
              <Btn onClick={() => setAdding({ kind: 'visit' })}>+ {w.record}</Btn>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={w.openN} value={kOpen} tone={kOpen ? 'warn' : 'good'} />
        <Kpi label={w.overdueN} value={kLate} tone={kLate ? 'bad' : 'good'} />
        <Kpi label={w.answeredN} value={kAnswered} tone={kAnswered ? 'info' : 'neutral'} />
        <Kpi label={w.visitsMonth} value={kVisits} sub={w.visitsSub(visits.length)} />
        <Kpi label={w.avgReply} value={avg == null ? '—' : `${avg}`} sub={w.replyDays} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div role="tablist" className="mr-auto flex gap-1.5">
          {(['instructions', 'visits'] as const).map((k) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`min-h-10 cursor-pointer rounded-full border px-4 text-sm transition-colors ${tab === k ? 'border-accent/50 bg-accent/10 text-fg' : 'border-line text-mute hover:text-fg'}`}
            >
              {w[k]}
            </button>
          ))}
        </div>
        <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p) => [p.id, `${p.id} · ${p.name}`] as [string, string])]} />
      </div>

      {tab === 'instructions' ? (
        <Panel title={w.instructions}>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Select
              label={t.filter.status}
              value={state}
              onChange={setState}
              options={[['all', t.filter.all], ...STATES.map((s) => [s, w.state[s]] as [InstructionState, string]), ['overdue', t.common.overdue]]}
            />
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-mute sm:max-w-[280px]">
              {t.filter.search.replace('…', '')}
              <input className={inputCls} value={q} placeholder={w.search} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>
          <Table head={[w.ref, w.issued, t.common.package, w.subject, w.due, t.common.status]} empty={!shown.length}>
            {shown.map((i) => {
              const l = late(i, now);
              return (
                <tr key={i.id} className={`cursor-pointer align-top hover:bg-surface/60 ${l ? 'bg-red-400/[0.04]' : ''}`} onClick={() => setOpen(i.id)}>
                  <td className="px-2 py-2 font-mono text-xs">
                    <button type="button" className="min-h-10 cursor-pointer text-left underline-offset-2 hover:underline" onClick={() => setOpen(i.id)}>
                      {i.ref}
                    </button>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-mute">{i.issued}</td>
                  <td className="px-2 py-2 font-mono text-xs">{i.pkg}</td>
                  <td className="px-2 py-2">
                    {i.subject}
                    <p className="line-clamp-1 text-[11px] text-mute">{i.action}</p>
                  </td>
                  <td className={`px-2 py-2 font-mono text-xs ${l ? 'text-red-300' : 'text-mute'}`}>{i.due}</td>
                  <td className="px-2 py-2">
                    <span className="flex flex-wrap gap-1">
                      <Pill tone={STATE_TONE[i.state]}>{w.state[i.state]}</Pill>
                      {l && <Pill tone="bad">{t.common.overdue}</Pill>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      ) : (
        <Panel title={w.visits}>
          <ul className="space-y-3">
            {shownVisits.map((v) => {
              const n = list.filter((i) => i.visit === v.id).length;
              return (
                <li key={v.id}>
                  <button type="button" onClick={() => setOpenVisit(v.id)} className="block w-full cursor-pointer rounded-xl border border-line/70 px-4 py-3 text-left transition-colors hover:border-accent/50">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-mute">{v.date}</span>
                      <span className="font-mono">{v.pkg}</span>
                      <Pill>{w.kind[v.kind]}</Pill>
                      {v.findings.length ? <Pill tone="warn">{w.remarks(v.findings.length)}</Pill> : <Pill tone="good">{w.noRemarks}</Pill>}
                      {n > 0 && (
                        <Pill tone="info">
                          {n} {w.instructions.toLowerCase()}
                        </Pill>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-fg/90">{v.summary}</p>
                    <p className="mt-1 text-[11px] text-mute">
                      {name(v.by)}
                      {v.crew != null && ` · ${w.crew}: ${v.crew}`}
                    </p>
                  </button>
                </li>
              );
            })}
            {!shownVisits.length && <p className="py-6 text-center text-sm text-mute">{t.common.none}</p>}
          </ul>
        </Panel>
      )}

      {/* an instruction: what was asked, the answer, the next step */}
      <Drawer open={!!ins} onClose={() => setOpen(null)} title={ins ? `${ins.ref} · ${ins.subject}` : ''}>
        {ins && <InstructionDetail key={ins.id} i={ins} words={w} name={name} mayAnswer={mayAnswer(ins)} onStep={step} />}
      </Drawer>

      <Drawer open={!!vis} onClose={() => setOpenVisit(null)} title={vis ? `${vis.id} · ${vis.date}` : ''}>
        {vis && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-1.5">
              <Pill>{w.kind[vis.kind]}</Pill>
              {vis.findings.length ? <Pill tone="warn">{w.remarks(vis.findings.length)}</Pill> : <Pill tone="good">{w.noRemarks}</Pill>}
            </div>
            <dl className="space-y-1.5 text-xs">
              {(
                [
                  [t.common.package, `${vis.pkg} · ${pkgOf(vis.pkg)?.name ?? ''}`],
                  [w.by, name(vis.by)],
                  [w.crew, vis.crew == null ? '—' : String(vis.crew)],
                  [w.inspection, vis.inspection ? `${vis.inspection} · ${data.inspections.find((x) => x.id === vis.inspection)?.title ?? ''}` : w.none],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line/50 pb-1.5">
                  <dt className="text-mute">{k}</dt>
                  <dd className="text-fg/90">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-fg/85">{vis.summary}</p>
            {vis.findings.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-mute">{w.findings}</p>
                <ul className="list-disc space-y-0.5 pl-5 text-xs">
                  {vis.findings.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs text-mute">{w.instructionsOfVisit}</p>
              <ul className="space-y-1 text-xs">
                {list
                  .filter((i) => i.visit === vis.id)
                  .map((i) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        className="flex min-h-10 w-full cursor-pointer items-center gap-2 text-left hover:text-fg"
                        onClick={() => {
                          setOpenVisit(null);
                          setTab('instructions');
                          setOpen(i.id);
                        }}
                      >
                        <span className="font-mono">{i.ref}</span> {i.subject} <Pill tone={STATE_TONE[i.state]}>{w.state[i.state]}</Pill>
                      </button>
                    </li>
                  ))}
                {!list.some((i) => i.visit === vis.id) && <li className="text-mute">{t.common.none}</li>}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              {can('supervision.edit') && (
                <Btn
                  onClick={() => {
                    setOpenVisit(null);
                    setAdding({ kind: 'instruction', visit: vis.id, pkg: vis.pkg });
                  }}
                >
                  + {w.fromVisit}
                </Btn>
              )}
              {vis.inspection && (
                <Link href="/construction/quality" className="inline-flex min-h-10 items-center text-sm text-accent-hi hover:underline">
                  {w.toQuality} →
                </Link>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={!!adding} onClose={() => setAdding(null)} title={adding?.kind === 'visit' ? w.record : w.issue}>
        {adding?.kind === 'instruction' && (
          <NewInstruction
            words={w}
            visit={adding.visit}
            pkg={adding.pkg}
            visits={visits}
            onCancel={() => setAdding(null)}
            onSave={(i) => {
              const id = nextId('TI', list.map((x) => x.id));
              if (!log('supervision.edit', id, `${i.ref}: ${i.subject}`)) return false;
              setList((xs) => [...xs, { ...i, id, by: user, state: 'open', history: [{ at: now, by: user, action: 'issued' }] }]);
              setAdding(null);
              setTab('instructions');
              return true;
            }}
          />
        )}
        {adding?.kind === 'visit' && (
          <NewVisit
            words={w}
            onCancel={() => setAdding(null)}
            onSave={(v) => {
              const id = nextId('SV', visits.map((x) => x.id));
              if (!log('supervision.edit', id, `${v.pkg} · ${v.date}`)) return false;
              setVisits((xs) => [...xs, { ...v, id, by: user }]);
              setAdding(null);
              setTab('visits');
              return true;
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function InstructionDetail({
  i,
  words: w,
  name,
  mayAnswer,
  onStep,
}: {
  i: Instruction;
  words: Words;
  name: (id: string) => string;
  mayAnswer: boolean;
  onStep: (i: Instruction, action: 'supervision.edit' | 'progress.submit', to: InstructionState, comment: string, response?: string) => boolean;
}) {
  const t = useText();
  const { data, can, role } = useStore();
  const [text, setText] = useState('');
  const [comment, setComment] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const now = today();
  const left = days(now, i.due);
  const contractor = data.packages.find((p) => p.id === i.pkg)?.contractor;
  const run = (ok: boolean) => {
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else {
      setProblems([]);
      setText('');
      setComment('');
    }
  };
  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={STATE_TONE[i.state]}>{w.state[i.state]}</Pill>
        {i.state === 'open' && <Pill tone={left < 0 ? 'bad' : left <= 3 ? 'warn' : 'neutral'}>{w.daysLeft(left)}</Pill>}
      </div>
      <dl className="space-y-1.5 text-xs">
        {(
          [
            [t.common.package, `${i.pkg} · ${data.packages.find((p) => p.id === i.pkg)?.name ?? ''}`],
            [w.contractor, contractor ? name(contractor) : '—'],
            [w.issued, `${i.issued} · ${name(i.by)}`],
            [w.due, i.due],
            [w.visit, i.visit ?? w.none],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="text-fg/90">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1 text-xs text-mute">{w.action}</p>
        <p className="text-fg/90">{i.action}</p>
      </div>
      <div className="rounded-lg border border-line p-3 text-xs">
        <p className="text-mute">{w.response}</p>
        {i.response ? (
          <>
            <p className="mt-1 text-sm text-fg/90">{i.response.text}</p>
            <p className="mt-1 font-mono text-[11px] text-mute">
              {i.response.at} · {name(i.response.by)}
            </p>
          </>
        ) : (
          <p className="mt-1">{w.noResponse}</p>
        )}
      </div>

      {/* the contractor's answer to an open instruction */}
      {i.state === 'open' &&
        (mayAnswer ? (
          <div className="space-y-2">
            <Field label={role === 'contractor' ? w.answer : w.answerOnBehalf} error={problems.some((p) => p.field === 'text') ? t.problem.required : undefined}>
              <textarea className={`${inputCls} h-24 py-1.5`} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <Btn
              kind="primary"
              onClick={() => {
                if (!text.trim()) return setProblems([{ field: 'text', code: 'required' }]);
                run(onStep(i, 'progress.submit', 'answered', '', text.trim()));
              }}
            >
              {role === 'contractor' ? w.answer : w.answerOnBehalf}
            </Btn>
          </div>
        ) : role === 'contractor' ? (
          <p className="rounded-lg border border-line px-3 py-2 text-xs text-mute">🔒 {w.notYours}</p>
        ) : null)}

      {/* the supervisor's close-out */}
      {can('supervision.edit') ? (
        <div className="space-y-2">
          <Field label={i.state === 'answered' ? `${t.common.comment} — ${w.reopenNote}` : t.common.comment} error={problems.some((p) => p.field === 'comment') ? t.problem.required : undefined}>
            <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {i.state !== 'closed' && (
              <Btn kind={i.state === 'answered' ? 'primary' : 'ghost'} onClick={() => run(onStep(i, 'supervision.edit', 'closed', comment.trim()))}>
                → {w.close}
              </Btn>
            )}
            {i.state !== 'open' && (
              <Btn
                onClick={() => {
                  // sending it back needs a reason the contractor can act on
                  if (!comment.trim()) return setProblems([{ field: 'comment', code: 'required' }]);
                  run(onStep(i, 'supervision.edit', 'open', comment.trim()));
                }}
              >
                → {w.reopen}
              </Btn>
            )}
          </div>
        </div>
      ) : (
        !(i.state === 'open' && mayAnswer) && role !== 'contractor' && <Forbidden />
      )}
      <Problems list={problems.filter((p) => p.code === 'forbidden')} />

      <div>
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={i.history.map((h) => ({ ...h, action: h.action === 'issued' ? w.issuedH : h.action === 'reopened' ? w.reopenedH : (w.state[h.action as InstructionState] ?? h.action) }))} name={name} />
      </div>
    </div>
  );
}

function NewInstruction({ words: w, visit, pkg, visits, onSave, onCancel }: { words: Words; visit: string | null; pkg: string; visits: Visit[]; onSave: (i: Omit<Instruction, 'id' | 'by' | 'state' | 'history'>) => boolean; onCancel: () => void }) {
  const t = useText();
  const { data } = useStore();
  const now = today();
  const [f, setF] = useState({ ref: '', pkg, subject: '', action: '', issued: now, due: '', visit: visit ?? '' });
  const [problems, setProblems] = useState<Problem[]>([]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = (field: string) => {
    const p = problems.find((x) => x.field === field);
    return p ? (p.code === 'dateOrder' ? w.dueOrder : t.problem[p.code]) : undefined;
  };
  const save = () => {
    const p: Problem[] = [];
    if (!f.ref.trim()) p.push({ field: 'ref', code: 'required' });
    if (!f.subject.trim()) p.push({ field: 'subject', code: 'required' });
    if (!f.action.trim()) p.push({ field: 'action', code: 'required' });
    if (!f.due) p.push({ field: 'due', code: 'required' });
    else if (f.due < f.issued) p.push({ field: 'due', code: 'dateOrder' });
    setProblems(p);
    if (p.length) return;
    if (!onSave({ ref: f.ref.trim(), pkg: f.pkg, subject: f.subject.trim(), action: f.action.trim(), issued: f.issued, due: f.due, visit: f.visit || null })) setProblems([{ field: 'role', code: 'forbidden' }]);
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label={w.ref} error={err('ref')}>
        <input className={inputCls} value={f.ref} placeholder="ТЗ-2026/038" onChange={(e) => set('ref', e.target.value)} />
      </Field>
      <Select label={t.common.package} value={f.pkg} onChange={(v) => set('pkg', v)} options={data.packages.map((p) => [p.id, `${p.id} · ${p.name}`])} />
      <Select label={w.visit} value={f.visit} onChange={(v) => set('visit', v)} options={[['', w.none], ...visits.filter((v) => v.pkg === f.pkg).map((v) => [v.id, `${v.id} · ${v.date}`] as [string, string])]} />
      <Field label={w.subject} error={err('subject')}>
        <input className={inputCls} value={f.subject} onChange={(e) => set('subject', e.target.value)} />
      </Field>
      <Field label={w.action} error={err('action')}>
        <textarea className={`${inputCls} h-24 py-1.5`} value={f.action} onChange={(e) => set('action', e.target.value)} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={w.issued}>
          <input type="date" className={inputCls} value={f.issued} onChange={(e) => e.target.value && set('issued', e.target.value)} />
        </Field>
        <Field label={w.due} error={err('due')}>
          <input type="date" className={inputCls} value={f.due} onChange={(e) => set('due', e.target.value)} />
        </Field>
      </div>
      <Problems list={problems.filter((p) => p.code === 'forbidden')} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onCancel}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}

function NewVisit({ words: w, onSave, onCancel }: { words: Words; onSave: (v: Omit<Visit, 'id' | 'by'>) => boolean; onCancel: () => void }) {
  const t = useText();
  const { data } = useStore();
  const [f, setF] = useState({ date: today(), pkg: data.packages[0]?.id ?? '', kind: 'planned' as VisitKind, crew: '', summary: '', findings: '', inspection: '' });
  const [problems, setProblems] = useState<Problem[]>([]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const p: Problem[] = [];
    if (!f.summary.trim()) p.push({ field: 'summary', code: 'required' });
    if (!f.date) p.push({ field: 'date', code: 'required' });
    if (f.crew !== '' && !(+f.crew >= 0)) p.push({ field: 'crew', code: 'range' });
    setProblems(p);
    if (p.length) return;
    const ok = onSave({
      date: f.date,
      pkg: f.pkg,
      kind: f.kind,
      crew: f.crew === '' ? null : Math.round(+f.crew),
      summary: f.summary.trim(),
      findings: f.findings
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean),
      inspection: f.inspection || null,
    });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
  };
  const err = (field: string) => {
    const p = problems.find((x) => x.field === field);
    return p ? t.problem[p.code] : undefined;
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t.common.date} error={err('date')}>
          <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Select label={w.kindLabel} value={f.kind} onChange={(v) => set('kind', v)} options={KINDS.map((k) => [k, w.kind[k]])} />
      </div>
      <Select label={t.common.package} value={f.pkg} onChange={(v) => set('pkg', v)} options={data.packages.map((p) => [p.id, `${p.id} · ${p.name}`])} />
      <Select label={w.inspection} value={f.inspection} onChange={(v) => set('inspection', v)} options={[['', w.none], ...data.inspections.filter((i) => i.pkg === f.pkg).map((i) => [i.id, `${i.id} · ${i.title}`] as [string, string])]} />
      <Field label={w.crew} error={err('crew')}>
        <input type="number" min="0" className={inputCls} value={f.crew} onChange={(e) => set('crew', e.target.value)} />
      </Field>
      <Field label={w.summary} error={err('summary')}>
        <textarea className={`${inputCls} h-20 py-1.5`} value={f.summary} onChange={(e) => set('summary', e.target.value)} />
      </Field>
      <Field label={`${w.findings} — ${w.findingsHint}`}>
        <textarea className={`${inputCls} h-24 py-1.5`} value={f.findings} onChange={(e) => set('findings', e.target.value)} />
      </Field>
      <Problems list={problems.filter((p) => p.code === 'forbidden')} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {t.common.save}
        </Btn>
        <Btn onClick={onCancel}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}
