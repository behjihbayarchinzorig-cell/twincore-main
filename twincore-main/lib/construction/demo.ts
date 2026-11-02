// DEMONSTRATION DATA — not a real project. A sample district (the same five work packages as the base-data map) with
// enough records in every part of the workspace to show how it works. Every screen that shows it says so.

import { PACKAGES } from '@/lib/packages';
import type { Activity, Data, Event } from './types';

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });
const PKG_NAMES: Record<string, string> = {
  'PKG-01': 'Орон сууцны блок А (12 давхар)',
  'PKG-02': 'Гудамж, явган зам — 1-р ээлж',
  'PKG-03': 'Цэвэр ус, бохир усны шугам',
  'PKG-04': 'Сургууль, цэцэрлэгийн цогцолбор',
  'PKG-05': 'Дулааны шугам, дэд станц',
};
const CONTRACTOR: Record<string, string | null> = { 'PKG-01': 'C-A', 'PKG-02': 'C-B', 'PKG-03': 'C-C', 'PKG-04': null, 'PKG-05': 'C-D' };

// activities per package: [name, start, finish, weight, cost ₮ mn, deps (local index)]
const PLAN: Record<string, [string, string, string, number, number, number[]][]> = {
  'PKG-01': [
    ['Газар шорооны ажил', '2026-01-10', '2026-03-20', 10, 1600, []],
    ['Суурь, подвал', '2026-03-01', '2026-06-15', 20, 3600, [0]],
    ['Каркас 1–6 давхар', '2026-06-01', '2026-10-01', 25, 4700, [1]],
    ['Каркас 7–12 давхар', '2026-09-15', '2027-01-31', 20, 3800, [2]],
    ['Фасад, цонх', '2027-01-15', '2027-04-30', 15, 2700, [3]],
    ['Дотор засал, инженерийн систем', '2027-02-15', '2027-06-30', 10, 2000, [3]],
  ],
  'PKG-02': [
    ['Хуучин хучилт буулгах', '2026-03-01', '2026-04-15', 15, 1300, []],
    ['Ус зайлуулах суваг', '2026-04-01', '2026-07-15', 30, 3600, [0]],
    ['Суурь давхарга', '2026-06-15', '2026-09-30', 30, 3700, [1]],
    ['Асфальт, хашлага', '2026-09-01', '2027-02-28', 25, 3500, [2]],
  ],
  'PKG-03': [
    ['Шуудуу ухах', '2025-09-01', '2025-11-15', 30, 2900, []],
    ['Шугам угсрах', '2025-10-15', '2026-05-30', 50, 4800, [0]],
    ['Туршилт, хүлээлгэх', '2026-05-15', '2026-08-15', 20, 1900, [1]],
  ],
  'PKG-04': [
    ['Зураг төсөл батлах', '2026-11-01', '2027-02-28', 10, 2200, []],
    ['Суурь', '2027-03-15', '2027-06-30', 30, 6600, [0]],
    ['Барилга угсралт', '2027-06-15', '2028-03-15', 60, 13200, [1]],
  ],
  'PKG-05': [
    ['Дэд станцын суурь', '2026-04-01', '2026-07-31', 25, 3800, []],
    ['Дулааны шугам', '2026-07-01', '2027-08-31', 55, 8400, [0]],
    ['Тоноглол, туршилт', '2027-08-01', '2028-01-31', 20, 3100, [1]],
  ],
};

const activities: Activity[] = [];
for (const [pkg, rows] of Object.entries(PLAN)) {
  const ids = rows.map((_, k) => `${pkg.replace('PKG', 'A')}-${k + 1}`);
  rows.forEach(([name, start, finish, weight, cost, deps], k) =>
    activities.push({ id: ids[k], pkg, name, start, finish, owner: CONTRACTOR[pkg] ? `u-${CONTRACTOR[pkg]!.slice(2).toLowerCase()}` : 'u-pm', deps: deps.map((d) => ids[d]), weight, cost }),
  );
}
// the approved baseline (January 2026) — the current schedule has since slipped on PKG-02 and PKG-01
const baselineDates = Object.fromEntries(activities.map((a) => [a.id, { start: a.start, finish: a.finish }]));
const slip = (id: string, start: string, finish: string) => {
  const a = activities.find((x) => x.id === id)!;
  a.start = start;
  a.finish = finish;
};
slip('A-02-2', '2026-04-10', '2026-08-30');
slip('A-02-3', '2026-08-15', '2026-11-30');
slip('A-02-4', '2026-11-01', '2027-04-30');
slip('A-01-3', '2026-06-10', '2026-10-25');
slip('A-01-4', '2026-10-01', '2027-02-28');

