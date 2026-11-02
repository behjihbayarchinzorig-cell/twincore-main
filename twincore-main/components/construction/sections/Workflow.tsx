'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { days, today, variance } from '@/lib/construction/calc';
import type { Action } from '@/lib/construction/perms';
import { useText, useWords, type Section } from '@/lib/construction/text';
import type { Data } from '@/lib/construction/types';
import { Kpi, PageHead, Panel, Pill, type Tone } from '../Kit';
import { hrefOf } from '../Shell';
import { useStore } from '../Store';

// The workspace's approval processes drawn as swimlanes: one lane per party (contractor, supervising engineer,
// project manager, client / authority), the steps in order, the way back when something is rejected, the workspace
// section where each step is done, and — where the shared records hold it — how many records sit at that step right
// now. Records other pages keep for themselves (extra work, material submittals) have no live count here.

type Lane = 'contractor' | 'engineer' | 'manager' | 'authority';
const LANES: Lane[] = ['contractor', 'engineer', 'manager', 'authority'];
type Proc = 'progress' | 'invoice' | 'variation' | 'material' | 'permit' | 'doc' | 'baseline';
const PROCS: Proc[] = ['progress', 'invoice', 'variation', 'material', 'permit', 'doc', 'baseline'];

const W = {
  mn: {
    lead: 'Батлах үйл явц бүрийг оролцогч талуудын эгнээгээр (swimlane): хэн, ямар дарааллаар, аль хэсэгт хийх, одоо хэдэн бүртгэл аль алхамд байгааг харуулна.',
    authority: 'Захиалагч / эрх бүхий байгууллага',
    pick: 'Үйл явц',
    diagram: 'Схем',
    scrollHint: 'Утсан дээр схемийг хажуу тийш гүйлгэнэ үү, эсвэл доорх алхмын жагсаалтыг ашиглана уу.',
    steps: 'Алхмууд',
    step: 'Алхам',
    who: 'Хэн хийх',
    where: 'Хаана',
    right: 'Шаардлагатай эрх',
    youCan: 'Таны дүр энэ алхмыг хийж чадна',
    youCannot: 'Таны дүрд энэ алхмын эрх алга',
    now: 'Одоо энэ алхамд',
    noLive: 'Бүртгэл энэ хуудсанд хадгалагддаг тул шууд тоо гаргахгүй',
    choose: 'Схем дээрх алхам дээр дарж дэлгэрэнгүйг харна уу.',
    waiting: 'Шийдвэр хүлээж буй',
    oldest: 'Хамгийн удаан хүлээж буй',
    total: 'Алхмын тоо',
    parties: 'Оролцогч тал',
    back: 'Буцаах',
    legendFlow: 'Үндсэн урсгал',
    legendBack: 'Буцаах / дахин илгээх',
    legendCount: 'Одоо энэ алхамд буй бүртгэл',
    open: 'Нээх',
    s: {
      pass: 'Тэнцсэн',
      fail: 'Тэнцээгүй',
      ncOpen: 'Нээлттэй үл тохирол',
      baselines: 'Батлагдсан хувилбар',
      activities: 'Ажил',
      late: 'Үндсэн хуваариас хоцорсон',
    },
    proc: {
      progress: {
        name: 'Гүйцэтгэл батлах',
        desc: 'Гүйцэтгэгчийн бүртгэсэн биет гүйцэтгэлийг хяналтын инженер нотлох баримттай нь шалгаж батална. Зөвхөн батлагдсан гүйцэтгэл тооцоо, тайланд орно.',
        steps: {
          draft: 'Гүйцэтгэлийг ноорог хэлбэрээр бүртгэх',
          submit: 'Зураг, актаар нотолж хянуулахаар илгээх',
          review: 'Талбай дээр шалгаж, нотлох баримтыг хянах',
          approve: 'Батлах — тооцоонд орно',
          fix: 'Буцаагдсаныг засаж дахин илгээх',
          report: 'Багцын гүйцэтгэл, тайланд тусгах',
        },
      },
      invoice: {
        name: 'Нэхэмжлэх батлах',
        desc: 'Гүйцэтгэгчийн нэхэмжлэхийг батлагдсан гүйцэтгэлтэй тулгаж, төслийн менежер батлаад, санхүүжилтийн эх үүсвэрээс татан авч төлнө.',
        steps: {
          submit: 'Нэхэмжлэх ирүүлэх',
          verify: 'Батлагдсан гүйцэтгэлтэй тулгах',
          approve: 'Нэхэмжлэх батлах эсвэл буцаах',
          fix: 'Буцаагдсан нэхэмжлэхийг засах',
          draw: 'Эх үүсвэрээс татан авалт хүсэх',
          pay: 'Төлбөр шилжүүлэх',
        },
      },
      variation: {
        name: 'Нэмэлт ажил батлах',
        desc: 'Гэрээнд ороогүй ажлын хүсэлтийг тоо хэмжээ, үнээр нь хянаж, төсөв ба эх үүсвэрийг шалгаад, захиалагч баталсны дараа гэрээ, хуваарьт тусгана.',
        steps: {
          request: 'Нэмэлт ажлын хүсэлт, тоо хэмжээ, үнэ',
          review: 'Шаардлага, тоо хэмжээ, үнийг хянах',
          budget: 'Төсөв, санхүүжилт шалгах',
          approve: 'Захиалагч батлах',
          contract: 'Гэрээний нэмэлт, хуваарь шинэчлэх',
          execute: 'Ажлыг гүйцэтгэж бүртгэх',
        },
      },
      material: {
        name: 'Материал батлах',
        desc: 'Гүйцэтгэгч материалын гэрчилгээ, дээжийг ирүүлж, хяналтын инженер хянаж, баталсан материалыг талбайд ирэхэд нь дахин шалгана.',
        steps: {
          submit: 'Гэрчилгээ, дээж, үзүүлэлт ирүүлэх',
          check: 'Гэрчилгээ, шинжилгээг хянах',
          approve: 'Нийлүүлэгч, материалыг батлах',
          deliver: 'Талбайд нийлүүлэх',
          inspect: 'Ирсэн материалын үзлэг, туршилт',
          nc: 'Тэнцээгүй бол үл тохирол нээх',
        },
      },
      permit: {
        name: 'Зөвшөөрөл авах',
        desc: 'Төслийн менежер өргөдлийг бэлтгэж, гүйцэтгэгч техникийн баримтыг гаргана; эрх бүхий байгууллага шийдвэрлэсний дараа хугацааг хянана.',
        steps: {
          prepare: 'Өргөдөл, шаардлагатай баримт бэлтгэх',
          drawings: 'Зураг, тооцоо гаргах',
          submit: 'Эрх бүхий байгууллагад хүргүүлэх',
          decide: 'Хянаж шийдвэрлэх',
          granted: 'Зөвшөөрлийг бүртгэж, хугацааг хянах',
          fix: 'Татгалзсан шалтгаанаар засах',
        },
      },
      doc: {
        name: 'Баримт хянах',
        desc: 'Зураг, тайлан, актыг хувилбартайгаар оруулж, хяналтын инженер хянаж, төслийн менежер батална. Шинэ хувилбар батлагдвал хуучин нь хүчингүй болно.',
        steps: {
          upload: 'Баримтыг хувилбартай оруулах',
          review: 'Агуулга, стандартын нийцлийг хянах',
          approve: 'Батлах, хандалтын түвшин тогтоох',
          revise: 'Тайлбарын дагуу шинэ хувилбар',
          supersede: 'Хуучин хувилбарыг хүчингүй болгох',
        },
      },
      baseline: {
        name: 'Үндсэн хуваарь батлах',
        desc: 'Хуваарийг боловсруулж, гүйцэтгэгчийн саналыг авч, төслийн менежер үндсэн хуваарь болгон батална. Батлагдсан хуваарийг дарж бичихгүй — өөрчлөлт нь шинэ хувилбар.',
        steps: {
          draft: 'Ажил, хамаарлыг боловсруулах',
          comment: 'Хуваарьт санал өгөх',
          submit: 'Батлуулахаар хүргүүлэх',
          approve: 'Үндсэн хуваарь батлах',
          inform: 'Захиалагчид мэдэгдэх, тайлагнах',
          track: 'Хоцрогдлыг үндсэн хуваарьтай харьцуулах',
        },
      },
    } as Record<Proc, { name: string; desc: string; steps: Record<string, string> }>,
  },
  en: {
    lead: 'Each approval process in swimlanes by party: who does what, in which order, in which section — and how many records are at each step right now.',
    authority: 'Client / authority',
    pick: 'Process',
    diagram: 'Diagram',
    scrollHint: 'On a phone, scroll the diagram sideways, or use the step list below.',
    steps: 'Steps',
    step: 'Step',
    who: 'Who',
    where: 'Where',
    right: 'Permission needed',
    youCan: 'Your role may take this step',
    youCannot: 'Your role may not take this step',
    now: 'At this step now',
    noLive: 'These records are kept on that page, so there is no live count here',
    choose: 'Tap a step in the diagram to see its details.',
    waiting: 'Awaiting a decision',
    oldest: 'Waiting longest',
    total: 'Steps',
    parties: 'Parties',
    back: 'Send back',
    legendFlow: 'Main flow',
    legendBack: 'Send back / resubmit',
    legendCount: 'Records at this step now',
    open: 'Open',
    s: {
      pass: 'Passed',
      fail: 'Failed',
      ncOpen: 'Open nonconformities',
      baselines: 'Approved versions',
      activities: 'Activities',
      late: 'Behind the baseline',
    },
    proc: {
      progress: {
        name: 'Progress approval',
        desc: 'Physical progress recorded by the contractor is checked with its evidence and approved by the supervising engineer. Only approved progress counts in calculations and reports.',
        steps: {
          draft: 'Record progress as a draft',
          submit: 'Attach photos / acts and submit',
          review: 'Check on site, review the evidence',
          approve: 'Approve — it now counts',
          fix: 'Fix what was sent back, resubmit',
          report: 'Package progress and reports',
        },
      },
      invoice: {
        name: 'Invoice approval',
        desc: 'The contractor’s invoice is checked against approved progress, approved by the project manager, then drawn down from a funding source and paid.',
        steps: {
          submit: 'Submit the invoice',
          verify: 'Check against approved progress',
          approve: 'Approve or reject the invoice',
          fix: 'Correct a rejected invoice',
          draw: 'Request a drawdown',
          pay: 'Transfer the payment',
        },
      },
      variation: {
        name: 'Extra work approval',
        desc: 'A request for work outside the contract is checked for quantities and price, against the budget and funding, approved by the client, then added to the contract and schedule.',
        steps: {
          request: 'Request: quantities and price',
          review: 'Review need, quantities, price',
          budget: 'Check budget and funding',
          approve: 'Client approves',
          contract: 'Contract addendum, schedule update',
          execute: 'Carry out and record the work',
        },
      },
      material: {
        name: 'Material approval',
        desc: 'The contractor submits certificates and samples; the supervising engineer reviews them, and checks approved material again when it arrives on site.',
        steps: {
          submit: 'Submit certificates, samples, specs',
          check: 'Review certificates and tests',
          approve: 'Approve supplier and material',
          deliver: 'Deliver to site',
          inspect: 'Inspect and test on arrival',
          nc: 'Open a nonconformity if it fails',
        },
      },
      permit: {
        name: 'Permit',
        desc: 'The project manager prepares the application, the contractor provides the technical documents; once the authority decides, the expiry is tracked.',
        steps: {
          prepare: 'Prepare the application',
          drawings: 'Produce drawings and calculations',
          submit: 'Submit to the authority',
          decide: 'Review and decide',
          granted: 'Record the permit, track expiry',
          fix: 'Fix the reasons for refusal',
        },
      },
      doc: {
        name: 'Document review',
        desc: 'Drawings, reports and acts are uploaded with a version, reviewed by the supervising engineer and approved by the project manager. A newer approved version supersedes the old one.',
        steps: {
          upload: 'Upload with a version',
          review: 'Review content and standards',
          approve: 'Approve, set the access level',
          revise: 'New version per comments',
          supersede: 'Supersede the old version',
        },
      },
      baseline: {
        name: 'Baseline approval',
        desc: 'The schedule is drafted, the contractor comments, and the project manager approves it as the baseline. An approved baseline is never overwritten — a change is a new version.',
        steps: {
          draft: 'Draft activities and links',
          comment: 'Comment on the schedule',
          submit: 'Submit for approval',
          approve: 'Approve the baseline',
          inform: 'Inform the client, report',
          track: 'Compare progress to the baseline',
        },
      },
    },
  },
};

