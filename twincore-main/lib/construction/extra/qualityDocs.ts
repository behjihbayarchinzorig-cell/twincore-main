// DEMONSTRATION DATA — quality records the "Чанарын баримт" page keeps beside the shared inspections: test
// certificates, method statements and inspection & test plans (ITP). A record in state `required` is expected by the
// ITP but not yet submitted — it counts as missing; any record not approved by its `due` date counts as overdue.

import type { Event, Id } from '../types';

export type QDocKind = 'inspection' | 'test' | 'method' | 'itp';
export type QDocState = 'required' | 'draft' | 'review' | 'approved' | 'rejected';
export type QualityRecord = {
  id: Id;
  kind: Exclude<QDocKind, 'inspection'>;
  pkg: Id;
  title: string;
  ref: string;
  by: Id;
  date: string | null;
  due: string;
  inspection: Id | null;
  activity: Id | null;
  file: string | null;
  state: QDocState;
  history: Event[];
};
// review state of an inspection record (the inspections themselves live in the shared store)
export type InspectionReview = { state: QDocState; history: Event[] };

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });

export const QUALITY_RECORDS: QualityRecord[] = [
  { id: 'TC-1', kind: 'test', pkg: 'PKG-01', title: 'Бетон B30 — 28 хоногийн шахалтын туршилтын гэрчилгээ', ref: 'ЛАБ-2026/0917', by: 'u-a', date: '2026-09-29', due: '2026-10-05', inspection: 'QI-2', activity: 'A-01-3', file: 'B30_28h_test.pdf', state: 'review', history: [ev('2026-09-29', 'u-a', 'submitted')] },
  { id: 'TC-2', kind: 'test', pkg: 'PKG-01', title: 'Арматур A500C Ø16 — үйлдвэрийн гэрчилгээ', ref: 'CERT-A500-0512', by: 'u-a', date: '2026-05-10', due: '2026-05-15', inspection: 'QI-1', activity: 'A-01-2', file: 'A500C_cert.pdf', state: 'approved', history: [ev('2026-05-10', 'u-a', 'submitted'), ev('2026-05-12', 'u-eng', 'approved')] },
  { id: 'TC-3', kind: 'test', pkg: 'PKG-02', title: 'Суурь давхаргын нягтралын дахин туршилт', ref: '—', by: 'u-b', date: null, due: '2026-10-15', inspection: 'QI-3', activity: 'A-02-3', file: null, state: 'required', history: [ev('2026-10-06', 'u-eng', 'required', 'NC-2 хаагдахаас өмнө ирүүлэх')] },
  { id: 'TC-4', kind: 'test', pkg: 'PKG-03', title: 'Шугамын гидравлик даралтын туршилтын акт', ref: 'ДТ-2026/044', by: 'u-c', date: '2026-07-30', due: '2026-08-05', inspection: 'QI-4', activity: 'A-03-3', file: 'pressure_test.pdf', state: 'approved', history: [ev('2026-07-30', 'u-c', 'submitted'), ev('2026-08-01', 'u-eng', 'approved')] },
  { id: 'TC-5', kind: 'test', pkg: 'PKG-05', title: 'Урьдчилан дулаалсан хоолой 2Ø400 — гэрчилгээ', ref: 'CERT-PI-2026-88', by: 'u-d', date: '2026-10-11', due: '2026-10-25', inspection: null, activity: 'A-05-2', file: 'PI_pipe_cert.pdf', state: 'review', history: [ev('2026-10-11', 'u-d', 'submitted')] },
  { id: 'TC-6', kind: 'test', pkg: 'PKG-02', title: 'Асфальтбетон хольцын жорын туршилт', ref: '—', by: 'u-b', date: null, due: '2027-03-15', inspection: null, activity: 'A-02-4', file: null, state: 'required', history: [] },
  { id: 'MST-1', kind: 'method', pkg: 'PKG-01', title: 'Өвлийн улиралд бетон цутгах ажлын аргачлал', ref: 'АА-01-07', by: 'u-a', date: '2026-10-13', due: '2026-10-25', inspection: null, activity: 'A-01-4', file: 'winter_concreting.pdf', state: 'review', history: [ev('2026-10-13', 'u-a', 'submitted')] },
  { id: 'MST-2', kind: 'method', pkg: 'PKG-02', title: 'Суурь давхарга нягтруулах ажлын аргачлал', ref: 'АА-02-03', by: 'u-b', date: '2026-06-02', due: '2026-06-10', inspection: null, activity: 'A-02-3', file: 'compaction_ms.pdf', state: 'approved', history: [ev('2026-06-02', 'u-b', 'submitted'), ev('2026-06-05', 'u-eng', 'approved')] },
  { id: 'MST-3', kind: 'method', pkg: 'PKG-05', title: 'Дулааны шугамын гагнуурын аргачлал (WPS)', ref: '—', by: 'u-d', date: null, due: '2026-10-10', inspection: null, activity: 'A-05-2', file: null, state: 'required', history: [ev('2026-09-20', 'u-eng', 'required')] },
  { id: 'MST-4', kind: 'method', pkg: 'PKG-01', title: 'Фасадны анкер бэхэлгээний аргачлал', ref: 'АА-01-09', by: 'u-a', date: null, due: '2026-12-15', inspection: null, activity: 'A-01-5', file: null, state: 'draft', history: [] },
  { id: 'MST-5', kind: 'method', pkg: 'PKG-03', title: 'Шуудууны хана бэхлэх аргачлал', ref: 'АА-03-02', by: 'u-c', date: '2025-08-25', due: '2025-09-01', inspection: null, activity: 'A-03-1', file: 'trench_support.pdf', state: 'rejected', history: [ev('2025-08-25', 'u-c', 'submitted'), ev('2025-08-28', 'u-eng', 'rejected', 'Хөрсний ангилал, налуугийн тооцоо дутуу')] },
  { id: 'ITP-1', kind: 'itp', pkg: 'PKG-01', title: 'Цутгамал төмөр бетон каркас — ITP', ref: 'ITP-01-R2', by: 'u-a', date: '2026-02-20', due: '2026-03-01', inspection: null, activity: null, file: 'ITP-01-R2.pdf', state: 'approved', history: [ev('2026-02-20', 'u-a', 'submitted'), ev('2026-02-25', 'u-eng', 'approved')] },
  { id: 'ITP-2', kind: 'itp', pkg: 'PKG-02', title: 'Авто зам, явган зам — ITP', ref: 'ITP-02-R1', by: 'u-b', date: '2026-02-25', due: '2026-03-01', inspection: null, activity: null, file: 'ITP-02-R1.pdf', state: 'approved', history: [ev('2026-02-25', 'u-b', 'submitted'), ev('2026-02-28', 'u-eng', 'approved')] },
  { id: 'ITP-3', kind: 'itp', pkg: 'PKG-03', title: 'Цэвэр, бохир усны шугам — ITP', ref: 'ITP-03-R1', by: 'u-c', date: '2025-08-20', due: '2025-09-01', inspection: null, activity: null, file: 'ITP-03-R1.pdf', state: 'approved', history: [ev('2025-08-20', 'u-c', 'submitted'), ev('2025-08-27', 'u-eng', 'approved')] },
  { id: 'ITP-4', kind: 'itp', pkg: 'PKG-05', title: 'Дулааны шугам, дэд станц — ITP', ref: 'ITP-05-R1', by: 'u-d', date: '2026-09-18', due: '2026-09-30', inspection: null, activity: null, file: 'ITP-05-R1.pdf', state: 'review', history: [ev('2026-09-18', 'u-d', 'submitted')] },
  { id: 'ITP-5', kind: 'itp', pkg: 'PKG-04', title: 'Сургууль, цэцэрлэг — ITP', ref: '—', by: 'u-pm', date: null, due: '2027-02-15', inspection: null, activity: null, file: null, state: 'required', history: [] },
];

// how far the shared inspections' records have got in review (QI-2 is covered by the approved document D-6)
export const INSPECTION_REVIEWS: Record<Id, InspectionReview> = {
  'QI-1': { state: 'approved', history: [ev('2026-05-12', 'u-eng', 'submitted'), ev('2026-05-13', 'u-pm', 'approved')] },
  'QI-3': { state: 'review', history: [ev('2026-10-06', 'u-eng', 'submitted')] },
  'QI-4': { state: 'approved', history: [ev('2026-07-30', 'u-eng', 'submitted'), ev('2026-08-01', 'u-pm', 'approved')] },
};