export const DEMO: Data = {
  orgs: [
    { id: 'O-CL', name: 'Нийслэлийн Хот байгуулалтын газар', kind: 'client' },
    { id: 'C-A', name: 'Тест компани A', kind: 'contractor' },
    { id: 'C-B', name: 'Тест компани B', kind: 'contractor' },
    { id: 'C-C', name: 'Тест компани C', kind: 'contractor' },
    { id: 'C-D', name: 'Тест компани D', kind: 'contractor' },
    { id: 'O-SV', name: 'Хяналтын инженерийн байгууллага', kind: 'consultant' },
    { id: 'O-AU', name: 'Барилгын хяналтын газар', kind: 'authority' },
    { id: 'O-UT', name: 'Шугам сүлжээний газар', kind: 'utility' },
  ],
  users: [
    { id: 'u-admin', name: 'Систем админ', org: 'O-CL', role: 'admin', projects: ['P-1'] },
    { id: 'u-pm', name: 'Төслийн менежер', org: 'O-CL', role: 'manager', projects: ['P-1'] },
    { id: 'u-eng', name: 'Хяналтын инженер', org: 'O-SV', role: 'engineer', projects: ['P-1'] },
    { id: 'u-a', name: 'Гүйцэтгэгч A — инженер', org: 'C-A', role: 'contractor', projects: ['P-1'] },
    { id: 'u-b', name: 'Гүйцэтгэгч B — инженер', org: 'C-B', role: 'contractor', projects: ['P-1'] },
    { id: 'u-c', name: 'Гүйцэтгэгч C — инженер', org: 'C-C', role: 'contractor', projects: ['P-1'] },
    { id: 'u-d', name: 'Гүйцэтгэгч D — инженер', org: 'C-D', role: 'contractor', projects: ['P-1'] },
    { id: 'u-view', name: 'Ажиглагч', org: 'O-AU', role: 'viewer', projects: ['P-1'] },
  ],
  projects: [{ id: 'P-1', name: 'Жишээ хороолол — дахин төлөвлөлт', area: 'Улаанбаатар, Сүхбаатар дүүрэг' }],
  packages: PACKAGES.map((p) => ({
    id: p.id,
    project: 'P-1',
    name: PKG_NAMES[p.id],
    contractor: CONTRACTOR[p.id],
    status: p.status === 'late' ? 'active' : p.status === 'done' ? 'done' : p.status,
    budget: Math.round(p.budget * 1000),
    geom: { x: p.x, y: p.y, w: p.w, h: p.h },
    twin: p.id === 'PKG-01' ? '/system/monitor' : '/system/twin',
  })),
  activities,
  baselines: [{ id: 'BL-1', label: 'Үндсэн хуваарь v1', approvedAt: '2026-01-05', approvedBy: 'u-pm', dates: baselineDates }],
  progress: [
    { id: 'PR-1', activity: 'A-01-1', date: '2026-03-20', percent: 100, note: 'Газар шорооны ажил дууссан', evidence: ['photo-0320.jpg'], state: 'approved', by: 'u-a', history: [ev('2026-03-20', 'u-a', 'submitted'), ev('2026-03-22', 'u-eng', 'approved')] },
    { id: 'PR-2', activity: 'A-01-2', date: '2026-06-20', percent: 100, note: 'Суурь цутгагдсан, туршилт хэвийн', evidence: ['concrete-test.pdf'], state: 'approved', by: 'u-a', history: [ev('2026-06-20', 'u-a', 'submitted'), ev('2026-06-24', 'u-eng', 'approved')] },
    { id: 'PR-3', activity: 'A-01-3', date: '2026-10-01', percent: 85, note: '6 давхрын хучилт цутгагдсан', evidence: ['site-1001.jpg'], state: 'approved', by: 'u-a', history: [ev('2026-10-01', 'u-a', 'submitted'), ev('2026-10-03', 'u-eng', 'approved')] },
    { id: 'PR-4', activity: 'A-01-3', date: '2026-10-14', percent: 95, note: 'Тулгуур багана дууссан', evidence: [], state: 'submitted', by: 'u-a', history: [ev('2026-10-14', 'u-a', 'submitted')] },
    { id: 'PR-5', activity: 'A-01-4', date: '2026-10-12', percent: 10, note: '7 давхрын хэвлэмэл', evidence: [], state: 'draft', by: 'u-a', history: [] },
    { id: 'PR-6', activity: 'A-02-1', date: '2026-04-20', percent: 100, note: '', evidence: ['demolition.jpg'], state: 'approved', by: 'u-b', history: [ev('2026-04-20', 'u-b', 'submitted'), ev('2026-04-23', 'u-eng', 'approved')] },
    { id: 'PR-7', activity: 'A-02-2', date: '2026-09-10', percent: 80, note: 'Шугамын 2 хэсэг үлдсэн', evidence: [], state: 'approved', by: 'u-b', history: [ev('2026-09-10', 'u-b', 'submitted'), ev('2026-09-12', 'u-eng', 'approved')] },
    { id: 'PR-8', activity: 'A-02-2', date: '2026-10-10', percent: 95, note: '', evidence: [], state: 'rejected', by: 'u-b', history: [ev('2026-10-10', 'u-b', 'submitted'), ev('2026-10-12', 'u-eng', 'rejected', 'Нотлох зураг хавсаргаагүй')] },
    { id: 'PR-9', activity: 'A-02-3', date: '2026-10-05', percent: 20, note: '', evidence: [], state: 'approved', by: 'u-b', history: [ev('2026-10-05', 'u-b', 'submitted'), ev('2026-10-07', 'u-eng', 'approved')] },
    { id: 'PR-10', activity: 'A-03-1', date: '2025-11-20', percent: 100, note: '', evidence: [], state: 'approved', by: 'u-c', history: [ev('2025-11-20', 'u-c', 'submitted'), ev('2025-11-21', 'u-eng', 'approved')] },
    { id: 'PR-11', activity: 'A-03-2', date: '2026-06-01', percent: 100, note: '', evidence: [], state: 'approved', by: 'u-c', history: [ev('2026-06-01', 'u-c', 'submitted'), ev('2026-06-03', 'u-eng', 'approved')] },
    { id: 'PR-12', activity: 'A-03-3', date: '2026-08-14', percent: 100, note: 'Комисс хүлээн авсан', evidence: ['act.pdf'], state: 'approved', by: 'u-c', history: [ev('2026-08-14', 'u-c', 'submitted'), ev('2026-08-16', 'u-eng', 'approved')] },
    { id: 'PR-13', activity: 'A-05-1', date: '2026-08-05', percent: 100, note: '', evidence: [], state: 'approved', by: 'u-d', history: [ev('2026-08-05', 'u-d', 'submitted'), ev('2026-08-07', 'u-eng', 'approved')] },
    { id: 'PR-14', activity: 'A-05-2', date: '2026-10-08', percent: 22, note: '', evidence: [], state: 'approved', by: 'u-d', history: [ev('2026-10-08', 'u-d', 'submitted'), ev('2026-10-09', 'u-eng', 'approved')] },
  ],
  contracts: [
    { id: 'CT-01', pkg: 'PKG-01', org: 'C-A', title: 'Блок А барилга угсралт', amount: 17600, signed: '2025-12-10' },
    { id: 'CT-02', pkg: 'PKG-02', org: 'C-B', title: 'Гудамж, явган зам', amount: 11800, signed: '2026-02-01' },
    { id: 'CT-03', pkg: 'PKG-03', org: 'C-C', title: 'Ус, бохир усны шугам', amount: 9400, signed: '2025-08-15' },
    { id: 'CT-05', pkg: 'PKG-05', org: 'C-D', title: 'Дулааны шугам, дэд станц', amount: 14900, signed: '2026-03-10' },
  ],
  milestones: [
    { id: 'MS-1', contract: 'CT-01', name: 'Урьдчилгаа', due: '2026-01-15', amount: 2640 },
    { id: 'MS-2', contract: 'CT-01', name: 'Суурь дууссан', due: '2026-06-30', amount: 4400 },
    { id: 'MS-3', contract: 'CT-01', name: 'Каркас 6 давхар', due: '2026-10-15', amount: 3520 },
    { id: 'MS-4', contract: 'CT-01', name: 'Каркас бүрэн', due: '2027-02-28', amount: 3520 },
    { id: 'MS-5', contract: 'CT-02', name: 'Урьдчилгаа', due: '2026-02-15', amount: 1770 },
    { id: 'MS-6', contract: 'CT-02', name: 'Ус зайлуулах суваг', due: '2026-07-31', amount: 3500 },
    { id: 'MS-7', contract: 'CT-02', name: 'Суурь давхарга', due: '2026-10-15', amount: 3000 },
    { id: 'MS-8', contract: 'CT-03', name: 'Эцсийн төлбөр', due: '2026-08-31', amount: 9400 },
    { id: 'MS-9', contract: 'CT-05', name: 'Урьдчилгаа', due: '2026-03-31', amount: 2235 },
    { id: 'MS-10', contract: 'CT-05', name: 'Дэд станцын суурь', due: '2026-08-15', amount: 1500 },
  ],
  invoices: [
    { id: 'IN-1', contract: 'CT-01', milestone: 'MS-1', amount: 2640, date: '2026-01-12', state: 'paid', paidOn: '2026-01-20', history: [] },
    { id: 'IN-2', contract: 'CT-01', milestone: 'MS-2', amount: 4400, date: '2026-06-28', state: 'paid', paidOn: '2026-07-15', history: [] },
    { id: 'IN-3', contract: 'CT-01', milestone: 'MS-3', amount: 3520, date: '2026-10-10', state: 'approved', history: [ev('2026-10-10', 'u-a', 'submitted'), ev('2026-10-13', 'u-pm', 'approved')] },
    { id: 'IN-4', contract: 'CT-02', milestone: 'MS-5', amount: 1770, date: '2026-02-10', state: 'paid', paidOn: '2026-02-20', history: [] },
    { id: 'IN-5', contract: 'CT-02', milestone: 'MS-6', amount: 3500, date: '2026-08-20', state: 'paid', paidOn: '2026-09-05', history: [] },
    { id: 'IN-6', contract: 'CT-02', milestone: 'MS-7', amount: 3000, date: '2026-10-12', state: 'submitted', history: [ev('2026-10-12', 'u-b', 'submitted')] },
    { id: 'IN-7', contract: 'CT-03', milestone: 'MS-8', amount: 9400, date: '2026-08-20', state: 'paid', paidOn: '2026-09-01', history: [] },
    { id: 'IN-8', contract: 'CT-05', milestone: 'MS-9', amount: 2235, date: '2026-03-25', state: 'paid', paidOn: '2026-04-05', history: [] },
    { id: 'IN-9', contract: 'CT-05', milestone: 'MS-10', amount: 1500, date: '2026-08-10', state: 'rejected', history: [ev('2026-08-10', 'u-d', 'submitted'), ev('2026-08-14', 'u-pm', 'rejected', 'Гүйцэтгэлийн акт дутуу')] },
  ],
  inspections: [
    { id: 'QI-1', kind: 'material', pkg: 'PKG-01', title: 'Арматур Ø16 — гэрчилгээ', date: '2026-05-12', by: 'u-eng', checklist: [{ item: 'Гэрчилгээ', ok: true }, { item: 'Диаметр', ok: true }, { item: 'Зэвэрсэн эсэх', ok: true }], result: 'pass', at: [110, 290] },
    { id: 'QI-2', kind: 'material', pkg: 'PKG-01', title: 'Бетон B30 — шахалтын туршилт', date: '2026-09-28', by: 'u-eng', checklist: [{ item: '7 хоногийн бат бэх', ok: true }, { item: '28 хоногийн бат бэх', ok: false }], result: 'fail', at: [120, 300] },
    { id: 'QI-3', kind: 'work', pkg: 'PKG-02', title: 'Суурь давхаргын нягтрал', date: '2026-10-06', by: 'u-eng', checklist: [{ item: 'Нягтрал ≥ 0.98', ok: false }, { item: 'Зузаан', ok: true }], result: 'fail', at: [230, 420] },
    { id: 'QI-4', kind: 'work', pkg: 'PKG-03', title: 'Шугамын даралтын туршилт', date: '2026-07-30', by: 'u-eng', checklist: [{ item: 'Даралт 1.5×', ok: true }, { item: 'Алдагдал', ok: true }], result: 'pass', at: [430, 245] },
  ],
  defects: [
    { id: 'NC-1', pkg: 'PKG-01', inspection: 'QI-2', title: 'L5 хучилтын бетоны бат бэх хүрэлцээгүй', severity: 'high', owner: 'u-a', due: '2026-10-20', action: 'Цөмийн дээж авч дахин шалгах', state: 'review', at: [120, 300], history: [ev('2026-09-29', 'u-eng', 'opened'), ev('2026-10-08', 'u-a', 'submitted for review')] },
    { id: 'NC-2', pkg: 'PKG-02', inspection: 'QI-3', title: 'Суурь давхаргын нягтрал шаардлага хангаагүй', severity: 'medium', owner: 'u-b', due: '2026-10-12', action: 'Дахин нягтруулах', state: 'open', at: [230, 420], history: [ev('2026-10-06', 'u-eng', 'opened')] },
    { id: 'NC-3', pkg: 'PKG-01', inspection: null, title: 'Фасадны анкерын зай зөрсөн', severity: 'low', owner: 'u-a', due: '2026-11-15', action: 'Зураг төсөлтэй тулгах', state: 'open', at: [95, 280], history: [ev('2026-10-11', 'u-eng', 'opened')] },
    { id: 'NC-4', pkg: 'PKG-03', inspection: null, title: 'Худгийн таг тохироогүй', severity: 'low', owner: 'u-c', due: '2026-08-10', action: 'Солих', state: 'resolved', at: [400, 230], history: [ev('2026-07-25', 'u-eng', 'opened'), ev('2026-08-08', 'u-c', 'resolved')] },
  ],
  safety: [
    { id: 'HS-1', kind: 'incident', pkg: 'PKG-01', title: 'Өндрөөс багаж унасан (гэмтэлгүй)', severity: 'medium', owner: 'u-a', date: '2026-10-02', due: '2026-10-16', action: 'Хамгаалалтын тор нэмэх', state: 'open', detail: 'Ажилтан Б.Д. — гэмтэл аваагүй. Гэрч: 2.', at: [100, 300], history: [ev('2026-10-02', 'u-eng', 'opened')] },
    { id: 'HS-2', kind: 'observation', pkg: 'PKG-02', title: 'Шуудууны хашлага дутуу', severity: 'high', owner: 'u-b', date: '2026-10-09', due: '2026-10-11', action: 'Хашлага, тэмдэг байрлуулах', state: 'open', at: [235, 400], history: [ev('2026-10-09', 'u-eng', 'opened')] },
    { id: 'HS-3', kind: 'risk', pkg: 'PKG-05', title: 'Цамхаг кран — салхины эрсдэл', severity: 'medium', owner: 'u-d', date: '2026-09-01', due: '2026-12-31', action: 'Салхи 15 м/с-ээс дээш бол өргөлт зогсоох журам', state: 'review', at: [400, 80], history: [ev('2026-09-01', 'u-eng', 'opened')] },
    { id: 'HS-4', kind: 'inspection', pkg: 'PKG-01', title: 'Сар бүрийн ХАБЭА-ын үзлэг — 9-р сар', severity: 'low', owner: 'u-eng', date: '2026-09-30', due: '2026-09-30', action: '3 зөрчил арилгасан', state: 'resolved', at: [80, 280], history: [ev('2026-09-30', 'u-eng', 'resolved')] },
    { id: 'HS-5', kind: 'incident', pkg: 'PKG-03', title: 'Шуудуунд хөрс нурсан', severity: 'high', owner: 'u-c', date: '2025-10-20', due: '2025-11-01', action: 'Бэхэлгээний журам шинэчилсэн', state: 'resolved', detail: 'Ажилтан Г.Т. — хөнгөн гэмтэл, эмнэлэгт үзүүлсэн.', at: [420, 240], history: [ev('2025-10-20', 'u-eng', 'opened'), ev('2025-10-30', 'u-pm', 'resolved')] },
  ],
  parcels: [
    { id: 'NP-101', project: 'P-1', geom: { x: 40, y: 240, w: 70, h: 60 }, status: 'cleared', responsible: 'O-CL', started: '2025-06-01', target: '2025-12-01', done: '2025-11-20', docs: ['D-8'], issues: '' },
    { id: 'NP-102', project: 'P-1', geom: { x: 115, y: 240, w: 70, h: 60 }, status: 'cleared', responsible: 'O-CL', started: '2025-06-01', target: '2025-12-01', done: '2025-12-05', docs: [], issues: '' },
    { id: 'NP-103', project: 'P-1', geom: { x: 185, y: 370, w: 50, h: 50 }, status: 'agreed', responsible: 'O-CL', started: '2026-01-10', target: '2026-09-30', docs: [], issues: 'Нөхөх олговрын гэрээ байгуулагдсан, нүүлгэн шилжүүлэлт хүлээгдэж байна' },
    { id: 'NP-104', project: 'P-1', geom: { x: 235, y: 370, w: 50, h: 50 }, status: 'disputed', responsible: 'O-CL', started: '2026-01-10', target: '2026-09-30', docs: [], issues: 'Үнэлгээний маргаан — шүүхэд' },
    { id: 'NP-105', project: 'P-1', geom: { x: 600, y: 280, w: 80, h: 60 }, status: 'negotiating', responsible: 'O-CL', started: '2026-07-01', target: '2027-01-31', docs: [], issues: '' },
    { id: 'NP-106', project: 'P-1', geom: { x: 680, y: 280, w: 70, h: 60 }, status: 'not_started', responsible: 'O-CL', started: '2026-11-01', target: '2027-03-31', docs: [], issues: '' },
    { id: 'NP-107', project: 'P-1', geom: null, status: 'negotiating', responsible: 'O-CL', started: '2026-08-01', target: '2026-12-31', docs: [], issues: 'Хил заагийн зураг ирээгүй' },
  ],
  permits: [
    { id: 'PM-1', type: 'Барилга барих зөвшөөрөл', ref: 'ББЗ-2025/1142', pkg: 'PKG-01', org: 'C-A', submitted: '2025-11-01', decided: '2025-12-01', expires: '2027-12-01', status: 'approved', owner: 'u-pm', docs: ['D-5'], comments: [ev('2025-12-01', 'O-AU', 'approved')], requirements: [] },
    { id: 'PM-2', type: 'Зам ухах зөвшөөрөл', ref: 'ЗУЗ-2026/088', pkg: 'PKG-02', org: 'C-B', submitted: '2026-02-01', decided: '2026-02-20', expires: '2026-10-31', status: 'approved', owner: 'u-pm', docs: [], comments: [], requirements: ['Сунгах хүсэлт 30 хоногийн өмнө'] },
    { id: 'PM-3', type: 'Дулааны шугамд холбогдох техникийн нөхцөл', ref: 'ТН-2026/311', pkg: 'PKG-05', org: 'C-D', submitted: '2026-09-01', status: 'pending', owner: 'u-pm', docs: [], comments: [ev('2026-09-20', 'O-UT', 'comment', 'Даралтын тооцоо дутуу')], requirements: ['Даралтын тооцоо', 'Трассын зураг'] },
    { id: 'PM-4', type: 'Барилга барих зөвшөөрөл', ref: '—', pkg: 'PKG-04', org: 'O-CL', submitted: '2026-08-15', status: 'pending', owner: 'u-pm', docs: [], comments: [], requirements: ['БОНБҮ', 'Зураг төслийн экспертиз'] },
    { id: 'PM-5', type: 'Түр зам хаах зөвшөөрөл', ref: 'ТЗХ-2026/014', pkg: 'PKG-02', org: 'C-B', submitted: '2026-03-01', decided: '2026-03-05', expires: '2026-09-30', status: 'expired', owner: 'u-pm', docs: [], comments: [], requirements: [] },
    { id: 'PM-6', type: 'Ус ашиглах дүгнэлт', ref: 'УАД-2026/051', pkg: 'PKG-03', org: 'C-C', submitted: '2026-05-01', decided: '2026-05-25', status: 'rejected', owner: 'u-pm', docs: [], comments: [ev('2026-05-25', 'O-AU', 'rejected', 'Дахин хүсэлт гаргах')], requirements: [] },
  ],
  assets: [
    { id: 'IN-W1', kind: 'water', name: 'Цэвэр усны магистраль Ø300', pkg: 'PKG-03', org: 'O-UT', geom: [[0, 225], [800, 225]], planned: 100, actual: 100, status: 'completed', attrs: { 'Диаметр': '300 мм', 'Урт': '800 м', 'Материал': 'HDPE' }, docs: [] },
    { id: 'IN-W2', kind: 'water', name: 'Цэвэр усны салбар шугам', pkg: 'PKG-03', org: 'O-UT', geom: [[325, 0], [325, 520]], planned: 100, actual: 100, status: 'completed', attrs: { 'Диаметр': '200 мм' }, docs: [] },
    { id: 'IN-H1', kind: 'heat', name: 'Дулааны шугам 2Ø400', pkg: 'PKG-05', org: 'O-UT', geom: [[0, 205], [800, 205]], planned: 35, actual: 22, status: 'delayed', attrs: { 'Диаметр': '2×400 мм', 'Урт': '800 м' }, docs: [] },
    { id: 'IN-H2', kind: 'heat', name: 'Дулааны салбар шугам', pkg: 'PKG-05', org: 'O-UT', geom: [[565, 0], [565, 520]], planned: 10, actual: 8, status: 'ongoing', attrs: {}, docs: [] },
    { id: 'IN-P1', kind: 'power', name: '10 кВ кабель шугам', pkg: 'PKG-05', org: 'O-UT', geom: [[0, 345], [800, 345]], planned: 0, actual: 0, status: 'planned', attrs: { 'Хүчдэл': '10 кВ' }, docs: [] },
    { id: 'IN-S1', kind: 'sewer', name: 'Бохир усны шугам Ø400', pkg: 'PKG-03', org: 'O-UT', geom: [[0, 235], [800, 235]], planned: 100, actual: 100, status: 'completed', attrs: {}, docs: [] },
    { id: 'IN-R1', kind: 'road', name: 'Гудамж 1 — явган зам', pkg: 'PKG-02', org: 'C-B', geom: [[190, 470], [280, 470]], planned: 75, actual: 55, status: 'delayed', attrs: { 'Өргөн': '12 м' }, docs: [] },
    { id: 'IN-T1', kind: 'telecom', name: 'Холбооны шугам', pkg: 'PKG-02', org: 'O-UT', geom: null, planned: 0, actual: null, status: 'planned', attrs: {}, docs: [] },
  ],
  sensors: [
    { sensor: 'CR-01', pkg: 'PKG-01', asset: 'BLD-0412', at: [70, 270] },
    { sensor: 'CT-07', pkg: 'PKG-01', asset: 'BLD-0412', at: [100, 285] },
    { sensor: 'CT-08', pkg: 'PKG-01', asset: 'BLD-0412', at: [125, 300] },
    { sensor: 'ST-02', pkg: 'PKG-01', asset: 'BLD-0412', at: [160, 270] },
    { sensor: 'ST-04', pkg: 'PKG-01', asset: 'BLD-0412', at: [70, 330] },
    { sensor: 'TL-01', pkg: 'PKG-01', asset: 'BLD-0412', at: [150, 325] },
    { sensor: 'DS-03', pkg: 'PKG-02', asset: 'Талбайн хил', at: [200, 460] },
    { sensor: 'NS-01', pkg: 'PKG-02', asset: 'Талбайн хил', at: [270, 390] },
  ],
  indicators: [
    { id: 'EI-1', group: 'env', name: 'Тоосжилт PM10 (талбайн хил)', unit: 'µг/м³', period: '2026 III улирал', source: 'DS-03 мэдрэгч (симуляц)', method: 'measured', baseline: 120, current: 110, better: 'lower', definition: 'Улирлын дундаж, 24 цагийн утгуудаас' },
    { id: 'EI-2', group: 'env', name: 'Дуу чимээ (орон сууцны тал)', unit: 'дБ', period: '2026 III улирал', source: 'NS-01 мэдрэгч (симуляц)', method: 'measured', baseline: 70, current: 68, better: 'lower', definition: 'Өдрийн цагийн дундаж (07–22)' },
    { id: 'EI-3', group: 'env', name: 'Ногоон байгууламжийн талбай', unit: 'га', period: 'Төсөл дуусахад', source: 'Ерөнхий төлөвлөгөө', method: 'calculated', baseline: 2.1, current: 3.4, better: 'higher', definition: 'Төлөвлөгөөний ногоон бүсийн нийлбэр' },
    { id: 'EI-4', group: 'env', name: 'Хөрсний бохирдол (хүнд металл)', unit: 'мг/кг', period: '—', source: 'Лабораторийн шинжилгээ хийгдээгүй', method: 'measured', baseline: null, current: null, better: 'lower', definition: 'Хөрсний дээжийн шинжилгээ' },
    { id: 'SI-1', group: 'social', name: 'Сургууль хүртэлх алхах зай (дундаж)', unit: 'м', period: 'Төсөл дуусахад', source: 'GIS сүлжээний шинжилгээ', method: 'calculated', baseline: 1350, current: 520, better: 'lower', definition: 'Айл өрх бүрээс хамгийн ойр сургууль хүртэлх замын сүлжээгээрх зай' },
    { id: 'SI-2', group: 'social', name: 'Нийтийн тээврийн буудал 400 м-т хүрэх айл', unit: '%', period: 'Төсөл дуусахад', source: 'GIS сүлжээний шинжилгээ', method: 'calculated', baseline: 58, current: 91, better: 'higher', definition: 'Буудлаас 400 м явган зайд орших айл өрхийн хувь' },
    { id: 'SI-3', group: 'social', name: 'Шинээр бий болох ажлын байр', unit: 'хүн', period: 'Барилгын хугацаанд', source: 'Гүйцэтгэгчдийн мэдүүлэг', method: 'estimated', baseline: null, current: 640, better: 'higher', definition: 'Гүйцэтгэгчдийн ажиллах хүчний төлөвлөгөөний нийлбэр' },
  ],
  risks: [
    { id: 'ER-1', title: 'Барилгын тоос — хөрш сургууль', level: 'high', mitigation: 'Ус цацах, тоос дарагч тор', owner: 'u-a', state: 'open', pkg: 'PKG-01' },
    { id: 'ER-2', title: 'Борооны ус шуудуунд хуримтлагдах', level: 'medium', mitigation: 'Түр ус зайлуулах суваг', owner: 'u-b', state: 'review', pkg: 'PKG-02' },
    { id: 'ER-3', title: 'Модны үндэс гэмтэх', level: 'low', mitigation: 'Хамгаалалтын бүс тогтоох', owner: 'u-d', state: 'resolved', pkg: 'PKG-05' },
  ],
  docs: [
    { id: 'D-1', title: 'ТЭЗҮ — хороолол дахин төлөвлөлт', type: 'feasibility', ref: 'ТЭЗҮ-2025-03', version: 3, links: {}, owner: 'u-pm', uploaded: '2025-05-20', state: 'approved', access: 'project', history: [ev('2025-05-10', 'u-pm', 'submitted'), ev('2025-05-20', 'u-admin', 'approved')] },
    { id: 'D-2', title: 'БОНҮ — байгаль орчинд нөлөөлөх байдлын үнэлгээ', type: 'eia', ref: 'БОНҮ-2025-17', version: 2, links: {}, owner: 'u-pm', uploaded: '2025-07-02', state: 'approved', access: 'public', history: [] },
    { id: 'D-3', title: 'Блок А — ажлын зураг (АЗ)', type: 'drawing', ref: 'АЗ-01-R4', version: 4, links: { pkg: 'PKG-01' }, owner: 'u-a', uploaded: '2026-09-30', state: 'review', access: 'project', history: [ev('2026-09-30', 'u-a', 'submitted')] },
    { id: 'D-4', title: 'Гэрээ — Блок А барилга угсралт', type: 'contract', ref: 'CT-01', version: 1, links: { pkg: 'PKG-01' }, owner: 'u-pm', uploaded: '2025-12-10', state: 'approved', access: 'restricted', history: [] },
    { id: 'D-5', title: 'Барилга барих зөвшөөрөл', type: 'permit', ref: 'ББЗ-2025/1142', version: 1, links: { pkg: 'PKG-01', permit: 'PM-1' }, owner: 'u-pm', uploaded: '2025-12-02', state: 'approved', access: 'project', history: [] },
    { id: 'D-6', title: 'Бетоны шахалтын туршилтын акт', type: 'inspection', ref: 'QI-2', version: 1, links: { pkg: 'PKG-01' }, owner: 'u-eng', uploaded: '2026-09-29', state: 'approved', access: 'project', history: [] },
    { id: 'D-7', title: 'Гудамж 1 — ажлын зураг', type: 'drawing', ref: 'АЗ-02-R2', version: 2, links: { pkg: 'PKG-02' }, owner: 'u-b', uploaded: '2026-05-11', state: 'superseded', access: 'project', history: [] },
    { id: 'D-8', title: 'Газар чөлөөлөлтийн акт — NP-101', type: 'other', ref: 'ГЧ-101', version: 1, links: { parcel: 'NP-101' }, owner: 'u-pm', uploaded: '2025-11-21', state: 'approved', access: 'restricted', history: [] },
  ],
  audit: [],
};
