'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { cashflow, money, pct, today, tug } from '@/lib/construction/calc';
import { DRAWDOWNS, SOURCES, type Drawdown, type DrawState, type FundingSource, type SourceKind, type SourceStatus } from '@/lib/construction/extra/funding';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { Problem } from '@/lib/construction/validate';
import { LineChart } from '../Charts';
import { useExtra } from '../extra';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, PageHead, Panel, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { nextId, useStore } from '../Store';

// Where the project's money comes from, as opposed to where it goes ("Багцын санхүү" follows each package's budget,
// contracts and invoices). Each source — state and city budgets, a development-bank loan, a PPP partner, a pledged
// donor loan — is committed (signed) or only pledged; it is allocated across the packages, and drawn down request
// by request: requested → approved → disbursed (or rejected). A package's funding gap is its budget less what the
// committed sources allocate to it; pledged money is shown beside the gap, never counted as secured.

const W = {
  mn: {
    lead: 'Санхүүжилтийн эх үүсвэр, баталгаажсан дүн, татан авалтын хүсэлт, багц бүрийн хуваарилалт ба санхүүжилтийн дутагдал.',
    kind: { state: 'Улсын төсөв', city: 'Нийслэлийн төсөв', loan: 'Зээл', ppp: 'ТХХТ', donor: 'Хандивлагч / түнш' } as Record<SourceKind, string>,
    status: { committed: 'Баталгаажсан', pledged: 'Амласан (гэрээгүй)' } as Record<SourceStatus, string>,
    draw: { requested: 'Хүсэлт гаргасан', approved: 'Зөвшөөрсөн', disbursed: 'Шилжүүлсэн', rejected: 'Татгалзсан' } as Record<DrawState, string>,
    act: { approved: 'Зөвшөөрөх', disbursed: 'Шилжүүлсэн гэж тэмдэглэх', rejected: 'Татгалзах', requested: '' } as Record<DrawState, string>,
    sources: 'Санхүүжилтийн эх үүсвэр',
    source: 'Эх үүсвэр',
    kindLabel: 'Төрөл',
    amount: 'Дүн',
    amountMn: 'Дүн (сая ₮)',
    allocated: 'Хуваарилсан',
    unallocated: 'Хуваарилаагүй нөөц',
    disbursed: 'Татан авсан',
    pending: 'Шийдвэрлэгдэж буй',
    available: 'Үлдэгдэл',
    ref: 'Гэрээ / шийдвэр',
    terms: 'Нөхцөл',
    kpiBudget: 'Нийт төсөв',
    kpiBudgetSub: 'Багцуудын батлагдсан төсөв',
    kpiCommitted: 'Баталгаажсан санхүүжилт',
    kpiPledged: 'Амласан, гэрээгүй',
    kpiDisbursed: 'Татан авсан',
    kpiQueue: 'Шийдвэр хүлээж буй хүсэлт',
    kpiGap: 'Санхүүжилтийн дутагдал',
    kpiGapSub: 'Төсөв − баталгаажсан',
    alloc: 'Багц бүрийн хуваарилалт ба төсөв',
    allocLead: 'Багана бүр нэг эх үүсвэр. Улаан хэсэг нь баталгаажсан эх үүсвэргүй үлдсэн төсөв.',
    budget: 'Төсөв',
    secured: 'Баталгаажсан',
    gap: 'Дутагдал',
    pledgedCol: 'Амласан',
    over: 'Төсвөөс хэтэрсэн',
    full: 'Бүрэн',
    gapView: 'Санхүүжилтийн дутагдал (төсөв − баталгаажсан)',
    gapPledged: 'амласан эх үүсвэр бүрэн орвол',
    flow: 'Хуримтлагдсан татан авалт ба зарцуулалт',
    flowPlanned: 'Төлөвлөсөн зарцуулалт',
    flowPaid: 'Бодит төлөлт',
    flowDrawn: 'Татан авсан санхүүжилт',
    flowNote: 'Татан авалт төлөлтөөс түрүүлж байх нь хэвийн; төлөлтөөс хоцорвол гүйцэтгэгчид төлбөр саатна.',
    requests: 'Татан авалтын хүсэлт',
    newRequest: 'Татан авалтын хүсэлт',
    requested: 'Хүсэлтийн огноо',
    purpose: 'Зориулалт',
    disbursedOn: 'Шилжүүлсэн огноо',
    reason: 'Татгалзах шалтгаан (заавал)',
    overSource: 'Эх үүсвэрийн үлдэгдлээс их байна',
    overAlloc: 'Энэ багцад хуваарилсан дүнгээс их байна',
    noAlloc: 'Энэ эх үүсвэрээс уг багцад хуваарилалт алга',
    pledgedNo: 'Амласан (гэрээгүй) эх үүсвэрээс татан авах боломжгүй',
    editSource: 'Эх үүсвэр засах',
    allocOf: 'Багцад хуваарилсан',
    allocSum: 'Хуваарилалтын нийлбэр эх үүсвэрийн дүнгээс их',
    drawdowns: 'Энэ эх үүсвэрийн татан авалт',
    perm: 'Засах эрх: төслийн менежер, админ',
    financeLink: 'Багцын төсөв, гэрээ, нэхэмжлэх → Багцын санхүү',
    unit: 'сая ₮',
  },
  en: {
    lead: 'Funding sources, committed amounts, drawdown requests, allocation to each package and the funding gap.',
    kind: { state: 'State budget', city: 'City budget', loan: 'Loan', ppp: 'PPP', donor: 'Donor / partner' },
    status: { committed: 'Committed', pledged: 'Pledged (not signed)' },
    draw: { requested: 'Requested', approved: 'Approved', disbursed: 'Disbursed', rejected: 'Rejected' },
    act: { approved: 'Approve', disbursed: 'Mark as disbursed', rejected: 'Reject', requested: '' },
    sources: 'Funding sources',
    source: 'Source',
    kindLabel: 'Kind',
    amount: 'Amount',
    amountMn: 'Amount (₮ mn)',
    allocated: 'Allocated',
    unallocated: 'Unallocated reserve',
    disbursed: 'Drawn down',
    pending: 'In progress',
    available: 'Remaining',
    ref: 'Agreement / decision',
    terms: 'Terms',
    kpiBudget: 'Total budget',
    kpiBudgetSub: 'Approved package budgets',
    kpiCommitted: 'Committed funding',
    kpiPledged: 'Pledged, not signed',
    kpiDisbursed: 'Drawn down',
    kpiQueue: 'Requests awaiting a decision',
    kpiGap: 'Funding gap',
    kpiGapSub: 'Budget − committed',
    alloc: 'Allocation to packages vs budget',
    allocLead: 'One column per source. The red part is budget with no committed source behind it.',
    budget: 'Budget',
    secured: 'Committed',
    gap: 'Gap',
    pledgedCol: 'Pledged',
    over: 'Over budget',
    full: 'Fully funded',
    gapView: 'Funding gap (budget − committed)',
    gapPledged: 'if the pledged sources come in',
    flow: 'Cumulative drawdown vs spend',
    flowPlanned: 'Planned spend',
    flowPaid: 'Actually paid',
    flowDrawn: 'Funds drawn down',
    flowNote: 'Drawdowns normally run ahead of payments; if they fall behind, contractors are paid late.',
    requests: 'Drawdown requests',
    newRequest: 'Drawdown request',
    requested: 'Requested on',
    purpose: 'Purpose',
    disbursedOn: 'Disbursed on',
    reason: 'Reason for rejecting (required)',
    overSource: 'More than the source has left',
    overAlloc: 'More than allocated to this package',
    noAlloc: 'This source has no allocation to this package',
    pledgedNo: 'A pledged (unsigned) source cannot be drawn down',
    editSource: 'Edit source',
    allocOf: 'Allocated to packages',
    allocSum: 'Allocations add up to more than the source',
    drawdowns: 'Drawdowns from this source',
    perm: 'May edit: project manager, admin',
    financeLink: 'Package budgets, contracts, invoices → Package finance',
    unit: '₮ mn',
  },
};

