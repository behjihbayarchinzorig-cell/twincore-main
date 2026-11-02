'use client';

import { useMemo, useState } from 'react';
import { isOverdue, money, overdueIssue, packageProgress, pct, permitWarning, projectProgress, today, tug, variance } from '@/lib/construction/calc';
import { useEn, useText, useWords } from '@/lib/construction/text';
import type { Data } from '@/lib/construction/types';
import { useStore } from '../Store';
import { Btn, PageHead, Panel, Pill, Select, Loading } from '../Kit';

// Reports built from the records in the workspace, with the same calculation rules as the dashboard
// (lib/construction/calc.ts). Filters: package and reporting period. Exports are the ones that genuinely work here:
// CSV (downloaded from this browser) and print / save as PDF through the browser's own print dialog.

type Kind = 'progress' | 'schedule' | 'packages' | 'finance' | 'quality' | 'safety' | 'land' | 'permits' | 'infra' | 'esg';
const KINDS: Kind[] = ['progress', 'schedule', 'packages', 'finance', 'quality', 'safety', 'land', 'permits', 'infra', 'esg'];

const W = {
  mn: {
    lead: 'Системд хадгалагдсан бүртгэлээс, дашбоардтай ижил тооцооны дүрмээр бэлтгэнэ. Энд байгаа нь жишээ өгөгдөл дээрх тайлан — бодит төслийн үр дүн биш.',
    kind: {
      progress: 'Төлөвлөгөө ба гүйцэтгэл',
      schedule: 'Хуваарийн хазайлт',
      packages: 'Багцын гүйцэтгэл',
      finance: 'Санхүүгийн гүйцэтгэл',
      quality: 'Чанарын гэмтэл, засварлах арга хэмжээ',
      safety: 'ХАБЭА тохиолдол, арга хэмжээ',
      land: 'Газар чөлөөлөлт',
      permits: 'Зөвшөөрлийн төлөв',
      infra: 'Дэд бүтцийн хэрэгжилт',
      esg: 'Байгаль орчин, нийгмийн үзүүлэлт',
    } as Record<Kind, string>,
    report: 'Тайлан',
    from: 'Тайлант хугацаа: эхлэх',
    to: 'дуусах',
    csv: 'CSV татах',
    print: 'Хэвлэх / PDF',
    sample: 'ЖИШЭЭ ӨГӨГДӨЛ — бодит төсөл биш',
    generated: 'Бэлтгэсэн',
    rules: 'Тооцооны дүрэм: гүйцэтгэл — зөвхөн батлагдсан бүртгэл, ажлын жингээр, багцуудыг батлагдсан төсвөөр жигнэнэ; төлөвлөгөө — үндсэн хуваарийн огноогоор шугаман; хоцрогдол — одоогийн дуусах огноо − үндсэн хуваарийн дуусах огноо; мөнгө — төсөв, гэрээ, нэхэмжлэх, батлагдсан төлбөр, төлөгдсөн дүнг тус тусад нь; өгөгдөлгүй утга “—”.',
    noRestricted: 'Хязгаарлагдсан мэдээлэл (ослын дэлгэрэнгүй, хувийн мэдээлэл) тайланд орохгүй.',
    col: { planned: 'Төлөвлөгөө %', approved: 'Батлагдсан %', reported: 'Мэдүүлсэн %', delta: 'Зөрүү', activity: 'Ажил', finish: 'Дуусах', slip: 'Хоцрогдол (хоног)', name: 'Нэр', budget: 'Төсөв', paid: 'Төлөгдсөн', committed: 'Гэрээгээр', invoiced: 'Нэхэмжилсэн', approvedPay: 'Батлагдсан төлбөр', paidPeriod: 'Тайлант хугацаанд төлөгдсөн', defect: 'Гэмтэл, үл тохирол', severity: 'Ноцтой байдал', kind: 'Төрөл', title: 'Гарчиг', action: 'Арга хэмжээ', target: 'Төлөвлөсөн огноо', done: 'Дууссан огноо', notes: 'Тэмдэглэл', ref: 'Дугаар', expires: 'Хүчинтэй хугацаа', warning: 'Анхааруулга', indicator: 'Үзүүлэлт', unit: 'Нэгж', period: 'Хугацаа', method: 'Арга', baseline: 'Суурь', current: 'Одоо', source: 'Эх сурвалж', actualPct: 'Гүйцэтгэл %' },
  },
  en: {
    lead: 'Built from the records stored in the system, using the same calculation rules as the dashboard. These are reports on sample data — not real project results.',
    kind: {
      progress: 'Planned vs actual progress',
      schedule: 'Schedule deviations',
      packages: 'Package performance',
      finance: 'Financial execution',
      quality: 'Quality defects and corrective actions',
      safety: 'H&S incidents and actions',
      land: 'Land clearance',
      permits: 'Permit status',
      infra: 'Infrastructure implementation',
      esg: 'Environmental and social indicators',
    },
    report: 'Report',
    from: 'Period from',
    to: 'to',
    csv: 'Download CSV',
    print: 'Print / PDF',
    sample: 'SAMPLE DATA — not a real project',
    generated: 'Generated',
    rules: 'Calculation rules: progress — approved records only, activities by weight, packages by approved budget; plan — linear over baseline dates; slip — current finish − baseline finish; money — budget, contracts, invoices, approved payments and paid kept separate; missing values “—”.',
    noRestricted: 'Restricted information (incident details, personal data) is left out of reports.',
    col: { planned: 'Planned %', approved: 'Approved %', reported: 'Reported %', delta: 'Difference', activity: 'Activity', finish: 'Finish', slip: 'Slip (days)', name: 'Name', budget: 'Budget', paid: 'Paid', committed: 'Committed', invoiced: 'Invoiced', approvedPay: 'Approved payments', paidPeriod: 'Paid in period', defect: 'Defect / NCR', severity: 'Severity', kind: 'Kind', title: 'Title', action: 'Action', target: 'Target date', done: 'Completed', notes: 'Notes', ref: 'Reference', expires: 'Expires', warning: 'Warning', indicator: 'Indicator', unit: 'Unit', period: 'Period', method: 'Method', baseline: 'Baseline', current: 'Current', source: 'Source', actualPct: 'Actual %' },
  },
};

