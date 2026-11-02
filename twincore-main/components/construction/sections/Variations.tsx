'use client';

import { useState, type ReactNode } from 'react';
import { pct, today, tug } from '@/lib/construction/calc';
import { VARIATIONS, type Variation, type VariationReason, type VariationState } from '@/lib/construction/extra/variations';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { Id } from '@/lib/construction/types';
import { checkFile, type Problem } from '@/lib/construction/validate';
import { useExtra } from '../extra';
import { Bar, Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { nextId, useStore } from '../Store';

// Нэмэлт ажил: variation orders — extra work a contractor claims beyond the contract (design change, site condition,
// client request, error or omission), with its cost and time impact. Flow: submitted → under review → approved /
// rejected. The reviewer may approve a lower cost or fewer days than claimed; the approved sum is tracked against the
// package's contract value, flagged past an internal 10 % threshold. Money is shown to roles that may see finances —
// a contractor sees the amounts of its own claims only.

const REASONS: VariationReason[] = ['design', 'site', 'client', 'error'];
const STATES: VariationState[] = ['submitted', 'review', 'approved', 'rejected'];
const LIMIT = 10; // % of the contract value: past this a variation needs a contract amendment review

const W = {
  mn: {
    lead: 'Гэрээнд тусгагдаагүй нэмэлт ажлын хүсэлт — шалтгаан, өртөг, хугацааны нөлөө, хавсралттай; гүйцэтгэгч ирүүлж, хяналтын инженер хянаж, захиалагч батална.',
    add: 'Нэмэлт ажлын хүсэлт ирүүлэх',
    waiting: 'Шийдвэр хүлээгдэж буй',
    approvedCost: 'Батлагдсан нэмэлт өртөг',
    ofContract: 'гэрээний дүнгийн',
    approvedDays: 'Батлагдсан хугацааны нөлөө',
    rejected: 'Татгалзсан',
    byPkg: 'Багцаар — гэрээний дүнтэй харьцуулсан',
    contract: 'Гэрээний дүн',
    approved: 'Батлагдсан',
    pending: 'Хүлээгдэж буй',
    share: 'Гэрээнд эзлэх хувь',
    noContract: 'Гэрээ байгуулаагүй',
    threshold: `${LIMIT}%-ийн дотоод хяналтын босго`,
    over: 'Босго давсан',
    list: 'Нэмэлт ажлын бүртгэл',
    reasonL: 'Шалтгаан',
    reason: { design: 'Зураг төслийн өөрчлөлт', site: 'Талбайн нөхцөл', client: 'Захиалагчийн хүсэлт', error: 'Алдаа, орхигдуулга' } as Record<VariationReason, string>,
    state: { submitted: 'Ирүүлсэн', review: 'Хянагдаж буй', approved: 'Батлагдсан', rejected: 'Татгалзсан' } as Record<VariationState, string>,
    id: 'Дугаар',
    title: 'Ажлын нэр',
    org: 'Гүйцэтгэгч',
    cost: 'Өртөг',
    days: 'Хугацаа',
    description: 'Тайлбар',
    activity: 'Холбогдох ажил',
    none: 'Холбоогүй',
    attachments: 'Хавсралт',
    noFiles: 'Хавсралтгүй',
    claimed: 'Хүссэн',
    by: 'Ирүүлсэн',
    submitted: 'Ирүүлсэн огноо',
    startReview: 'Хянаж эхлэх',
    approve: 'Батлах',
    reject: 'Татгалзах',
    approveCost: 'Батлах өртөг (сая ₮)',
    approveDays: 'Батлах хугацаа (хоног)',
    commentRequired: 'Татгалзах бол тайлбар заавал бичнэ',
    costF: 'Өртөг (сая ₮)',
    daysF: 'Хугацааны нөлөө (хоног)',
    files: 'Хавсралт (тооцоо, зураг, үнийн санал)',
    search: 'Хайх…',
    hidden: 'Санхүүгийн мэдээлэл — эрхгүй',
    send: 'Ирүүлэх',
  },
  en: {
    lead: 'Requests for work outside the contract — reason, cost, time impact and attachments; submitted by the contractor, reviewed by the supervising engineer, approved by the client.',
    add: 'Submit an extra work request',
    waiting: 'Awaiting decision',
    approvedCost: 'Approved extra cost',
    ofContract: 'of contract value',
    approvedDays: 'Approved time impact',
    rejected: 'Rejected',
    byPkg: 'By package — against the contract value',
    contract: 'Contract value',
    approved: 'Approved',
    pending: 'Pending',
    share: 'Share of contract',
    noContract: 'No contract yet',
    threshold: `${LIMIT}% internal control threshold`,
    over: 'Over threshold',
    list: 'Variation register',
    reasonL: 'Reason',
    reason: { design: 'Design change', site: 'Site condition', client: 'Client request', error: 'Error or omission' } as Record<VariationReason, string>,
    state: { submitted: 'Submitted', review: 'Under review', approved: 'Approved', rejected: 'Rejected' } as Record<VariationState, string>,
    id: 'No.',
    title: 'Work',
    org: 'Contractor',
    cost: 'Cost',
    days: 'Time',
    description: 'Description',
    activity: 'Related activity',
    none: 'None',
    attachments: 'Attachments',
    noFiles: 'No attachments',
    claimed: 'Claimed',
    by: 'Submitted by',
    submitted: 'Submitted',
    startReview: 'Start review',
    approve: 'Approve',
    reject: 'Reject',
    approveCost: 'Approved cost (₮ mn)',
    approveDays: 'Approved time (days)',
    commentRequired: 'A comment is required to reject',
    costF: 'Cost (₮ mn)',
    daysF: 'Time impact (days)',
    files: 'Attachments (calculation, drawings, quotes)',
    search: 'Search…',
    hidden: 'Financial information — no access',
    send: 'Submit',
  },
};

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

export default function Variations() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, can, log, user, role } = useStore();
  const [items, setItems] = useExtra<Variation[]>('variations.orders', VARIATIONS);
  const [pkg, setPkg] = useState('all');
  const [state, setState] = useState<'all' | 'waiting' | VariationState>('all');
  const [reason, setReason] = useState<'all' | VariationReason>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Id | null>(null);
  const [adding, setAdding] = useState(false);
  const now = today();

  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const myOrg = data.users.find((u) => u.id === user)?.org;
  // amounts: everyone with finance access; a contractor sees its own claims' amounts
  const seesCost = (v: Variation) => can('finance.view') || (role === 'contractor' && v.org === myOrg);
  const money = (v: Variation, n: number | undefined) => (seesCost(v) ? tug(n ?? null, en) : '🔒');

  const scope = items.filter(seesCost);
  const waiting = items.filter((v) => v.state === 'submitted' || v.state === 'review');
  const approved = items.filter((v) => v.state === 'approved');
  const approvedCost = sum(approved.filter(seesCost).map((v) => v.approvedCost ?? v.cost));
  const contractTotal = sum(data.contracts.filter((c) => can('finance.view') || c.org === myOrg).map((c) => c.amount));
  const share = contractTotal ? (approvedCost / contractTotal) * 100 : null;

  const shown = items
    .filter((v) => (pkg === 'all' || v.pkg === pkg) && (reason === 'all' || v.reason === reason))
    .filter((v) => (state === 'all' ? true : state === 'waiting' ? v.state === 'submitted' || v.state === 'review' : v.state === state))
    .filter((v) => !q.trim() || `${v.id} ${v.title} ${v.description}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.submitted.localeCompare(a.submitted));
  const cur = items.find((v) => v.id === open) ?? null;

  const step = (v: Variation, to: VariationState, extra: { comment?: string; cost?: number; days?: number } = {}) => {
    if (!log('variation.review', v.id, `${v.state} → ${to}${to === 'approved' ? ` (${extra.cost} / ${extra.days})` : ''}`)) return false;
    setItems((xs) =>
      xs.map((x) =>
        x.id === v.id
          ? { ...x, state: to, ...(to === 'approved' ? { approvedCost: extra.cost, approvedDays: extra.days } : {}), history: [...x.history, { at: now, by: user, action: to, comment: extra.comment || undefined }] }
          : x,
      ),
    );
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.variations}
        lead={w.lead}
        action={
          can('variation.submit') ? (
            <Btn kind="primary" onClick={() => setAdding(true)}>
              + {w.add}
            </Btn>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={w.waiting} value={waiting.length} sub={scope.length ? tug(sum(waiting.filter(seesCost).map((v) => v.cost)), en) : undefined} tone={waiting.length ? 'info' : 'good'} />
        <Kpi
          label={w.approvedCost}
          value={scope.length ? tug(approvedCost, en) : '🔒'}
          sub={scope.length ? `${pct(share, 1)} ${w.ofContract}` : w.hidden}
          tone={share != null && share > LIMIT ? 'bad' : share != null && share > LIMIT / 2 ? 'warn' : 'neutral'}
        />
        <Kpi label={w.approvedDays} value={`${sum(approved.map((v) => v.approvedDays ?? v.days))} ${t.common.days}`} sub={`${approved.length} ${w.approved.toLowerCase()}`} />
        <Kpi label={w.rejected} value={items.filter((v) => v.state === 'rejected').length} />
      </div>

      <Panel title={w.byPkg}>
        {can('finance.view') || role === 'contractor' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.packages
              .filter((p) => can('finance.view') || p.contractor === myOrg)
              .map((p) => {
                const c = data.contracts.find((x) => x.pkg === p.id);
                const vs = items.filter((v) => v.pkg === p.id);
                const ap = sum(vs.filter((v) => v.state === 'approved').map((v) => v.approvedCost ?? v.cost));
                const pe = sum(vs.filter((v) => v.state === 'submitted' || v.state === 'review').map((v) => v.cost));
                const s = c ? (ap / c.amount) * 100 : null;
                const withPending = c ? ((ap + pe) / c.amount) * 100 : null;
                return (
                  <div key={p.id} className="rounded-xl border border-line p-3 text-xs">
                    <p className="flex items-start justify-between gap-2">
                      <span className="text-fg/90">
                        <span className="font-mono text-mute">{p.id}</span> {p.name}
                      </span>
                      {s != null && s > LIMIT && <Pill tone="bad">{w.over}</Pill>}
                    </p>
                    {c ? (
                      <>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                          <dt className="text-mute">{w.contract}</dt>
                          <dd className="text-right font-mono">{tug(c.amount, en)}</dd>
                          <dt className="text-mute">{w.approved}</dt>
                          <dd className="text-right font-mono">{tug(ap, en)}</dd>
                          <dt className="text-mute">{w.pending}</dt>
                          <dd className="text-right font-mono">{tug(pe, en)}</dd>
                          <dt className="text-mute">{w.share}</dt>
                          <dd className={`text-right font-mono ${s! > LIMIT ? 'text-red-300' : 'text-fg'}`}>
                            {pct(s, 1)} <span className="text-mute">({pct(withPending, 1)})</span>
                          </dd>
                        </dl>
                        {/* the bar runs to 1.5× the threshold; the marker is the threshold itself */}
                        <div className="mt-2">
                          <Bar value={(s! / (LIMIT * 1.5)) * 100} planned={(1 / 1.5) * 100} tone={s! > LIMIT ? 'bad' : s! > LIMIT / 2 ? 'warn' : 'good'} label={w.share} />
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-mute">{w.noContract}</p>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-xs text-mute">🔒 {w.hidden}</p>
        )}
        <p className="mt-3 text-[11px] text-mute">
          {w.share}: {en ? 'approved variations ÷ contract value (in brackets: including pending claims). Marker' : 'батлагдсан нэмэлт ажил ÷ гэрээний дүн (хаалтад: хүлээгдэж буй хүсэлтийг оруулсан). Тэмдэглэгээ'} — {w.threshold}.
        </p>
      </Panel>

      <Panel title={w.list}>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, `${p.id} · ${p.name}`])]} />
          <Select label={t.filter.status} value={state} onChange={setState} options={[['all', t.filter.all], ['waiting', w.waiting], ...STATES.map((s): [VariationState, string] => [s, w.state[s]])]} />
          <Select label={w.reasonL} value={reason} onChange={setReason} options={[['all', t.filter.all], ...REASONS.map((r): [VariationReason, string] => [r, w.reason[r]])]} />
          <Field label={t.filter.search.replace('…', '')}>
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder={w.search} />
          </Field>
        </div>
        <Table head={[w.submitted, w.id, w.title, t.common.package, w.reasonL, w.cost, w.days, t.common.status]} empty={!shown.length}>
          {shown.map((v) => (
            <tr key={v.id} className="cursor-pointer hover:bg-surface/60" onClick={() => setOpen(v.id)}>
              <td className="px-2 py-2.5 font-mono text-xs text-mute">{v.submitted}</td>
              <td className="px-2 py-2.5 font-mono text-xs">
                <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => setOpen(v.id)}>
                  {v.id}
                </button>
              </td>
              <td className="px-2 py-2.5">
                {v.title}
                <span className="block text-[11px] text-mute">{name(v.org)}</span>
              </td>
              <td className="px-2 py-2.5 font-mono text-xs">{v.pkg}</td>
              <td className="px-2 py-2.5 text-xs text-mute">{w.reason[v.reason]}</td>
              <td className="px-2 py-2.5 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                {v.state === 'approved' ? money(v, v.approvedCost ?? v.cost) : money(v, v.cost)}
                {v.state === 'approved' && v.approvedCost != null && v.approvedCost !== v.cost && seesCost(v) && <span className="block text-[10px] text-mute line-through">{tug(v.cost, en)}</span>}
              </td>
              <td className="px-2 py-2.5 font-mono text-xs whitespace-nowrap tabular-nums">
                {v.state === 'approved' ? (v.approvedDays ?? v.days) : v.days} {t.common.days}
              </td>
              <td className="px-2 py-2.5">
                <Pill tone={toneOf(v.state)}>{w.state[v.state]}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Drawer open={!!cur} onClose={() => setOpen(null)} title={cur ? `${cur.id} · ${cur.title}` : ''}>
        {cur && <Detail key={cur.id} v={cur} words={w} name={name} money={money} canReview={can('variation.review')} onStep={step} />}
      </Drawer>

      <Drawer open={adding} onClose={() => setAdding(false)} title={w.add}>
        {adding && (
          <NewVariation
            words={w}
            onDone={(v) => {
              setItems((xs) => [...xs, { ...v, id: nextId('VO', xs.map((x) => x.id)) }]);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
            ids={items.map((x) => x.id)}
          />
        )}
      </Drawer>
    </div>
  );
}

type Words = typeof W.mn;

function Detail({
  v,
  words: w,
  name,
  money,
  canReview,
  onStep,
}: {
  v: Variation;
  words: Words;
  name: (id: string) => string;
  money: (v: Variation, n: number | undefined) => string;
  canReview: boolean;
  onStep: (v: Variation, to: VariationState, extra?: { comment?: string; cost?: number; days?: number }) => boolean;
}) {
  const t = useText();
  const { data } = useStore();
  const [comment, setComment] = useState('');
  const [cost, setCost] = useState(v.cost);
  const [days, setDays] = useState(v.days);
  const [problems, setProblems] = useState<Problem[]>([]);
  const act = v.activity ? data.activities.find((a) => a.id === v.activity) : undefined;
  const decide = v.state === 'submitted' || v.state === 'review';

  const go = (to: VariationState) => {
    const p: Problem[] = [];
    if (to === 'rejected' && !comment.trim()) p.push({ field: 'comment', code: 'required' });
    if (to === 'approved' && (!(cost >= 0) || !(days >= 0))) p.push({ field: 'cost', code: 'range' });
    setProblems(p);
    if (p.length) return;
    if (!onStep(v, to, { comment: comment.trim(), cost, days })) setProblems([{ field: 'role', code: 'forbidden' }]);
    else setComment('');
  };

  const rows: [string, ReactNode][] = [
    [t.common.package, `${v.pkg} · ${data.packages.find((p) => p.id === v.pkg)?.name ?? ''}`],
    [w.org, name(v.org)],
    [w.activity, act ? `${act.id} · ${act.name}` : w.none],
    [w.reasonL, w.reason[v.reason]],
    [`${w.cost} (${w.claimed})`, money(v, v.cost)],
    [`${w.days} (${w.claimed})`, `${v.days} ${t.common.days}`],
    ...(v.state === 'approved' ? ([[`${w.cost} (${w.approved})`, money(v, v.approvedCost)], [`${w.days} (${w.approved})`, `${v.approvedDays ?? v.days} ${t.common.days}`]] as [string, string][]) : []),
    [w.by, `${name(v.by)} · ${v.submitted}`],
  ];

  return (
    <div className="space-y-5 text-sm">
      <Pill tone={toneOf(v.state)}>{w.state[v.state]}</Pill>
      <p className="text-fg/90">{v.description}</p>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([k, val]) => (
          <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-line/50 pb-1.5">
            <dt className="text-mute">{k}</dt>
            <dd className="text-fg/90">{val}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1.5 text-xs text-mute">{w.attachments}</p>
        {v.attachments.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {v.attachments.map((f) => (
              <li key={f} className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-fg/85">
                📎 {f}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mute">{w.noFiles}</p>
        )}
      </div>

      {decide &&
        (canReview ? (
          <div className="space-y-3 rounded-xl border border-line p-3">
            {v.state === 'submitted' && (
              <Btn onClick={() => (onStep(v, 'review') ? setProblems([]) : setProblems([{ field: 'role', code: 'forbidden' }]))}>→ {w.startReview}</Btn>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.approveCost}>
                <input type="number" min={0} step="any" inputMode="decimal" className={`${inputCls} h-10`} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
              </Field>
              <Field label={w.approveDays}>
                <input type="number" min={0} inputMode="numeric" className={`${inputCls} h-10`} value={days} onChange={(e) => setDays(Number(e.target.value))} />
              </Field>
            </div>
            <Field label={t.common.comment} error={problems.some((p) => p.field === 'comment') ? w.commentRequired : undefined}>
              <textarea className={`${inputCls} h-16 py-1.5`} value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" onClick={() => go('approved')}>
                ✓ {w.approve}
              </Btn>
              <Btn kind="danger" onClick={() => go('rejected')}>
                ✕ {w.reject}
              </Btn>
            </div>
            <Problems list={problems.filter((p) => p.field !== 'comment')} />
          </div>
        ) : (
          <Forbidden />
        ))}

      <div>
        <p className="mb-2 text-xs text-mute">{t.common.history}</p>
        <History items={v.history} name={name} />
      </div>
    </div>
  );
}

function NewVariation({ words: w, onDone, onCancel, ids }: { words: Words; onDone: (v: Variation) => void; onCancel: () => void; ids: string[] }) {
  const t = useText();
  const { data, user, role, log } = useStore();
  const myOrg = data.users.find((u) => u.id === user)?.org;
  // a contractor claims on its own packages; others may log a claim on any package that has a contractor
  const pkgs = data.packages.filter((p) => p.contractor && (role !== 'contractor' || p.contractor === myOrg));
  const [f, setF] = useState({ pkg: pkgs[0]?.id ?? '', activity: '', title: '', description: '', reason: 'site' as VariationReason, cost: 0, days: 0 });
  const [files, setFiles] = useState<string[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const p: Problem[] = [];
    if (!f.pkg) p.push({ field: 'pkg', code: 'required' });
    if (!f.title.trim()) p.push({ field: 'title', code: 'required' });
    if (!f.description.trim()) p.push({ field: 'description', code: 'required' });
    if (!(f.cost > 0) || f.days < 0) p.push({ field: 'cost', code: 'range' });
    setProblems(p);
    if (p.length) return;
    const id = nextId('VO', ids);
    if (!log('variation.submit', id, f.title.trim())) return setProblems([{ field: 'role', code: 'forbidden' }]);
    const org = data.packages.find((x) => x.id === f.pkg)?.contractor ?? myOrg ?? '';
    onDone({ id, pkg: f.pkg, org, activity: f.activity || null, title: f.title.trim(), description: f.description.trim(), reason: f.reason, cost: f.cost, days: f.days, attachments: files, by: user, submitted: today(), state: 'submitted', history: [{ at: today(), by: user, action: 'submitted' }] });
  };

  if (!pkgs.length) return <Forbidden />;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Select label={t.common.package} value={f.pkg} onChange={(v) => setF((x) => ({ ...x, pkg: v, activity: '' }))} options={pkgs.map((p) => [p.id, `${p.id} · ${p.name}`])} />
      <Select label={w.activity} value={f.activity} onChange={(v) => set('activity', v)} options={[['', w.none], ...data.activities.filter((a) => a.pkg === f.pkg).map((a): [string, string] => [a.id, `${a.id} · ${a.name}`])]} />
      <Field label={w.title} error={problems.some((p) => p.field === 'title') ? t.problem.required : undefined}>
        <input className={`${inputCls} h-10`} value={f.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label={w.description} error={problems.some((p) => p.field === 'description') ? t.problem.required : undefined}>
        <textarea className={`${inputCls} h-20 py-1.5`} value={f.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Select label={w.reasonL} value={f.reason} onChange={(v) => set('reason', v)} options={REASONS.map((r) => [r, w.reason[r]])} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={w.costF} error={problems.some((p) => p.field === 'cost') ? t.problem.range : undefined}>
          <input type="number" min={0} step="any" inputMode="decimal" className={`${inputCls} h-10`} value={f.cost} onChange={(e) => set('cost', Number(e.target.value))} />
        </Field>
        <Field label={w.daysF}>
          <input type="number" min={0} inputMode="numeric" className={`${inputCls} h-10`} value={f.days} onChange={(e) => set('days', Number(e.target.value))} />
        </Field>
      </div>
      <Field label={w.files}>
        {/* names only: the files themselves are not stored in this demonstration */}
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="text-xs text-mute file:mr-3 file:h-10 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-transparent file:px-4 file:text-fg"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            const bad = list.flatMap((x) => checkFile(x));
            setProblems(bad);
            setFiles(list.filter((x) => !checkFile(x).length).map((x) => x.name));
          }}
        />
      </Field>
      {files.length > 0 && <p className="text-[11px] text-mute">📎 {files.join(', ')}</p>}
      <Problems list={problems.filter((p) => !['title', 'description', 'cost'].includes(p.field))} />
      <div className="flex gap-2">
        <Btn kind="primary" type="submit">
          {w.send}
        </Btn>
        <Btn onClick={onCancel}>{t.common.cancel}</Btn>
      </div>
    </form>
  );
}
