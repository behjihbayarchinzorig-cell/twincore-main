// DEMONSTRATION DATA — the funding sources and drawdown requests kept by the "Санхүүжилт" page (see
// components/construction/extra). Money in million ₮, like the rest of the workspace. Allocations are set against
// the package budgets in ../demo.ts (PKG-01 18 400, PKG-02 12 100, PKG-03 9 600, PKG-04 22 000, PKG-05 15 300), and
// the disbursed drawdowns run a little ahead of the paid invoices there, as money arrives before it is paid out.

import type { Event, Id } from '../types';

export type SourceKind = 'state' | 'city' | 'loan' | 'ppp' | 'donor';
// committed = signed (budget law, loan agreement…); pledged = promised, not yet signed
export type SourceStatus = 'committed' | 'pledged';
export type FundingSource = { id: Id; name: string; kind: SourceKind; status: SourceStatus; amount: number; ref: string; terms: string; alloc: Record<Id, number> };

export type DrawState = 'requested' | 'approved' | 'disbursed' | 'rejected';
export type Drawdown = { id: Id; source: Id; pkg: Id; amount: number; requested: string; state: DrawState; disbursedOn?: string; purpose: string; history: Event[] };

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });

export const SOURCES: FundingSource[] = [
  { id: 'FS-1', name: 'Улсын төсөв', kind: 'state', status: 'committed', amount: 24000, ref: 'УТ-2025/ХБ-14', terms: 'Жил бүрийн төсвийн хуулиар баталгаажна', alloc: { 'PKG-02': 5000, 'PKG-03': 5000, 'PKG-04': 14000 } },
  { id: 'FS-2', name: 'Нийслэлийн төсөв', kind: 'city', status: 'committed', amount: 16500, ref: 'НЗД-2025/233', terms: 'Нийслэлийн хөрөнгө оруулалтын төлөвлөгөө; 800 сая ₮ нөөц', alloc: { 'PKG-01': 4000, 'PKG-02': 7100, 'PKG-03': 4600 } },
  { id: 'FS-3', name: 'Хөгжлийн банкны зээл', kind: 'loan', status: 'committed', amount: 22000, ref: 'ХБ-ЗГ-2025/07', terms: 'Жилийн 7%, 10 жил, 2 жилийн хөнгөлөлттэй хугацаа', alloc: { 'PKG-01': 11000, 'PKG-05': 11000 } },
  { id: 'FS-4', name: 'Төр, хувийн хэвшлийн түншлэл (ТХХТ)', kind: 'ppp', status: 'committed', amount: 6000, ref: 'ТХХТ-2026/02', terms: 'Ашиглалтын 15 жилийн гэрээ, дулааны дэд станц', alloc: { 'PKG-01': 3400, 'PKG-05': 2600 } },
  { id: 'FS-5', name: 'Олон улсын хөгжлийн түнш — хөнгөлөлттэй зээл', kind: 'donor', status: 'pledged', amount: 4000, ref: '—', terms: 'Хэлэлцээр явагдаж байна; сургуулийн багцад', alloc: { 'PKG-04': 4000 } },
];

