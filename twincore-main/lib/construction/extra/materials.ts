// DEMONSTRATION DATA — material submittals (the "Материал баталгаажуулалт" page). Suppliers are fictitious. `needed`
// is when the material must be on site: an undecided submittal close to it holds up the work.

import type { Event, Id } from '../types';

export type MaterialState = 'submitted' | 'review' | 'approved' | 'approved_c' | 'rejected';
export type SampleState = 'provided' | 'pending' | 'na';
export type Submittal = {
  id: Id;
  rev: number;
  material: string;
  spec: string;
  supplier: string;
  pkg: Id;
  activity: Id | null;
  qty: string;
  sample: SampleState;
  cert: string | null;
  by: Id;
  submitted: string;
  needed: string;
  state: MaterialState;
  history: Event[];
};

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });

export const SUBMITTALS: Submittal[] = [
  { id: 'MAT-1', rev: 1, material: 'Арматур A500C Ø12–Ø25', spec: 'MNS ISO 6935-2', supplier: 'Ган Хийц ХХК', pkg: 'PKG-01', activity: 'A-01-3', qty: '410 тн', sample: 'provided', cert: 'A500C_mill_cert.pdf', by: 'u-a', submitted: '2026-04-20', needed: '2026-05-15', state: 'approved', history: [ev('2026-04-20', 'u-a', 'submitted'), ev('2026-04-22', 'u-eng', 'review'), ev('2026-04-27', 'u-eng', 'approved')] },
  { id: 'MAT-2', rev: 2, material: 'Бэлэн бетон B30 F150 W6', spec: 'MNS EN 206', supplier: 'Бетон Төв ХХК', pkg: 'PKG-01', activity: 'A-01-4', qty: '2 300 м³', sample: 'provided', cert: 'B30_mix_design.pdf', by: 'u-a', submitted: '2026-09-30', needed: '2026-10-20', state: 'approved_c', history: [ev('2026-08-15', 'u-a', 'submitted'), ev('2026-08-20', 'u-eng', 'rejected', 'Хүйтэнд тэсвэрлэх марк F100 — шаардлага F150'), ev('2026-09-30', 'u-a', 'resubmitted', 'Rev 2'), ev('2026-10-04', 'u-eng', 'approved_c', 'Өвлийн цутгалтад хүйтэн эсэргүүцэх нэмэлт заавал хэрэглэх')] },
  { id: 'MAT-3', rev: 1, material: 'Портланд цемент CEM I 42.5R', spec: 'MNS EN 197-1', supplier: 'Хөх Цемент ХХК', pkg: 'PKG-01', activity: 'A-01-2', qty: '380 тн', sample: 'provided', cert: 'CEM_I_42.5R.pdf', by: 'u-a', submitted: '2026-02-12', needed: '2026-03-01', state: 'approved', history: [ev('2026-02-12', 'u-a', 'submitted'), ev('2026-02-16', 'u-eng', 'approved')] },
  { id: 'MAT-4', rev: 1, material: 'PVC цонх, 5 камертай профиль', spec: 'MNS EN 14351-1', supplier: 'Цонх Хаус ХХК', pkg: 'PKG-01', activity: 'A-01-5', qty: '1 260 м²', sample: 'pending', cert: null, by: 'u-a', submitted: '2026-10-08', needed: '2027-01-10', state: 'submitted', history: [ev('2026-10-08', 'u-a', 'submitted')] },
  { id: 'MAT-5', rev: 1, material: 'Эрдэс хөвөн дулаалга 100 мм', spec: 'MNS EN 13162', supplier: 'Дулаан Барилга ХХК', pkg: 'PKG-01', activity: 'A-01-5', qty: '5 400 м²', sample: 'provided', cert: 'mineral_wool_DoP.pdf', by: 'u-a', submitted: '2026-10-01', needed: '2026-12-15', state: 'review', history: [ev('2026-10-01', 'u-a', 'submitted'), ev('2026-10-03', 'u-eng', 'review')] },
  { id: 'MAT-6', rev: 1, material: 'Асфальтбетон хольц AC 16 (нягт)', spec: 'MNS EN 13108-1', supplier: 'Зам Материал ХХК', pkg: 'PKG-02', activity: 'A-02-4', qty: '3 100 тн', sample: 'pending', cert: null, by: 'u-b', submitted: '2026-10-13', needed: '2026-11-05', state: 'submitted', history: [ev('2026-10-13', 'u-b', 'submitted')] },
  { id: 'MAT-7', rev: 1, material: 'Бетон хашлага чулуу 100×30×15', spec: 'MNS EN 1340', supplier: 'Бүтээмж Бетон ХХК', pkg: 'PKG-02', activity: 'A-02-4', qty: '2 850 ш', sample: 'provided', cert: 'kerb_test.pdf', by: 'u-b', submitted: '2026-09-02', needed: '2026-10-01', state: 'rejected', history: [ev('2026-09-02', 'u-b', 'submitted'), ev('2026-09-05', 'u-eng', 'review'), ev('2026-09-12', 'u-eng', 'rejected', 'Хүйтэнд тэсвэрлэх туршилт тэнцээгүй (давсны уусмал)')] },
  { id: 'MAT-8', rev: 1, material: 'Хайрган дэвсгэр 0–40 мм', spec: 'MNS EN 13242', supplier: 'Туул Карьер ХХК', pkg: 'PKG-02', activity: 'A-02-3', qty: '6 200 м³', sample: 'provided', cert: 'gravel_grading.pdf', by: 'u-b', submitted: '2026-06-05', needed: '2026-06-20', state: 'approved', history: [ev('2026-06-05', 'u-b', 'submitted'), ev('2026-06-09', 'u-eng', 'approved')] },
  { id: 'MAT-9', rev: 1, material: 'HDPE хоолой PE100 SDR17 Ø300', spec: 'MNS ISO 4427-2', supplier: 'Пласт Шугам ХХК', pkg: 'PKG-03', activity: 'A-03-2', qty: '820 м', sample: 'provided', cert: 'PE100_cert.pdf', by: 'u-c', submitted: '2025-10-01', needed: '2025-10-15', state: 'approved', history: [ev('2025-10-01', 'u-c', 'submitted'), ev('2025-10-06', 'u-eng', 'approved')] },
  { id: 'MAT-10', rev: 1, material: 'Урьдчилан дулаалсан ган хоолой 2Ø400', spec: 'MNS EN 253', supplier: 'Дулаан Шугам ХХК', pkg: 'PKG-05', activity: 'A-05-2', qty: '1 640 м', sample: 'na', cert: 'PI_pipe_cert.pdf', by: 'u-d', submitted: '2026-09-24', needed: '2026-10-28', state: 'review', history: [ev('2026-09-24', 'u-d', 'submitted'), ev('2026-09-29', 'u-eng', 'review', 'Хөөсөн дулаалгын нягтын туршилт хүлээгдэж байна')] },
  { id: 'MAT-11', rev: 1, material: 'Хуурай трансформатор 1000 кВА 10/0.4 кВ', spec: 'MNS IEC 60076-11', supplier: 'Эрчим Тоноглол ХХК', pkg: 'PKG-05', activity: 'A-05-3', qty: '2 ш', sample: 'na', cert: null, by: 'u-d', submitted: '2026-10-15', needed: '2027-06-01', state: 'submitted', history: [ev('2026-10-15', 'u-d', 'submitted')] },
];
