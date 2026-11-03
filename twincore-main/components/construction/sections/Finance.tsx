'use client';

import { useState } from 'react';
import { cashflow, money, packageProgress, pct, today, tug } from '@/lib/construction/calc';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { Data, Invoice, InvoiceState } from '@/lib/construction/types';
import type { Problem } from '@/lib/construction/validate';
import { LineChart } from '../Charts';
import { Btn, Drawer, Field, Forbidden, History, inputCls, Kpi, Panel, PageHead, Pill, Problems, Select, Table, toneOf } from '../Kit';
import { nextId, useStore } from '../Store';

// Санхүүжилт: the money of each package, kept apart step by step — the approved budget, what contracts commit, what
// contractors invoice, what is approved for payment, and what has actually been paid — set against the physical
// progress the money is meant to buy. A value that doesn't exist yet (no contract) shows as "—", never as zero.

const W = {
  mn: {
    lead: 'Төсөв, гэрээ, нэхэмжлэх, батлагдсан төлбөр, бодит төлөлтийг тусад нь, биет гүйцэтгэлтэй уялдуулан хянана.',
    budget: 'Батлагдсан төсөв',
    budgetDef: 'Багц бүрт батлагдсан хөрөнгө',
    committed: 'Гэрээгээр үүрэг болсон',
    committedDef: 'Байгуулсан гэрээний нийт дүн',
    invoiced: 'Ирүүлсэн нэхэмжлэх',
    invoicedDef: 'Гүйцэтгэгчийн ирүүлсэн (буцаагдсанаас бусад)',
    approvedPay: 'Батлагдсан төлбөр',
    approvedDef: 'Төлөхөөр батлагдсан ба төлөгдсөн',
    paid: 'Бодит төлөлт',
    paidDef: 'Дансаар шилжсэн мөнгө',
    plannedToDate: 'Өнөөдрийг хүртэлх төлөвлөсөн санхүүжилт',
    byPkg: 'Багц бүрээр',
    physical: 'Биет гүйцэтгэл',
    paidPct: 'Төлөлт / төсөв',
    ahead: 'Төлбөр гүйцэтгэлээс түрүүлсэн',
    flow: 'Төлөвлөсөн ба бодит санхүүжилт (хуримтлагдсан)',
    planned: 'Төлөвлөсөн',
    actual: 'Бодит төлөлт',
    invoices: 'Нэхэмжлэх, төлбөр',
    contract: 'Гэрээ',
    milestone: 'Төлбөрийн үе шат',
    amount: 'Дүн (сая ₮)',
    newInvoice: 'Нэхэмжлэх бүртгэх',
    milestones: 'Гэрээний төлбөрийн үе шат',
    unpaid: 'Төлөгдөөгүй, хугацаа хэтэрсэн',
    act: { approved: 'Батлах', rejected: 'Буцаах', paid: 'Төлсөн гэж тэмдэглэх', submitted: 'Дахин илгээх' } as Record<InvoiceState, string>,
    reason: 'Буцаах шалтгаан (заавал)',
    noMilestone: 'Үе шатгүй',
    note: 'Тэмдэглэл: «—» нь мэдээлэл байхгүйг заана (жишээ нь гэрээ байгуулагдаагүй багц), тэг биш.',
  },
  en: {
    lead: 'Budget, contracts, invoices, approved payments and actual payments, kept apart and set against physical progress.',
    budget: 'Approved budget',
    budgetDef: 'Funds approved for each package',
    committed: 'Committed by contract',
    committedDef: 'Total of signed contracts',
    invoiced: 'Invoiced',
    invoicedDef: 'Submitted by contractors (excluding rejected)',
    approvedPay: 'Approved for payment',
    approvedDef: 'Approved and paid',
    paid: 'Actually paid',
    paidDef: 'Money transferred',
    plannedToDate: 'Planned financing to date',
    byPkg: 'By package',
    physical: 'Physical progress',
    paidPct: 'Paid / budget',
    ahead: 'Payments ahead of progress',
    flow: 'Planned vs actual financing (cumulative)',
    planned: 'Planned',
    actual: 'Actually paid',
    invoices: 'Invoices and payments',
    contract: 'Contract',
    milestone: 'Payment milestone',
    amount: 'Amount (₮ mn)',
    newInvoice: 'Record an invoice',
    milestones: 'Contract payment milestones',
    unpaid: 'Unpaid and overdue',
    act: { approved: 'Approve', rejected: 'Reject', paid: 'Mark as paid', submitted: 'Resubmit' },
    reason: 'Reason for rejecting (required)',
    noMilestone: 'No milestone',
    note: 'Note: “—” means not available (for example a package with no contract yet), not zero.',
  },
};