type Words = typeof W.mn;
type Txt = ReturnType<typeof useText>;
type Count = [label: string, n: number, tone: Tone];
type Step = { id: string; lane: Lane; col: number; section: Section; action?: Action; count?: (d: Data, t: Txt, w: Words) => Count[] };
type Def = { steps: Step[]; edges: [string, string, ('back' | undefined)?][]; waiting?: (d: Data) => string[] };

const n = (xs: unknown[]) => xs.length;
const prog = (s: 'draft' | 'submitted' | 'approved' | 'rejected') => (d: Data, t: Txt): Count[] => [[t.progressState[s], n(d.progress.filter((p) => p.state === s)), s === 'rejected' ? 'bad' : s === 'approved' ? 'good' : 'info']];
const inv = (s: 'submitted' | 'approved' | 'rejected' | 'paid') => (d: Data, t: Txt): Count[] => [[t.invoiceState[s], n(d.invoices.filter((p) => p.state === s)), s === 'rejected' ? 'bad' : s === 'paid' ? 'good' : 'info']];
const doc = (s: 'draft' | 'review' | 'approved' | 'superseded') => (d: Data, t: Txt): Count[] => [[t.docState[s], n(d.docs.filter((p) => p.state === s)), s === 'approved' ? 'good' : s === 'superseded' ? 'neutral' : 'info']];