export const DRAWDOWNS: Drawdown[] = [
  { id: 'DD-1', source: 'FS-1', pkg: 'PKG-03', amount: 5000, requested: '2025-08-20', state: 'disbursed', disbursedOn: '2025-09-10', purpose: 'Шугамын ажлын эхний санхүүжилт', history: [ev('2025-08-20', 'u-pm', 'requested'), ev('2025-08-27', 'u-admin', 'approved'), ev('2025-09-10', 'u-pm', 'disbursed')] },
  { id: 'DD-2', source: 'FS-3', pkg: 'PKG-01', amount: 3000, requested: '2026-01-05', state: 'disbursed', disbursedOn: '2026-01-15', purpose: 'CT-01 урьдчилгаа', history: [ev('2026-01-05', 'u-pm', 'requested'), ev('2026-01-09', 'u-admin', 'approved'), ev('2026-01-15', 'u-pm', 'disbursed')] },
  { id: 'DD-3', source: 'FS-2', pkg: 'PKG-02', amount: 2000, requested: '2026-02-05', state: 'disbursed', disbursedOn: '2026-02-16', purpose: 'CT-02 урьдчилгаа', history: [ev('2026-02-05', 'u-pm', 'requested'), ev('2026-02-10', 'u-admin', 'approved'), ev('2026-02-16', 'u-pm', 'disbursed')] },
  { id: 'DD-4', source: 'FS-3', pkg: 'PKG-05', amount: 2300, requested: '2026-03-20', state: 'disbursed', disbursedOn: '2026-04-01', purpose: 'CT-05 урьдчилгаа', history: [ev('2026-03-20', 'u-pm', 'requested'), ev('2026-03-25', 'u-admin', 'approved'), ev('2026-04-01', 'u-pm', 'disbursed')] },
  { id: 'DD-5', source: 'FS-3', pkg: 'PKG-01', amount: 3000, requested: '2026-06-22', state: 'disbursed', disbursedOn: '2026-07-10', purpose: 'Суурь дууссаны төлбөр (MS-2)', history: [ev('2026-06-22', 'u-pm', 'requested'), ev('2026-06-30', 'u-admin', 'approved'), ev('2026-07-10', 'u-pm', 'disbursed')] },
  { id: 'DD-6', source: 'FS-4', pkg: 'PKG-01', amount: 1500, requested: '2026-06-22', state: 'disbursed', disbursedOn: '2026-07-10', purpose: 'Суурь дууссаны төлбөр (MS-2)', history: [ev('2026-06-22', 'u-pm', 'requested'), ev('2026-07-01', 'u-admin', 'approved'), ev('2026-07-10', 'u-pm', 'disbursed')] },
  { id: 'DD-7', source: 'FS-2', pkg: 'PKG-03', amount: 4600, requested: '2026-08-15', state: 'disbursed', disbursedOn: '2026-08-28', purpose: 'Эцсийн төлбөр (MS-8)', history: [ev('2026-08-15', 'u-pm', 'requested'), ev('2026-08-20', 'u-admin', 'approved'), ev('2026-08-28', 'u-pm', 'disbursed')] },
  { id: 'DD-8', source: 'FS-4', pkg: 'PKG-05', amount: 1500, requested: '2026-08-12', state: 'rejected', purpose: 'Дэд станцын суурь (MS-10)', history: [ev('2026-08-12', 'u-pm', 'requested'), ev('2026-08-16', 'u-admin', 'rejected', 'Нэхэмжлэх буцаагдсан — гүйцэтгэлийн акт дутуу')] },
  { id: 'DD-9', source: 'FS-1', pkg: 'PKG-02', amount: 3600, requested: '2026-08-25', state: 'disbursed', disbursedOn: '2026-09-03', purpose: 'Ус зайлуулах сувгийн төлбөр (MS-6)', history: [ev('2026-08-25', 'u-pm', 'requested'), ev('2026-08-29', 'u-admin', 'approved'), ev('2026-09-03', 'u-pm', 'disbursed')] },
  { id: 'DD-10', source: 'FS-3', pkg: 'PKG-01', amount: 3600, requested: '2026-10-13', state: 'approved', purpose: 'Каркас 6 давхрын төлбөр (MS-3, IN-3)', history: [ev('2026-10-13', 'u-pm', 'requested'), ev('2026-10-16', 'u-admin', 'approved')] },
  { id: 'DD-11', source: 'FS-2', pkg: 'PKG-02', amount: 3000, requested: '2026-10-14', state: 'requested', purpose: 'Суурь давхаргын төлбөр (MS-7, IN-6)', history: [ev('2026-10-14', 'u-pm', 'requested')] },
];