// the drawdown workflow
const STEPS: Record<DrawState, DrawState[]> = { requested: ['approved', 'rejected'], approved: ['disbursed', 'rejected'], disbursed: [], rejected: [] };
const DRAW_TONE: Record<DrawState, ReturnType<typeof toneOf>> = { requested: 'info', approved: 'warn', disbursed: 'good', rejected: 'bad' };
// one colour per source, used in the allocation bars and the legend
const COLORS = ['#60a5fa', '#a78bfa', '#7fa36a', '#93c5fd', '#2dd4bf', '#f472b6', '#94a3b8'];
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

type ReqForm = { source: string; pkg: string; amount: number; requested: string; purpose: string };

export default function Funding() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, user, can, log } = useStore();
  const [sources, setSources] = useExtra<FundingSource[]>('funding.sources', SOURCES);
  const [draws, setDraws] = useExtra<Drawdown[]>('funding.drawdowns', DRAWDOWNS);
  const [pkg, setPkg] = useState('all');
  const [state, setState] = useState<'all' | DrawState>('all');
  const [openDraw, setOpenDraw] = useState<string | null>(null);
  const [openSrc, setOpenSrc] = useState<string | null>(null);
  const [srcForm, setSrcForm] = useState<FundingSource | null>(null);
  const [form, setForm] = useState<ReqForm | null>(null);
  const [reason, setReason] = useState('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [msg, setMsg] = useState('');
  const now = today();
  const editable = can('funding.edit');
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const srcName = (id: string) => sources.find((s) => s.id === id)?.name ?? id;
  const color = (id: string) => COLORS[Math.max(0, sources.findIndex((s) => s.id === id)) % COLORS.length];

  if (!can('finance.view'))
    return (
      <div className="space-y-6">
        <PageHead title={t.section.funding} lead={w.lead} />
        <Forbidden />
      </div>
    );

  // per source: drawn, in progress (requested or approved), what is left to draw
  const drawn = (src: string, p?: string) => sum(draws.filter((d) => d.source === src && d.state === 'disbursed' && (!p || d.pkg === p)).map((d) => d.amount));
  const inFlight = (src: string, p?: string) => sum(draws.filter((d) => d.source === src && (d.state === 'requested' || d.state === 'approved') && (!p || d.pkg === p)).map((d) => d.amount));
  const committed = sources.filter((s) => s.status === 'committed');
  const pledged = sources.filter((s) => s.status === 'pledged');

  const pkgs = data.packages.filter((p) => pkg === 'all' || p.id === pkg);
  const pkgRows = pkgs.map((p) => {
    const secured = sum(committed.map((s) => s.alloc[p.id] ?? 0));
    const promised = sum(pledged.map((s) => s.alloc[p.id] ?? 0));
    return { p, secured, promised, gap: p.budget - secured };
  });
  const budget = sum(pkgRows.map((r) => r.p.budget));
  const securedAll = sum(pkgRows.map((r) => r.secured));
  const gapAll = sum(pkgRows.map((r) => Math.max(0, r.gap)));
  const pledgedAll = sum(pkgRows.map((r) => r.promised));
  const pkgIds = pkgs.map((p) => p.id);
  const drawnAll = sum(draws.filter((d) => d.state === 'disbursed' && pkgIds.includes(d.pkg)).map((d) => d.amount));
  const queue = draws.filter((d) => (d.state === 'requested' || d.state === 'approved') && pkgIds.includes(d.pkg));

  // cumulative drawdown beside the planned spend and the payments, month by month
  const flow = cashflow(data, pkgIds);
  const done = draws.filter((d) => d.state === 'disbursed' && d.disbursedOn && pkgIds.includes(d.pkg));
  const drawnBy = (month: string) => sum(done.filter((d) => d.disbursedOn!.slice(0, 7) <= month).map((d) => d.amount));
  const m = money(data, pkgIds);

  const list = draws.filter((d) => (pkg === 'all' || d.pkg === pkg) && (state === 'all' || d.state === state)).sort((a, b) => b.requested.localeCompare(a.requested));
  const dd = openDraw ? draws.find((d) => d.id === openDraw) ?? null : null;
  const src = openSrc ? sources.find((s) => s.id === openSrc) ?? null : null;

  const step = (d: Drawdown, to: DrawState) => {
    if (to === 'rejected' && !reason.trim()) {
      setProblems([{ field: 'comment', code: 'required' }]);
      return;
    }
    if (!log('funding.edit', d.id, `${d.state} → ${to}`)) {
      setProblems([{ field: 'role', code: 'forbidden' }]);
      return;
    }
    setDraws((prev) =>
      prev.map((x) =>
        x.id === d.id ? { ...x, state: to, disbursedOn: to === 'disbursed' ? now : x.disbursedOn, history: [...x.history, { at: now, by: user, action: to, comment: to === 'rejected' ? reason.trim() : undefined }] } : x,
      ),
    );
    setProblems([]);
    setReason('');
  };

  const submit = () => {
    if (!form) return;
    const list: Problem[] = [];
    let note = '';
    const s = sources.find((x) => x.id === form.source);
    if (!s || !form.pkg) list.push({ field: 'source', code: 'required' });
    if (!form.purpose.trim()) list.push({ field: 'purpose', code: 'required' });
    if (!(form.amount > 0)) list.push({ field: 'amount', code: 'range' });
    else if (s) {
      // a request may not take more than the source has left, nor more than it gives this package
      const left = s.amount - drawn(s.id) - inFlight(s.id);
      const pkgLeft = (s.alloc[form.pkg] ?? 0) - drawn(s.id, form.pkg) - inFlight(s.id, form.pkg);
      if (s.status === 'pledged') note = w.pledgedNo;
      else if (!s.alloc[form.pkg]) note = w.noAlloc;
      else if (form.amount > left) note = w.overSource;
      else if (form.amount > pkgLeft) note = w.overAlloc;
      if (note) list.push({ field: 'amount', code: 'range' });
    }
    setMsg(note);
    setProblems(list);
    if (list.length) return;
    const id = nextId('DD', draws.map((d) => d.id));
    if (!log('funding.edit', id, `requested ${form.amount} · ${form.source} → ${form.pkg}`)) {
      setProblems([{ field: 'role', code: 'forbidden' }]);
      return;
    }
    setDraws((prev) => [...prev, { id, source: form.source, pkg: form.pkg, amount: form.amount, requested: form.requested, purpose: form.purpose.trim(), state: 'requested', history: [{ at: now, by: user, action: 'requested' }] }]);
    setForm(null);
  };

  const saveSource = () => {
    if (!srcForm) return;
    const list: Problem[] = [];
    let note = '';
    if (!srcForm.name.trim()) list.push({ field: 'name', code: 'required' });
    if (!(srcForm.amount > 0)) list.push({ field: 'amount', code: 'range' });
    if (sum(Object.values(srcForm.alloc)) > srcForm.amount) {
      list.push({ field: 'alloc', code: 'range' });
      note = w.allocSum;
    }
    setMsg(note);
    setProblems(list);
    if (list.length) return;
    if (!log('funding.edit', srcForm.id, `${srcForm.status} · ${srcForm.amount}`)) {
      setProblems([{ field: 'role', code: 'forbidden' }]);
      return;
    }
    const alloc = Object.fromEntries(Object.entries(srcForm.alloc).filter(([, v]) => v > 0));
    setSources((prev) => prev.map((s) => (s.id === srcForm.id ? { ...srcForm, name: srcForm.name.trim(), alloc } : s)));
    setSrcForm(null);
  };

  const close = () => {
    setOpenDraw(null);
    setOpenSrc(null);
    setProblems([]);
    setReason('');
    setMsg('');
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.funding}
        lead={w.lead}
        action={
          <div className="flex flex-wrap items-end gap-2">
            <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, p.id])]} />
            {editable && (
              <Btn
                kind="primary"
                onClick={() => {
                  setProblems([]);
                  setMsg('');
                  const p = pkg === 'all' ? data.packages[0]?.id ?? '' : pkg;
                  setForm({ source: committed.find((s) => s.alloc[p])?.id ?? committed[0]?.id ?? '', pkg: p, amount: 0, requested: now, purpose: '' });
                }}
              >
                + {w.newRequest}
              </Btn>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={w.kpiBudget} value={tug(budget, en)} sub={w.kpiBudgetSub} />
        <Kpi label={w.kpiCommitted} value={tug(securedAll, en)} sub={pct(budget ? (securedAll / budget) * 100 : null)} tone="good" />
        <Kpi label={w.kpiPledged} value={tug(pledgedAll, en)} />
        <Kpi label={w.kpiDisbursed} value={tug(drawnAll, en)} sub={pct(securedAll ? (drawnAll / securedAll) * 100 : null)} />
        <Kpi label={w.kpiQueue} value={queue.length} sub={tug(sum(queue.map((d) => d.amount)), en)} tone={queue.length ? 'warn' : 'neutral'} />
        <Kpi label={w.kpiGap} value={tug(gapAll, en)} sub={w.kpiGapSub} tone={gapAll > 0 ? 'bad' : 'good'} />
      </div>
      <p className="text-xs text-mute">
        <Link href="/construction/finance" className="text-accent-hi hover:underline">
          {w.financeLink} →
        </Link>
        {!editable && <span className="ml-3">🔒 {w.perm}</span>}
      </p>

      <Panel title={w.sources}>
        <Table head={['ID', w.source, w.kindLabel, t.common.status, w.amount, w.allocated, w.disbursed, w.pending, w.available, '']} empty={!sources.length}>
          {sources.map((s) => {
            const a = sum(Object.values(s.alloc));
            const dr = drawn(s.id);
            const fl = inFlight(s.id);
            const used = s.amount ? (dr / s.amount) * 100 : 0;
            return (
              <tr key={s.id} className="cursor-pointer hover:bg-surface/50" onClick={() => (setOpenSrc(s.id), setProblems([]))}>
                <td className="px-2 py-2 font-mono text-xs text-mute">
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: color(s.id) }} />
                  {s.id}
                </td>
                <td className="px-2 py-2">
                  <p className="text-fg/90">{s.name}</p>
                  <p className="text-[11px] text-mute">{s.ref}</p>
                </td>
                <td className="px-2 py-2 text-xs">{w.kind[s.kind]}</td>
                <td className="px-2 py-2">
                  <Pill tone={s.status === 'committed' ? 'good' : 'warn'}>{w.status[s.status]}</Pill>
                </td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">{tug(s.amount, en)}</td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">
                  {tug(a, en)}
                  {a < s.amount && <span className="block text-[10px] text-mute">+{tug(s.amount - a, en)}</span>}
                </td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">
                  {tug(dr, en)}
                  <div className="mt-1 h-1 w-20 rounded-full bg-line">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, used)}%` }} />
                  </div>
                </td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">{fl ? tug(fl, en) : '—'}</td>
                <td className="px-2 py-2 font-mono text-xs tabular-nums">{tug(s.amount - dr - fl, en)}</td>
                <td className="px-2 py-2 text-right text-xs text-mute">{t.common.details} →</td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={w.alloc}>
          <p className="mb-3 text-xs text-mute">{w.allocLead}</p>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-mute">
                  <th scope="col" className="px-2 py-2 font-normal">
                    {t.common.package}
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-normal">
                    {w.budget}
                  </th>
                  {sources.map((s) => (
                    <th key={s.id} scope="col" className="px-2 py-2 text-right font-normal" title={s.name}>
                      <span className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: color(s.id) }} />
                      {s.id}
                      {s.status === 'pledged' && '*'}
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-2 text-right font-normal">
                    {w.gap}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {pkgRows.map(({ p, gap }) => (
                  <tr key={p.id}>
                    <th scope="row" className="px-2 py-2 text-left font-normal">
                      <span className="font-mono text-xs">{p.id}</span>
                      <span className="block max-w-[180px] truncate text-[11px] text-mute">{p.name}</span>
                    </th>
                    <td className="px-2 py-2 text-right font-mono text-xs tabular-nums">{tug(p.budget, en)}</td>
                    {sources.map((s) => (
                      <td key={s.id} className={`px-2 py-2 text-right font-mono text-xs tabular-nums ${s.status === 'pledged' ? 'text-mute italic' : ''}`}>
                        {s.alloc[p.id] ? tug(s.alloc[p.id], en) : '—'}
                      </td>
                    ))}
                    <td className={`px-2 py-2 text-right font-mono text-xs tabular-nums ${gap > 0 ? 'text-red-700' : gap < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {gap > 0 ? tug(gap, en) : gap < 0 ? `${w.over} ${tug(-gap, en)}` : w.full}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pledged.length > 0 && <p className="mt-2 text-[11px] text-mute">* {w.status.pledged}</p>}
        </Panel>

        <Panel title={w.gapView}>
          <div className="space-y-4">
            {pkgRows.map(({ p, gap, promised }) => {
              const top = Math.max(p.budget, p.budget - gap);
              return (
                <div key={p.id} className="text-xs">
                  <div className="mb-1 flex justify-between gap-2">
                    <span className="font-mono">{p.id}</span>
                    <span className={`font-mono tabular-nums ${gap > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{gap > 0 ? `−${tug(gap, en)}` : w.full}</span>
                  </div>
                  {/* stacked: each committed source's share of the budget, then the uncovered rest */}
                  <div className="flex h-3 overflow-hidden rounded-full bg-line" role="img" aria-label={`${p.id}: ${w.secured} ${tug(p.budget - gap, en)} / ${w.budget} ${tug(p.budget, en)}`}>
                    {committed.map((s) =>
                      s.alloc[p.id] ? <div key={s.id} title={`${s.name}: ${tug(s.alloc[p.id], en)}`} style={{ width: `${(s.alloc[p.id] / top) * 100}%`, background: color(s.id) }} /> : null,
                    )}
                    {gap > 0 && <div className="bg-red-500/70" style={{ width: `${(gap / top) * 100}%` }} title={`${w.gap}: ${tug(gap, en)}`} />}
                  </div>
                  {gap > 0 && promised > 0 && (
                    <p className="mt-1 text-[11px] text-mute">
                      {w.pledgedCol} {tug(promised, en)} — {w.gapPledged}: <span className="font-mono">{gap - promised > 0 ? `−${tug(gap - promised, en)}` : w.full}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
            {committed.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: color(s.id) }} />
                {s.name}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-red-500/70" />
              {w.gap}
            </span>
          </div>
        </Panel>
      </div>

      <Panel title={w.flow}>
        {flow.length ? (
          <LineChart
            labels={flow.map((f) => f.month)}
            unit={w.unit}
            series={[
              { name: w.flowPlanned, color: '#60a5fa', values: flow.map((f) => Math.round(f.planned)), dashed: true },
              { name: w.flowPaid, color: '#7fa36a', values: flow.map((f) => f.paid) },
              { name: w.flowDrawn, color: '#7dd3fc', values: flow.map((f) => (f.paid == null ? null : drawnBy(f.month))) },
            ]}
          />
        ) : (
          <p className="py-6 text-center text-sm text-mute">{t.common.none}</p>
        )}
        <p className="mt-2 text-xs text-mute">
          {w.flowNote} {w.flowPaid}: <span className="font-mono text-fg/85">{tug(m.paid, en)}</span> · {w.flowDrawn}: <span className="font-mono text-fg/85">{tug(drawnAll, en)}</span>
        </p>
      </Panel>

      <Panel
        title={w.requests}
        action={<Select label={t.filter.status} value={state} onChange={setState} options={[['all', t.filter.all], ...(Object.keys(w.draw) as DrawState[]).map((s): [DrawState, string] => [s, w.draw[s]])]} />}
      >
        <Table head={['ID', w.requested, w.source, t.common.package, w.purpose, w.amount, t.common.status]} empty={!list.length}>
          {list.map((d) => (
            <tr key={d.id} className="cursor-pointer hover:bg-surface/50" onClick={() => (setOpenDraw(d.id), setProblems([]), setReason(''))}>
              <td className="px-2 py-2 font-mono text-xs text-mute">{d.id}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{d.requested}</td>
              <td className="px-2 py-2 text-xs">{srcName(d.source)}</td>
              <td className="px-2 py-2 font-mono text-xs">{d.pkg}</td>
              <td className="px-2 py-2 text-xs text-mute">{d.purpose}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{tug(d.amount, en)}</td>
              <td className="px-2 py-2">
                <Pill tone={DRAW_TONE[d.state]}>{w.draw[d.state]}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      {/* a drawdown: its details, the next steps, its history */}
      <Drawer open={!!dd} onClose={close} title={dd ? `${dd.id} · ${tug(dd.amount, en)}` : ''}>
        {dd && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={DRAW_TONE[dd.state]}>{w.draw[dd.state]}</Pill>
              <span className="font-mono text-xs text-mute">{dd.requested}</span>
              {dd.disbursedOn && <span className="font-mono text-xs text-mute">→ {dd.disbursedOn}</span>}
            </div>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.source}</dt>
                <dd className="text-right">{srcName(dd.source)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{t.common.package}</dt>
                <dd className="text-right">
                  {dd.pkg} · {data.packages.find((p) => p.id === dd.pkg)?.name}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.purpose}</dt>
                <dd className="text-right">{dd.purpose}</dd>
              </div>
            </dl>
            {STEPS[dd.state].length > 0 &&
              (editable ? (
                <div className="space-y-2 rounded-xl border border-line p-3">
                  <Field label={w.reason}>
                    <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {STEPS[dd.state].map((to) => (
                      <Btn key={to} kind={to === 'rejected' ? 'danger' : 'primary'} onClick={() => step(dd, to)}>
                        {w.act[to]}
                      </Btn>
                    ))}
                  </div>
                  <Problems list={problems} />
                </div>
              ) : (
                <Forbidden />
              ))}
            <div>
              <p className="mb-2 text-xs text-mute">{t.common.history}</p>
              <History items={dd.history} name={name} />
            </div>
          </div>
        )}
      </Drawer>

      {/* a source: terms, allocation, drawdowns */}
      <Drawer open={!!src} onClose={close} title={src ? `${src.id} · ${src.name}` : ''}>
        {src && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={src.status === 'committed' ? 'good' : 'warn'}>{w.status[src.status]}</Pill>
              <Pill>{w.kind[src.kind]}</Pill>
            </div>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.amount}</dt>
                <dd className="font-mono">{tug(src.amount, en)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.ref}</dt>
                <dd className="font-mono">{src.ref}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.terms}</dt>
                <dd className="text-right">{src.terms}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.disbursed}</dt>
                <dd className="font-mono">{tug(drawn(src.id), en)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.available}</dt>
                <dd className="font-mono">{tug(src.amount - drawn(src.id) - inFlight(src.id), en)}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs text-mute">{w.allocOf}</p>
              <ul className="space-y-2 text-xs">
                {Object.entries(src.alloc).map(([p, v]) => (
                  <li key={p}>
                    <div className="flex justify-between gap-3">
                      <span className="font-mono">{p}</span>
                      <span className="font-mono tabular-nums">
                        {tug(drawn(src.id, p), en)} / {tug(v, en)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-line">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (drawn(src.id, p) / v) * 100)}%`, background: color(src.id) }} />
                    </div>
                  </li>
                ))}
                {sum(Object.values(src.alloc)) < src.amount && (
                  <li className="text-mute">
                    {w.unallocated}: <span className="font-mono">{tug(src.amount - sum(Object.values(src.alloc)), en)}</span>
                  </li>
                )}
              </ul>
            </div>
            {editable ? (
              <Btn
                kind="primary"
                onClick={() => {
                  setProblems([]);
                  setMsg('');
                  setSrcForm({ ...src, alloc: { ...src.alloc } });
                  setOpenSrc(null);
                }}
              >
                {w.editSource}
              </Btn>
            ) : (
              <Forbidden />
            )}
            <div>
              <p className="mb-2 text-xs text-mute">{w.drawdowns}</p>
              <ul className="divide-y divide-line/60 text-xs">
                {draws
                  .filter((d) => d.source === src.id)
                  .map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => (setOpenSrc(null), setOpenDraw(d.id))} className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 py-1.5 text-left hover:text-fg">
                        <span>
                          <span className="font-mono text-mute">{d.id}</span> {d.pkg} · <span className="font-mono">{d.requested}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{tug(d.amount, en)}</span>
                          <Pill tone={DRAW_TONE[d.state]}>{w.draw[d.state]}</Pill>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={!!srcForm} onClose={() => setSrcForm(null)} title={srcForm ? `${w.editSource} · ${srcForm.id}` : ''}>
        {srcForm && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveSource();
            }}
          >
            <Field label={w.source}>
              <input className={inputCls} value={srcForm.name} onChange={(e) => setSrcForm({ ...srcForm, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.kindLabel}>
                <select className={inputCls} value={srcForm.kind} onChange={(e) => setSrcForm({ ...srcForm, kind: e.target.value as SourceKind })}>
                  {(Object.keys(w.kind) as SourceKind[]).map((k) => (
                    <option key={k} value={k}>
                      {w.kind[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.common.status}>
                <select className={inputCls} value={srcForm.status} onChange={(e) => setSrcForm({ ...srcForm, status: e.target.value as SourceStatus })}>
                  {(Object.keys(w.status) as SourceStatus[]).map((k) => (
                    <option key={k} value={k}>
                      {w.status[k]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.amountMn}>
                <input type="number" min={0} step="any" className={inputCls} value={srcForm.amount} onChange={(e) => setSrcForm({ ...srcForm, amount: Number(e.target.value) })} />
              </Field>
              <Field label={w.ref}>
                <input className={inputCls} value={srcForm.ref} onChange={(e) => setSrcForm({ ...srcForm, ref: e.target.value })} />
              </Field>
            </div>
            <Field label={w.terms}>
              <input className={inputCls} value={srcForm.terms} onChange={(e) => setSrcForm({ ...srcForm, terms: e.target.value })} />
            </Field>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs text-mute">
                {w.allocOf} ({w.unit})
              </legend>
              {data.packages.map((p) => (
                <label key={p.id} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 text-xs">
                  <span className="truncate">
                    <span className="font-mono">{p.id}</span> <span className="text-mute">· {w.budget} {tug(p.budget, en)}</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className={inputCls}
                    value={srcForm.alloc[p.id] ?? 0}
                    onChange={(e) => setSrcForm({ ...srcForm, alloc: { ...srcForm.alloc, [p.id]: Number(e.target.value) } })}
                  />
                </label>
              ))}
              <p className="text-xs text-mute">
                Σ <span className="font-mono text-fg">{tug(sum(Object.values(srcForm.alloc)), en)}</span> / {tug(srcForm.amount, en)}
              </p>
            </fieldset>
            {msg && <p className="text-xs text-red-700">{msg}</p>}
            <Problems list={problems} />
            <div className="flex gap-2">
              <Btn kind="primary" type="submit">
                {t.common.save}
              </Btn>
              <Btn onClick={() => setSrcForm(null)}>{t.common.cancel}</Btn>
            </div>
          </form>
        )}
      </Drawer>

      <Drawer open={!!form} onClose={() => setForm(null)} title={w.newRequest}>
        {form && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Field label={t.common.package}>
              <select className={inputCls} value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })}>
                {data.packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={w.source}>
              <select className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {sources.map((s) => {
                  const left = (s.alloc[form.pkg] ?? 0) - drawn(s.id, form.pkg) - inFlight(s.id, form.pkg);
                  return (
                    <option key={s.id} value={s.id} disabled={s.status === 'pledged' || !s.alloc[form.pkg]}>
                      {s.name} · {w.available} {tug(Math.max(0, left), en)}
                    </option>
                  );
                })}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.amountMn}>
                <input type="number" min={0} step="any" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </Field>
              <Field label={w.requested}>
                <input type="date" className={inputCls} value={form.requested} onChange={(e) => setForm({ ...form, requested: e.target.value })} />
              </Field>
            </div>
            <Field label={w.purpose}>
              <input className={inputCls} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </Field>
            {msg && <p className="text-xs text-red-700">{msg}</p>}
            <Problems list={problems} />
            <div className="flex gap-2">
              <Btn kind="primary" type="submit">
                {t.common.save}
              </Btn>
              <Btn onClick={() => setForm(null)}>{t.common.cancel}</Btn>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