// the processes: steps placed on a lane and a column, edges in order, and what is waiting (dates) for the KPIs
const DEFS: Record<Proc, Def> = {
  progress: {
    steps: [
      { id: 'draft', lane: 'contractor', col: 0, section: 'progress', action: 'progress.submit', count: prog('draft') },
      { id: 'submit', lane: 'contractor', col: 1, section: 'progress', action: 'progress.submit' },
      { id: 'review', lane: 'engineer', col: 2, section: 'progress', action: 'progress.review', count: prog('submitted') },
      { id: 'approve', lane: 'engineer', col: 3, section: 'progress', action: 'progress.review', count: prog('approved') },
      { id: 'fix', lane: 'contractor', col: 3, section: 'progress', action: 'progress.submit', count: prog('rejected') },
      { id: 'report', lane: 'manager', col: 4, section: 'pkgProgress' },
    ],
    edges: [['draft', 'submit'], ['submit', 'review'], ['review', 'approve'], ['review', 'fix', 'back'], ['fix', 'submit', 'back'], ['approve', 'report']],
    waiting: (d) => d.progress.filter((p) => p.state === 'submitted').map((p) => p.history.find((h) => h.action === 'submitted')?.at ?? p.date),
  },
  invoice: {
    steps: [
      { id: 'submit', lane: 'contractor', col: 0, section: 'finance', action: 'invoice.submit', count: inv('submitted') },
      { id: 'verify', lane: 'engineer', col: 1, section: 'pkgProgress' },
      { id: 'approve', lane: 'manager', col: 2, section: 'finance', action: 'invoice.review', count: inv('approved') },
      { id: 'fix', lane: 'contractor', col: 2, section: 'finance', action: 'invoice.submit', count: inv('rejected') },
      { id: 'draw', lane: 'manager', col: 3, section: 'funding', action: 'funding.edit' },
      { id: 'pay', lane: 'authority', col: 4, section: 'finance', action: 'invoice.review', count: inv('paid') },
    ],
    edges: [['submit', 'verify'], ['verify', 'approve'], ['approve', 'fix', 'back'], ['fix', 'submit', 'back'], ['approve', 'draw'], ['draw', 'pay']],
    waiting: (d) => d.invoices.filter((i) => i.state === 'submitted' || i.state === 'approved').map((i) => i.date),
  },
  variation: {
    steps: [
      { id: 'request', lane: 'contractor', col: 0, section: 'variations', action: 'variation.submit' },
      { id: 'review', lane: 'engineer', col: 1, section: 'variations', action: 'variation.review' },
      { id: 'budget', lane: 'manager', col: 2, section: 'funding', action: 'funding.edit' },
      { id: 'approve', lane: 'authority', col: 3, section: 'variations', action: 'variation.review' },
      { id: 'contract', lane: 'manager', col: 4, section: 'schedule', action: 'schedule.edit' },
      { id: 'execute', lane: 'contractor', col: 5, section: 'progress', action: 'progress.submit' },
    ],
    edges: [['request', 'review'], ['review', 'request', 'back'], ['review', 'budget'], ['budget', 'approve'], ['approve', 'contract'], ['contract', 'execute']],
  },
  material: {
    steps: [
      { id: 'submit', lane: 'contractor', col: 0, section: 'materials', action: 'material.submit' },
      { id: 'check', lane: 'engineer', col: 1, section: 'materials', action: 'material.review' },
      { id: 'approve', lane: 'manager', col: 2, section: 'materials', action: 'material.review' },
      { id: 'deliver', lane: 'contractor', col: 3, section: 'materials', action: 'material.submit' },
      {
        id: 'inspect',
        lane: 'engineer',
        col: 4,
        section: 'quality',
        action: 'quality.edit',
        count: (d, _t, w) => {
          const m = d.inspections.filter((i) => i.kind === 'material');
          return [
            [w.s.pass, n(m.filter((i) => i.result === 'pass')), 'good'],
            [w.s.fail, n(m.filter((i) => i.result === 'fail')), 'bad'],
          ];
        },
      },
      { id: 'nc', lane: 'engineer', col: 5, section: 'quality', action: 'quality.edit', count: (d, _t, w) => [[w.s.ncOpen, n(d.defects.filter((x) => x.state !== 'resolved')), 'warn']] },
    ],
    edges: [['submit', 'check'], ['check', 'submit', 'back'], ['check', 'approve'], ['approve', 'deliver'], ['deliver', 'inspect'], ['inspect', 'nc', 'back']],
  },
  permit: {
    steps: [
      { id: 'prepare', lane: 'manager', col: 0, section: 'permits', action: 'permit.edit' },
      { id: 'drawings', lane: 'contractor', col: 1, section: 'docs', action: 'doc.upload' },
      { id: 'submit', lane: 'manager', col: 2, section: 'permits', action: 'permit.edit' },
      { id: 'decide', lane: 'authority', col: 3, section: 'permits', count: (d, t) => [[t.permitStatus.pending, n(d.permits.filter((p) => p.status === 'pending')), 'info']] },
      {
        id: 'granted',
        lane: 'manager',
        col: 4,
        section: 'permits',
        action: 'permit.edit',
        count: (d, t) => [
          [t.permitStatus.approved, n(d.permits.filter((p) => p.status === 'approved')), 'good'],
          [t.permitStatus.expired, n(d.permits.filter((p) => p.status === 'expired')), 'bad'],
        ],
      },
      { id: 'fix', lane: 'contractor', col: 3, section: 'permits', action: 'doc.upload', count: (d, t) => [[t.permitStatus.rejected, n(d.permits.filter((p) => p.status === 'rejected')), 'bad']] },
    ],
    edges: [['prepare', 'drawings'], ['drawings', 'submit'], ['submit', 'decide'], ['decide', 'granted'], ['decide', 'fix', 'back'], ['fix', 'submit', 'back']],
    waiting: (d) => d.permits.filter((p) => p.status === 'pending').map((p) => p.submitted),
  },
  doc: {
    steps: [
      { id: 'upload', lane: 'contractor', col: 0, section: 'docs', action: 'doc.upload', count: doc('draft') },
      { id: 'review', lane: 'engineer', col: 1, section: 'docs', action: 'doc.review', count: doc('review') },
      { id: 'approve', lane: 'manager', col: 2, section: 'docs', action: 'doc.review', count: doc('approved') },
      { id: 'revise', lane: 'contractor', col: 2, section: 'docs', action: 'doc.upload' },
      { id: 'supersede', lane: 'manager', col: 3, section: 'docs', action: 'doc.review', count: doc('superseded') },
    ],
    edges: [['upload', 'review'], ['review', 'approve'], ['review', 'revise', 'back'], ['revise', 'review', 'back'], ['approve', 'supersede']],
    waiting: (d) => d.docs.filter((x) => x.state === 'review').map((x) => x.uploaded),
  },
  baseline: {
    steps: [
      { id: 'draft', lane: 'engineer', col: 0, section: 'schedule', action: 'schedule.edit', count: (d, _t, w) => [[w.s.activities, n(d.activities), 'neutral']] },
      { id: 'comment', lane: 'contractor', col: 1, section: 'schedule' },
      { id: 'submit', lane: 'engineer', col: 2, section: 'approveSchedule', action: 'schedule.edit' },
      { id: 'approve', lane: 'manager', col: 3, section: 'approveSchedule', action: 'baseline.approve', count: (d, _t, w) => [[w.s.baselines, n(d.baselines), 'good']] },
      { id: 'inform', lane: 'authority', col: 4, section: 'reports' },
      { id: 'track', lane: 'engineer', col: 5, section: 'schedule', count: (d, _t, w) => [[w.s.late, n(d.activities.filter((a) => (variance(d, a) ?? 0) > 0)), 'warn']] },
    ],
    edges: [['draft', 'comment'], ['comment', 'submit'], ['submit', 'approve'], ['approve', 'draft', 'back'], ['approve', 'inform'], ['approve', 'track']],
  },
};

