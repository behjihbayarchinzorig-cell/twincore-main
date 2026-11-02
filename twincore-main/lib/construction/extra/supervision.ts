// Sample records for the technical supervision page (ТУХ): the supervising engineer's site visits and the written
// instructions issued to contractors. Ids refer to the demo's packages, users and inspections (lib/construction/demo.ts).

import type { Event, Id } from '../types';

export type VisitKind = 'planned' | 'unplanned' | 'joint';
export type Visit = {
  id: Id;
  date: string;
  pkg: Id;
  by: Id;
  kind: VisitKind;
  crew: number | null; // workers counted on site; null when not counted
  plant?: number | null; // machines and plant counted on site; null when not counted
  summary: string;
  findings: string[];
  inspection: Id | null; // a QA/QC inspection carried out during the visit
};

export type InstructionState = 'open' | 'answered' | 'closed';
export type Instruction = {
  id: Id;
  ref: string;
  pkg: Id;
  issued: string;
  by: Id;
  subject: string;
  action: string;
  due: string;
  state: InstructionState;
  visit: Id | null;
  response?: { at: string; by: Id; text: string };
  history: Event[];
};

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });

export const VISITS: Visit[] = [
  { id: 'SV-1', date: '2026-07-30', pkg: 'PKG-03', by: 'u-eng', kind: 'joint', crew: 14, plant: 3, summary: 'Шугамын даралтын туршилтыг захиалагч, ашиглалтын байгууллагатай хамтран хянав.', findings: ['Туршилтын даралт 1.5× хэвийн', 'Гүйцэтгэлийн зураг дутуу'], inspection: 'QI-4' },
  { id: 'SV-2', date: '2026-09-15', pkg: 'PKG-05', by: 'u-eng', kind: 'planned', crew: 22, plant: 6, summary: 'Дэд станцын суурийн арматур, хэвлэмэлийг цутгалтын өмнө шалгав.', findings: [], inspection: null },
  { id: 'SV-3', date: '2026-09-28', pkg: 'PKG-01', by: 'u-eng', kind: 'planned', crew: 46, plant: 9, summary: 'L5 хучилтын бетоны дээжийн шахалтын туршилтын дүнг хянав.', findings: ['28 хоногийн бат бэх B30 хүрээгүй', 'Бетон арчилгааны бүртгэл хөтлөгдөөгүй'], inspection: 'QI-2' },
  { id: 'SV-4', date: '2026-10-06', pkg: 'PKG-02', by: 'u-eng', kind: 'planned', crew: 18, plant: 5, summary: 'Суурь давхаргын нягтралыг хээрийн аргаар шалгав.', findings: ['Нягтрал 0.95 — шаардлага ≥ 0.98', '2-р хэсгийн зузаан хэвийн'], inspection: 'QI-3' },
  { id: 'SV-5', date: '2026-10-09', pkg: 'PKG-02', by: 'u-eng', kind: 'unplanned', crew: 12, plant: 4, summary: 'Гэнэтийн үзлэг: шуудуу, түр замын аюулгүй байдал.', findings: ['Шуудууны 40 м хэсэгт хашлага байхгүй', 'Шөнийн гэрэлтүүлэг дутуу'], inspection: null },
  { id: 'SV-6', date: '2026-10-12', pkg: 'PKG-05', by: 'u-eng', kind: 'planned', crew: 25, plant: 7, summary: 'Дулааны шугамын гагнуурын ажил, хоолойн тусгаарлалтыг хянав.', findings: ['Хоёр гагнуурчны гэрчилгээний хугацаа дууссан'], inspection: null },
  { id: 'SV-7', date: '2026-10-15', pkg: 'PKG-01', by: 'u-eng', kind: 'joint', crew: 52, plant: 11, summary: 'Захиалагчтай хамтарсан долоо хоногийн үзлэг: каркас 6 давхар, фасадны бэлтгэл.', findings: ['Фасадны анкерын зай ажлын зурагтай зөрсөн', 'Барилгын хог түр талбайд хуримтлагдсан'], inspection: null },
];