type Rows = { head: string[]; rows: (string | number)[][] };

function build(kind: Kind, d: Data, pkgs: string[], from: string, to: string, t: ReturnType<typeof useText>, en: boolean, c: (typeof W)['mn']['col']): Rows {
  const inPkg = <T extends { pkg: string }>(x: T) => pkgs.includes(x.pkg);
  const inPeriod = (date?: string) => !!date && date >= from && date <= to;
  switch (kind) {
    case 'progress': {
      const p = projectProgress(d, pkgs, to);
      return {
        head: [t.common.package, c.planned, c.approved, c.reported, c.delta],
        rows: [
          ...d.packages.filter((x) => pkgs.includes(x.id)).map((x) => {
            const v = packageProgress(d, x.id, to);
            return [x.id, v.planned.toFixed(1), v.approved.toFixed(1), v.reported.toFixed(1), (v.approved - v.planned).toFixed(1)];
          }),
          ['Σ', p.planned.toFixed(1), p.approved.toFixed(1), p.reported.toFixed(1), (p.approved - p.planned).toFixed(1)],
        ],
      };
    }
    case 'schedule':
      return {
        head: ['ID', t.common.package, c.activity, c.finish, c.slip, t.common.overdue],
        rows: d.activities.filter(inPkg).map((a) => [a.id, a.pkg, a.name, a.finish, variance(d, a) ?? '—', isOverdue(d, a, to) ? '✓' : '']),
      };
    case 'packages':
      return {
        head: [t.common.package, c.name, t.common.status, c.approved, c.budget, c.paid],
        rows: d.packages.filter((x) => pkgs.includes(x.id)).map((x) => {
          const m = money(d, [x.id]);
          return [x.id, x.name, t.pkgStatus[x.status], packageProgress(d, x.id, to).approved.toFixed(1), tug(x.budget, en), m.hasContract ? tug(m.paid, en) : '—'];
        }),
      };
    case 'finance':
      return {
        head: [t.common.package, c.budget, c.committed, c.invoiced, c.approvedPay, c.paid, c.paidPeriod],
        rows: d.packages.filter((x) => pkgs.includes(x.id)).map((x) => {
          const m = money(d, [x.id]);
          const cids = d.contracts.filter((c) => c.pkg === x.id).map((c) => c.id);
          const period = d.invoices.filter((i) => cids.includes(i.contract) && i.state === 'paid' && inPeriod(i.paidOn)).reduce((s, i) => s + i.amount, 0);
          return [x.id, tug(m.budget, en), m.hasContract ? tug(m.committed, en) : '—', m.hasContract ? tug(m.invoiced, en) : '—', m.hasContract ? tug(m.approved, en) : '—', m.hasContract ? tug(m.paid, en) : '—', m.hasContract ? tug(period, en) : '—'];
        }),
      };
    case 'quality':
      return {
        head: ['ID', t.common.package, c.defect, c.severity, t.common.owner, t.common.due, t.common.status, t.common.overdue],
        rows: d.defects.filter(inPkg).map((x) => [x.id, x.pkg, x.title, t.severity[x.severity], d.users.find((u) => u.id === x.owner)?.name ?? x.owner, x.due, t.issueState[x.state], overdueIssue(x.due, x.state, to) ? '✓' : '']),
      };
    case 'safety':
      return {
        head: ['ID', c.kind, t.common.package, c.title, c.severity, c.action, t.common.due, t.common.status],
        // restricted incident details are never put in a report
        rows: d.safety.filter(inPkg).filter((x) => inPeriod(x.date) || x.state !== 'resolved').map((x) => [x.id, t.safetyKind[x.kind], x.pkg, x.title, t.severity[x.severity], x.action, x.due, t.issueState[x.state]]),
      };
    case 'land':
      return {
        head: ['ID', t.common.status, c.target, c.done, c.notes],
        rows: d.parcels.map((x) => [x.id, t.parcelStatus[x.status], x.target, x.done ?? '—', x.issues || '']),
      };
    case 'permits':
      return {
        head: ['ID', c.kind, c.ref, t.common.package, t.common.status, c.expires, c.warning],
        rows: d.permits.filter(inPkg).map((x) => [x.id, x.type, x.ref, x.pkg, t.permitStatus[x.status], x.expires ?? '—', (() => { const k = permitWarning(x, to); return k === 'expired' ? t.permitStatus.expired : k === 'soon' ? t.common.soon : ''; })()]),
      };
    case 'infra':
      return {
        head: ['ID', c.kind, c.name, t.common.package, c.planned, c.actualPct, t.common.status],
        rows: d.assets.filter(inPkg).map((x) => [x.id, t.assetKind[x.kind], x.name, x.pkg, x.planned, x.actual ?? '—', t.assetStatus[x.status]]),
      };
    case 'esg':
      return {
        head: ['ID', c.indicator, c.unit, c.period, c.method, c.baseline, c.current, c.source],
        rows: d.indicators.map((x) => [x.id, x.name, x.unit, x.period, en ? x.method : { measured: 'Хэмжсэн', calculated: 'Тооцоолсон', estimated: 'Таамаг' }[x.method], x.baseline ?? '—', x.current ?? '—', x.source]),
      };
  }
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function Reports() {
  const t = useText();
  const w = useWords(W);
  const en = useEn();
  const { data, ready } = useStore();
  const [kind, setKind] = useState<Kind>('progress');
  const [pkg, setPkg] = useState('all');
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState(today());
  const pkgs = useMemo(() => data.packages.filter((p) => pkg === 'all' || p.id === pkg).map((p) => p.id), [data, pkg]);
  const r = useMemo(() => build(kind, data, pkgs, from, to, t, en, w.col), [kind, data, pkgs, from, to, t, en, w.col]);
  const badRange = from > to;

  const download = () => {
    const lines = [`# ${w.sample}`, `# ${w.kind[kind]} · ${from} – ${to} · ${pkg}`, r.head.map(csvCell).join(','), ...r.rows.map((row) => row.map(csvCell).join(','))];
    // a byte-order mark so spreadsheet programs read the Cyrillic correctly
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `twincore-${kind}-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (!ready) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHead title={t.section.reports} lead={w.lead} />
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <Select label={w.report} value={kind} onChange={setKind} options={KINDS.map((k) => [k, w.kind[k]])} />
        <Select label={t.filter.pkg} value={pkg} onChange={setPkg} options={[['all', t.filter.all], ...data.packages.map((p) => [p.id, p.id] as [string, string])]} />
        <label className="flex flex-col gap-1 text-xs text-mute">
          {w.from}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-line bg-ink px-2 text-sm text-fg" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mute">
          {w.to}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-line bg-ink px-2 text-sm text-fg" />
        </label>
        <Btn onClick={download} disabled={badRange || !r.rows.length}>
          ⬇ {w.csv}
        </Btn>
        <Btn onClick={() => print()} disabled={badRange}>
          🖨 {w.print}
        </Btn>
      </div>
      {badRange && <p className="text-sm text-red-300">{t.problem.dateOrder}</p>}

      <Panel
        title={
          <span>
            {w.kind[kind]} <span className="ml-2 font-mono text-xs text-mute">{from} – {to}</span>
          </span>
        }
        action={<Pill tone="warn">{w.sample}</Pill>}
      >
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-mute">
                {r.head.map((h) => (
                  <th key={h} scope="col" className="px-2 py-2 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {r.rows.map((row, i) => (
                <tr key={i} className={row[0] === 'Σ' ? 'font-medium' : ''}>
                  {row.map((c, k) => (
                    <td key={k} className="px-2 py-2 font-mono text-xs">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!r.rows.length && <p className="px-2 py-6 text-center text-sm text-mute">{t.common.none}</p>}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-mute">{w.rules}</p>
        <p className="mt-1 text-[11px] text-mute">{w.noRestricted}</p>
        <p className="mt-1 text-[11px] text-mute">
          {w.generated}: {new Date().toISOString().slice(0, 16).replace('T', ' ')} · {w.col.approved}: {pct(projectProgress(data, pkgs, to).approved, 1)}
        </p>
      </Panel>
    </div>
  );
}