// the payment workflow
const STEPS: Record<InvoiceState, InvoiceState[]> = { submitted: ['approved', 'rejected'], approved: ['paid'], rejected: [], paid: [] };

export default function Finance() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, user, can, change } = useStore();
  const [pkg, setPkg] = useState('all');
  const [state, setState] = useState<'all' | InvoiceState>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [form, setForm] = useState<{ contract: string; milestone: string; amount: number; date: string } | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const now = today();
  const pkgs = pkg === 'all' ? undefined : [pkg];
  const m = money(data, pkgs);
  const flow = cashflow(data, pkgs);
  const contractOf = (id: string) => data.contracts.find((c) => c.id === id);
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? data.orgs.find((o) => o.id === id)?.name ?? id;
  const visible = can('finance.view');

  const invoices = data.invoices
    .filter((i) => (pkg === 'all' || contractOf(i.contract)?.pkg === pkg) && (state === 'all' || i.state === state))
    .sort((a, b) => b.date.localeCompare(a.date));
  const inv = open ? data.invoices.find((i) => i.id === open) : null;

  const step = (i: Invoice, to: InvoiceState) => {
    if (to === 'rejected' && !reason.trim()) {
      setProblems([{ field: 'comment', code: 'required' }]);
      return;
    }
    const ok = change('invoice.review', i.id, `${i.state} → ${to}`, (d: Data) => {
      const x = d.invoices.find((v) => v.id === i.id)!;
      x.state = to;
      if (to === 'paid') x.paidOn = now;
      x.history.push({ at: now, by: user, action: to, comment: to === 'rejected' ? reason.trim() : undefined });
    });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else {
      setProblems([]);
      setReason('');
    }
  };
  const submit = () => {
    if (!form) return;
    const list: Problem[] = [];
    if (!form.contract) list.push({ field: 'contract', code: 'required' });
    if (!(form.amount > 0)) list.push({ field: 'amount', code: 'range' });
    if (!form.date) list.push({ field: 'date', code: 'required' });
    setProblems(list);
    if (list.length) return;
    const id = nextId('IN', data.invoices.map((i) => i.id));
    const ok = change('invoice.submit', id, 'submitted', (d: Data) => {
      d.invoices.push({ id, contract: form.contract, milestone: form.milestone || null, amount: form.amount, date: form.date, state: 'submitted', history: [{ at: now, by: user, action: 'submitted' }] });
    });
    if (!ok) setProblems([{ field: 'role', code: 'forbidden' }]);
    else setForm(null);
  };

  if (!visible)
    return (
      <div className="space-y-6">
        <PageHead title={t.section.finance} lead={w.lead} />
        <Forbidden />
      </div>
    );

  // per package: each money step on its own, and the physical progress the money is buying
  const rows = data.packages
    .filter((p) => pkg === 'all' || p.id === pkg)
    .map((p) => {
      const pm = money(data, [p.id]);
      const prog = packageProgress(data, p.id).approved;
      const paidPct = p.budget ? (pm.paid / p.budget) * 100 : null;
      return { p, pm, prog, paidPct, ahead: pm.hasContract && paidPct != null && paidPct - prog > 10 };
    });

  return (
    <div className="space-y-6">
      <PageHead
        title={t.section.finance}
        lead={w.lead}
        action={
          <div className="flex flex-wrap items-end gap-2">
            <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p): [string, string] => [p.id, p.id])]} />
            {can('invoice.submit') && (
              <Btn
                kind="primary"
                onClick={() => {
                  setProblems([]);
                  const c = data.contracts.find((x) => pkg === 'all' || x.pkg === pkg);
                  setForm({ contract: c?.id ?? '', milestone: '', amount: 0, date: now });
                }}
              >
                + {w.newInvoice}
              </Btn>
            )}
          </div>
        }
      />

      {/* the five money steps, never added together */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={w.budget} value={tug(m.budget, en)} sub={w.budgetDef} />
        <Kpi label={w.committed} value={m.hasContract ? tug(m.committed, en) : '—'} sub={w.committedDef} />
        <Kpi label={w.invoiced} value={m.hasContract ? tug(m.invoiced, en) : '—'} sub={w.invoicedDef} />
        <Kpi label={w.approvedPay} value={m.hasContract ? tug(m.approved, en) : '—'} sub={w.approvedDef} />
        <Kpi label={w.paid} value={m.hasContract ? tug(m.paid, en) : '—'} sub={w.paidDef} tone="good" />
      </div>
      <p className="text-xs text-mute">
        {w.plannedToDate}: <span className="font-mono text-fg/85">{tug(m.plannedToDate, en)}</span> · {w.note}
      </p>

      <Panel title={w.byPkg}>
        <Table head={[t.common.package, w.budget, w.committed, w.invoiced, w.approvedPay, w.paid, w.paidPct, w.physical, '']} empty={!rows.length}>
          {rows.map(({ p, pm, prog, paidPct, ahead }) => (
            <tr key={p.id}>
              <td className="px-2 py-2">
                <span className="font-mono text-[10px] text-mute">{p.id}</span> <span className="text-fg/90">{p.name}</span>
              </td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{tug(p.budget, en)}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{pm.hasContract ? tug(pm.committed, en) : '—'}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{pm.hasContract ? tug(pm.invoiced, en) : '—'}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{pm.hasContract ? tug(pm.approved, en) : '—'}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{pm.hasContract ? tug(pm.paid, en) : '—'}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{pm.hasContract ? pct(paidPct) : '—'}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{pct(prog)}</td>
              <td className="px-2 py-2 text-right">{ahead && <Pill tone="warn">{w.ahead}</Pill>}</td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title={w.flow}>
        {flow.length ? (
          <LineChart
            labels={flow.map((f) => f.month)}
            unit={en ? '₮ mn' : 'сая ₮'}
            series={[
              { name: w.planned, color: '#60a5fa', values: flow.map((f) => Math.round(f.planned)), dashed: true },
              { name: w.actual, color: '#7fa36a', values: flow.map((f) => f.paid) },
            ]}
          />
        ) : (
          <p className="py-6 text-center text-sm text-mute">{t.common.none}</p>
        )}
      </Panel>

      <Panel
        title={w.invoices}
        action={
          <Select
            label={t.filter.status}
            value={state}
            onChange={setState}
            options={[['all', t.filter.all], ...(['submitted', 'approved', 'rejected', 'paid'] as InvoiceState[]).map((s): [InvoiceState, string] => [s, t.invoiceState[s]])]}
          />
        }
      >
        <Table head={['ID', t.common.date, w.contract, w.milestone, w.amount, t.common.status]} empty={!invoices.length}>
          {invoices.map((i) => (
            <tr key={i.id} className="cursor-pointer hover:bg-surface/50" onClick={() => setOpen(i.id)}>
              <td className="px-2 py-2 font-mono text-xs text-mute">{i.id}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{i.date}</td>
              <td className="px-2 py-2 text-xs">
                {i.contract} · {contractOf(i.contract)?.title}
              </td>
              <td className="px-2 py-2 text-xs text-mute">{data.milestones.find((x) => x.id === i.milestone)?.name ?? w.noMilestone}</td>
              <td className="px-2 py-2 font-mono text-xs tabular-nums">{tug(i.amount, en)}</td>
              <td className="px-2 py-2">
                <Pill tone={toneOf(i.state)}>{t.invoiceState[i.state]}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title={w.milestones}>
        <Table head={[w.contract, w.milestone, t.common.due, w.amount, t.common.status]} empty={!data.milestones.length}>
          {data.milestones
            .filter((ms) => pkg === 'all' || contractOf(ms.contract)?.pkg === pkg)
            .map((ms) => {
              const billed = data.invoices.filter((i) => i.milestone === ms.id && i.state !== 'rejected');
              const paid = billed.some((i) => i.state === 'paid');
              const late = !paid && ms.due < now;
              const st = paid ? 'paid' : billed.length ? billed[billed.length - 1].state : null;
              return (
                <tr key={ms.id}>
                  <td className="px-2 py-2 text-xs">
                    {ms.contract} · {contractOf(ms.contract)?.title}
                  </td>
                  <td className="px-2 py-2">{ms.name}</td>
                  <td className={`px-2 py-2 font-mono text-xs tabular-nums ${late ? 'text-red-700' : ''}`}>{ms.due}</td>
                  <td className="px-2 py-2 font-mono text-xs tabular-nums">{tug(ms.amount, en)}</td>
                  <td className="space-x-1 px-2 py-2">
                    {st ? <Pill tone={toneOf(st)}>{t.invoiceState[st]}</Pill> : <Pill>{t.common.unavailable}</Pill>}
                    {late && <Pill tone="bad">{w.unpaid}</Pill>}
                  </td>
                </tr>
              );
            })}
        </Table>
      </Panel>

      <Drawer
        open={!!inv}
        onClose={() => {
          setOpen(null);
          setProblems([]);
          setReason('');
        }}
        title={inv ? `${inv.id} · ${tug(inv.amount, en)}` : ''}
      >
        {inv && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={toneOf(inv.state)}>{t.invoiceState[inv.state]}</Pill>
              <span className="font-mono text-xs text-mute">{inv.date}</span>
              {inv.paidOn && <span className="font-mono text-xs text-mute">→ {inv.paidOn}</span>}
            </div>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.contract}</dt>
                <dd>
                  {inv.contract} · {contractOf(inv.contract)?.title}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{t.common.owner}</dt>
                <dd>{name(contractOf(inv.contract)?.org ?? '')}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">{w.milestone}</dt>
                <dd>{data.milestones.find((x) => x.id === inv.milestone)?.name ?? w.noMilestone}</dd>
              </div>
            </dl>
            {STEPS[inv.state].length > 0 &&
              (can('invoice.review') ? (
                <div className="space-y-2 rounded-xl border border-line p-3">
                  {STEPS[inv.state].includes('rejected') && (
                    <Field label={w.reason}>
                      <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
                    </Field>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {STEPS[inv.state].map((to) => (
                      <Btn key={to} kind={to === 'rejected' ? 'danger' : 'primary'} onClick={() => step(inv, to)}>
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
              <History items={inv.history} name={name} />
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={!!form} onClose={() => setForm(null)} title={w.newInvoice}>
        {form && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Field label={w.contract}>
              <select className={inputCls} value={form.contract} onChange={(e) => setForm({ ...form, contract: e.target.value, milestone: '' })}>
                {data.contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} · {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={w.milestone}>
              <select className={inputCls} value={form.milestone} onChange={(e) => setForm({ ...form, milestone: e.target.value, amount: data.milestones.find((x) => x.id === e.target.value)?.amount ?? form.amount })}>
                <option value="">{w.noMilestone}</option>
                {data.milestones
                  .filter((x) => x.contract === form.contract)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {tug(x.amount, en)}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={w.amount}>
                <input type="number" min={0} step="any" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </Field>
              <Field label={t.common.date}>
                <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
            </div>
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