// diagram geometry
const LABEL_W = 116;
const COL_W = 172;
const LANE_H = 104;
const BOX_W = 144;
const BOX_H = 66;
const boxX = (col: number) => LABEL_W + col * COL_W + (COL_W - BOX_W) / 2;
const boxY = (lane: Lane) => LANES.indexOf(lane) * LANE_H + (LANE_H - BOX_H) / 2;

// split a label into at most three lines of about `max` characters
function wrap(s: string, max = 21) {
  const words = s.split(' ');
  const lines: string[] = [''];
  for (const wd of words) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + wd).trim().length > max && cur) lines.push(wd);
    else lines[lines.length - 1] = (cur + ' ' + wd).trim();
  }
  return lines.length > 3 ? [...lines.slice(0, 2), lines.slice(2).join(' ').slice(0, max - 1) + '…'] : lines;
}

export default function Workflow() {
  const t = useText();
  const w = useWords(W);
  const { data, can } = useStore();
  const [proc, setProc] = useState<Proc>('progress');
  const [sel, setSel] = useState<string | null>(null);
  const def = DEFS[proc];
  const words = w.proc[proc];
  const laneName = (l: Lane) => (l === 'authority' ? w.authority : t.role[l]);
  const counts = (s: Step) => s.count?.(data, t, w) ?? null;
  const step = def.steps.find((s) => s.id === sel) ?? null;
  const order = [...def.steps].sort((a, b) => a.col - b.col || LANES.indexOf(a.lane) - LANES.indexOf(b.lane));
  const now = today();
  const waiting = def.waiting?.(data) ?? null;
  const oldest = waiting?.length ? waiting.reduce((m, x) => (x < m ? x : m)) : null;
  const cols = Math.max(...def.steps.map((s) => s.col)) + 1;
  const SW = LABEL_W + cols * COL_W + 8;
  const SH = LANES.length * LANE_H;
  const lanesUsed = new Set(def.steps.map((s) => s.lane)).size;

  // an orthogonal path from one box to the next. A step sent back leaves through the side of its box that faces
  // the target lane, runs along the gap between the lanes (so it never crosses another box) and comes in from there.
  const path = (a: Step, b: Step, back: boolean) => {
    const ax = boxX(a.col);
    const ay = boxY(a.lane);
    const bx = boxX(b.col);
    const by = boxY(b.lane);
    const la = LANES.indexOf(a.lane);
    const lb = LANES.indexOf(b.lane);
    if (!back) {
      if (a.col === b.col) {
        const x = ax + BOX_W / 2;
        return by > ay ? `M${x} ${ay + BOX_H} V${by}` : `M${x} ${ay} V${by + BOX_H}`;
      }
      const x1 = ax + BOX_W;
      const y1 = ay + BOX_H / 2;
      const y2 = by + BOX_H / 2;
      const mid = x1 + (COL_W - BOX_W) / 2;
      return y1 === y2 ? `M${x1} ${y1} H${bx}` : `M${x1} ${y1} H${mid} V${y2} H${bx}`;
    }
    const sx = ax + BOX_W / 2 - 16;
    const tx = bx + BOX_W / 2 + 16;
    if (la < lb) {
      const yr = (la + 1) * LANE_H - 7;
      return `M${sx} ${ay + BOX_H} V${yr} H${tx} V${by}`;
    }
    if (la > lb) {
      const yr = la * LANE_H + 7;
      return `M${sx} ${ay} V${yr} H${tx} V${by + BOX_H}`;
    }
    const yr = (la + 1) * LANE_H - 7;
    return `M${sx} ${ay + BOX_H} V${yr} H${tx} V${by + BOX_H}`;
  };

  return (
    <div className="space-y-6">
      <PageHead title={t.section.workflow} lead={w.lead} />

      {/* the process picker; each chip shows what waits for a decision where the store has it */}
      <div role="tablist" aria-label={w.pick} className="flex flex-wrap gap-2">
        {PROCS.map((p) => {
          const wt = DEFS[p].waiting?.(data).length;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={proc === p}
              onClick={() => {
                setProc(p);
                setSel(null);
              }}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition ${proc === p ? 'border-accent/60 bg-accent/[0.1] text-fg' : 'border-line text-fg/80 hover:border-mute'}`}
            >
              {w.proc[p].name}
              {!!wt && <span className="rounded-full bg-sky-400/20 px-1.5 font-mono text-[11px] text-sky-300">{wt}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={w.total} value={def.steps.length} />
        <Kpi label={w.parties} value={lanesUsed} />
        <Kpi label={w.waiting} value={waiting ? waiting.length : '—'} sub={waiting ? undefined : t.common.unavailable} tone={waiting?.length ? 'warn' : 'neutral'} />
        <Kpi label={w.oldest} value={oldest ? `${days(oldest, now)} ${t.common.days}` : '—'} sub={oldest ?? undefined} tone={oldest && days(oldest, now) > 14 ? 'bad' : 'neutral'} />
      </div>

      <Panel title={`${w.diagram} · ${words.name}`}>
        <p className="mb-3 max-w-[820px] text-sm text-fg/80">{words.desc}</p>
        <p className="mb-3 text-xs text-mute md:hidden">{w.scrollHint}</p>
        <div className="-mx-1 overflow-x-auto pb-2" data-lenis-prevent>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label={words.name} className="block">
            <defs>
              <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill="var(--color-mute)" />
              </marker>
              <marker id="wf-back" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill="#f87171" />
              </marker>
            </defs>
            {LANES.map((l, k) => (
              <g key={l}>
                <rect x={0} y={k * LANE_H} width={SW} height={LANE_H} fill={k % 2 ? 'transparent' : 'var(--color-surface)'} opacity={0.35} />
                <line x1={0} x2={SW} y1={k * LANE_H} y2={k * LANE_H} stroke="var(--color-line)" />
                {wrap(laneName(l), 15).map((ln, j, arr) => (
                  <text key={j} x={10} y={k * LANE_H + LANE_H / 2 + (j - (arr.length - 1) / 2) * 14 + 4} fontSize="11" fill="var(--color-mute)">
                    {ln}
                  </text>
                ))}
              </g>
            ))}
            <line x1={LABEL_W - 6} x2={LABEL_W - 6} y1={0} y2={SH} stroke="var(--color-line)" />
            {def.edges.map(([a, b, kind], k) => {
              const sa = def.steps.find((s) => s.id === a)!;
              const sb = def.steps.find((s) => s.id === b)!;
              const back = kind === 'back';
              return <path key={k} d={path(sa, sb, back)} fill="none" stroke={back ? '#f87171' : 'var(--color-mute)'} strokeOpacity={back ? 0.75 : 0.7} strokeWidth={1.5} strokeDasharray={back ? '5 4' : undefined} markerEnd={`url(#${back ? 'wf-back' : 'wf-arrow'})`} />;
            })}
            {def.steps.map((s) => {
              const x = boxX(s.col);
              const y = boxY(s.lane);
              const on = sel === s.id;
              const c = counts(s);
              const total = c?.reduce((m, [, v]) => m + v, 0);
              const lines = wrap(words.steps[s.id]);
              const idx = order.indexOf(s) + 1;
              return (
                <g
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={`${idx}. ${words.steps[s.id]} — ${laneName(s.lane)}`}
                  className="cursor-pointer outline-none"
                  onClick={() => setSel(on ? null : s.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(on ? null : s.id))}
                >
                  <rect x={x} y={y} width={BOX_W} height={BOX_H} rx={10} fill="var(--color-ink)" stroke={on ? 'var(--color-accent)' : 'var(--color-line)'} strokeWidth={on ? 2 : 1} />
                  <text x={x + 8} y={y + 14} fontSize="9" fill="var(--color-mute)" className="font-mono">
                    {idx} · {t.section[s.section]}
                  </text>
                  {lines.map((ln, j) => (
                    <text key={j} x={x + 8} y={y + 30 + j * 13} fontSize="11" fill="var(--color-fg)">
                      {ln}
                    </text>
                  ))}
                  {total != null && (
                    <g>
                      <circle cx={x + BOX_W - 2} cy={y + 2} r={11} fill={total ? 'var(--color-accent)' : 'var(--color-line)'} />
                      <text x={x + BOX_W - 2} y={y + 6} textAnchor="middle" fontSize="10" fill="white" className="font-mono">
                        {total}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 bg-mute" />
            {w.legendFlow}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5" style={{ background: 'repeating-linear-gradient(90deg, #f87171 0 4px, transparent 4px 7px)' }} />
            {w.legendBack}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-accent" />
            {w.legendCount}
          </span>
        </div>
      </Panel>

      {/* desktop: the chosen step's details */}
      <div className="hidden md:block">
        <Panel title={step ? words.steps[step.id] : w.step}>
          {step ? detail(step) : <p className="text-sm text-mute">{w.choose}</p>}
        </Panel>
      </div>

      {/* phone: the steps in order, as a list */}
      <div className="md:hidden">
        <Panel title={w.steps}>
          <ol className="relative space-y-4 border-l border-line pl-5">
            {order.map((s, k) => (
              <li key={s.id}>
                <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full border border-line bg-ink font-mono text-[10px] text-mute">{k + 1}</span>
                <p className="text-sm text-fg/90">{words.steps[s.id]}</p>
                <div className="mt-1">
                  {detail(s, true)}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );

  function detail(s: Step, compact = false) {
    const c = counts(s);
    const allowed = s.action ? can(s.action) : null;
    return (
      <div className={compact ? 'space-y-2 text-xs' : 'grid grid-cols-[minmax(0,1fr)] gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4'}>
        <div>
          {!compact && <p className="mb-1 text-xs text-mute">{w.who}</p>}
          <Pill tone="info">{laneName(s.lane)}</Pill>
        </div>
        <div>
          {!compact && <p className="mb-1 text-xs text-mute">{w.where}</p>}
          <Link href={hrefOf(s.section)} className="inline-flex min-h-10 items-center text-accent-hi hover:underline">
            {t.section[s.section]} →
          </Link>
        </div>
        <div>
          {!compact && <p className="mb-1 text-xs text-mute">{w.right}</p>}
          {s.action ? (
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] text-mute">{s.action}</span>
              <Pill tone={allowed ? 'good' : 'neutral'}>{allowed ? w.youCan : `🔒 ${w.youCannot}`}</Pill>
            </p>
          ) : (
            <span className="text-xs text-mute">—</span>
          )}
        </div>
        <div>
          {!compact && <p className="mb-1 text-xs text-mute">{w.now}</p>}
          {c ? (
            <p className="flex flex-wrap gap-1.5">
              {c.map(([label, v, tone]) => (
                <Pill key={label} tone={v ? tone : 'neutral'}>
                  {label}: <span className="font-mono">{v}</span>
                </Pill>
              ))}
            </p>
          ) : (
            !compact && <span className="text-xs text-mute">{s.section === 'variations' || s.section === 'materials' ? w.noLive : '—'}</span>
          )}
        </div>
      </div>
    );
  }
}