export const INSTRUCTIONS: Instruction[] = [
  { id: 'TI-1', ref: 'ТЗ-2026/028', pkg: 'PKG-03', issued: '2026-07-30', by: 'u-eng', subject: 'Гүйцэтгэлийн зураг (as-built)', action: 'Шугамын гүйцэтгэлийн зураг, координатын хэмжилтийг хүлээлгэх комисс хуралдахаас өмнө ирүүлэх.', due: '2026-08-10', state: 'closed', visit: 'SV-1', response: { at: '2026-08-08', by: 'u-c', text: 'Гүйцэтгэлийн зураг, GPS хэмжилтийн тайланг хавсаргав.' }, history: [ev('2026-07-30', 'u-eng', 'issued'), ev('2026-08-08', 'u-c', 'answered'), ev('2026-08-09', 'u-eng', 'closed')] },
  { id: 'TI-2', ref: 'ТЗ-2026/031', pkg: 'PKG-01', issued: '2026-09-29', by: 'u-eng', subject: 'L5 хучилтын бетоны бат бэх', action: 'Цөмийн дээж авч итгэмжлэгдсэн лабораторид шалгуулах; дүн гартал L5 хучилтад ачаалал өгөхгүй.', due: '2026-10-10', state: 'answered', visit: 'SV-3', response: { at: '2026-10-08', by: 'u-a', text: '6 цөмийн дээжийг 10/08-нд авч лабораторид хүлээлгэсэн. Дүн 10/22-нд гарна. Ачаалал өгөхийг зогсоосон.' }, history: [ev('2026-09-29', 'u-eng', 'issued'), ev('2026-10-08', 'u-a', 'answered')] },
  { id: 'TI-3', ref: 'ТЗ-2026/033', pkg: 'PKG-02', issued: '2026-10-06', by: 'u-eng', subject: 'Суурь давхаргын нягтрал', action: 'Шаардлага хангаагүй хэсгийг дахин нягтруулж, нягтралын туршилтыг хяналтын инженер байлцуулан хийх.', due: '2026-10-14', state: 'open', visit: 'SV-4', history: [ev('2026-10-06', 'u-eng', 'issued')] },
  { id: 'TI-4', ref: 'ТЗ-2026/034', pkg: 'PKG-02', issued: '2026-10-09', by: 'u-eng', subject: 'Шуудууны хашлага, гэрэлтүүлэг', action: 'Шуудууны бүх уртад хашлага, анхааруулах тэмдэг, шөнийн гэрэлтүүлэг байрлуулах.', due: '2026-10-11', state: 'closed', visit: 'SV-5', response: { at: '2026-10-11', by: 'u-b', text: 'Хашлага 120 м, гэрэлтүүлэг 6 цэгт байрлуулсан, фото хавсаргав.' }, history: [ev('2026-10-09', 'u-eng', 'issued'), ev('2026-10-11', 'u-b', 'answered'), ev('2026-10-12', 'u-eng', 'closed', 'Газар дээр шалгаж баталгаажуулав')] },
  { id: 'TI-5', ref: 'ТЗ-2026/035', pkg: 'PKG-05', issued: '2026-10-12', by: 'u-eng', subject: 'Гагнуурчдын гэрчилгээ, гагнуурын хяналт', action: 'Хүчинтэй гэрчилгээгүй гагнуурчдыг ажлаас чөлөөлөх; гүйцэтгэсэн гагнуурын 10%-д радиограф шинжилгээ хийлгэх.', due: '2026-10-26', state: 'open', visit: 'SV-6', history: [ev('2026-10-12', 'u-eng', 'issued')] },
  { id: 'TI-6', ref: 'ТЗ-2026/036', pkg: 'PKG-01', issued: '2026-10-15', by: 'u-eng', subject: 'Фасадны анкерын байршил', action: 'Анкерын зайг ажлын зурагтай (АЗ-01-R4) тулган засах; зөрүүтэй хэсгийн схемийг ирүүлэх.', due: '2026-10-29', state: 'open', visit: 'SV-7', history: [ev('2026-10-15', 'u-eng', 'issued')] },
  { id: 'TI-7', ref: 'ТЗ-2026/037', pkg: 'PKG-01', issued: '2026-10-15', by: 'u-eng', subject: 'Барилгын хог хаягдал', action: 'Түр талбайн хогийг 3 хоногт зайлуулж, долоо хоног бүр ачих хуваарь гаргах.', due: '2026-10-18', state: 'open', visit: 'SV-7', history: [ev('2026-10-15', 'u-eng', 'issued')] },
];
