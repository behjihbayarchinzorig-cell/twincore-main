// DEMONSTRATION DATA — extra work / variation orders (the "Нэмэлт ажил батлах" page). Cost in million ₮, time impact
// in calendar days. The approved cost may differ from the claim: the reviewer can reduce it.

import type { Event, Id } from '../types';

export type VariationReason = 'design' | 'site' | 'client' | 'error';
export type VariationState = 'submitted' | 'review' | 'approved' | 'rejected';
export type Variation = {
  id: Id;
  pkg: Id;
  org: Id;
  activity: Id | null;
  title: string;
  description: string;
  reason: VariationReason;
  cost: number;
  days: number;
  approvedCost?: number;
  approvedDays?: number;
  attachments: string[];
  by: Id;
  submitted: string;
  state: VariationState;
  history: Event[];
};

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });

export const VARIATIONS: Variation[] = [
  {
    id: 'VO-1',
    pkg: 'PKG-01',
    org: 'C-A',
    activity: 'A-01-2',
    title: 'Подвалын гидроизоляцийг 2 давхар болгох',
    description: 'Гүний ус төлөвлөснөөс 0.8 м өндөр илэрсэн тул подвалын хана, шалны ус тусгаарлалтыг 2 давхар мембранаар хийнэ.',
    reason: 'site',
    cost: 185,
    days: 12,
    approvedCost: 170,
    approvedDays: 10,
    attachments: ['VO-1_tootsoo.pdf', 'gunii_us_hemjilt.pdf'],
    by: 'u-a',
    submitted: '2026-04-18',
    state: 'approved',
    history: [ev('2026-04-18', 'u-a', 'submitted'), ev('2026-04-21', 'u-eng', 'review'), ev('2026-04-28', 'u-pm', 'approved', 'Ажлын тоо хэмжээг 8%-иар бууруулж баталсан')],
  },
  {
    id: 'VO-2',
    pkg: 'PKG-01',
    org: 'C-A',
    activity: 'A-01-5',
    title: 'Цонхны профилийг 5 камертай болгох',
    description: 'Захиалагчийн шийдвэрээр дулаан хадгалалтыг сайжруулах зорилгоор 3 камертай PVC профилийг 5 камертайгаар солих.',
    reason: 'client',
    cost: 420,
    days: 0,
    attachments: ['VO-2_unijn_sanal.pdf'],
    by: 'u-a',
    submitted: '2026-10-06',
    state: 'review',
    history: [ev('2026-10-06', 'u-a', 'submitted'), ev('2026-10-09', 'u-eng', 'review', 'Нийлүүлэгчийн 3 үнийн санал шаардлагатай')],
  },
  {
    id: 'VO-3',
    pkg: 'PKG-02',
    org: 'C-B',
    activity: 'A-02-4',
    title: 'NP-104 талбайг тойруулж явган замын трасс өөрчлөх',
    description: 'Газрын маргаан шийдвэрлэгдэх хүртэл явган замыг 45 м урт түр трассаар тойруулж, хашлага, гэрэлтүүлэг нэмнэ.',
    reason: 'design',
    cost: 260,
    days: 21,
    attachments: ['VO-3_trass.pdf', 'VO-3_tosov.xlsx'],
    by: 'u-b',
    submitted: '2026-10-15',
    state: 'submitted',
    history: [ev('2026-10-15', 'u-b', 'submitted')],
  },
  {
    id: 'VO-4',
    pkg: 'PKG-02',
    org: 'C-B',
    activity: 'A-02-3',
    title: 'Суурь давхаргын сул хөрсийг солих',
    description: 'ПК 2+40 – 3+10 хэсэгт сул шавранцар хөрс илэрсэн; 0.6 м зузаан хөрсийг хайрган дэвсгэрээр солих.',
    reason: 'site',
    cost: 340,
    days: 18,
    approvedCost: 340,
    approvedDays: 14,
    attachments: ['VO-4_geotech.pdf'],
    by: 'u-b',
    submitted: '2026-07-22',
    state: 'approved',
    history: [ev('2026-07-22', 'u-b', 'submitted'), ev('2026-07-24', 'u-eng', 'review'), ev('2026-08-02', 'u-pm', 'approved', 'Хугацааг 14 хоногоор баталсан')],
  },
  {
    id: 'VO-5',
    pkg: 'PKG-03',
    org: 'C-C',
    activity: 'A-03-2',
    title: 'Үзлэгийн худаг 2 ширхэг нэмэх',
    description: 'Зураг төсөлд орхигдсон салбар шугамын холболтын 2 худгийг нэмж угсрах.',
    reason: 'error',
    cost: 48,
    days: 5,
    approvedCost: 48,
    approvedDays: 5,
    attachments: ['VO-5_zurag.pdf'],
    by: 'u-c',
    submitted: '2026-03-02',
    state: 'approved',
    history: [ev('2026-03-02', 'u-c', 'submitted'), ev('2026-03-04', 'u-eng', 'review'), ev('2026-03-10', 'u-pm', 'approved')],
  },
  {
    id: 'VO-6',
    pkg: 'PKG-05',
    org: 'C-D',
    activity: 'A-05-3',
    title: 'Дэд станцын трансформаторыг 1600 кВА болгох',
    description: 'Сургууль, цэцэрлэгийн цогцолбор (PKG-04) нэмэгдсэнээр ачааллын тооцоо өөрчлөгдсөн; 1000 кВА-ийн оронд 1600 кВА трансформатор суурилуулна.',
    reason: 'design',
    cost: 610,
    days: 30,
    attachments: ['VO-6_achaalal.pdf', 'VO-6_unijn_sanal.pdf'],
    by: 'u-d',
    submitted: '2026-10-12',
    state: 'submitted',
    history: [ev('2026-10-12', 'u-d', 'submitted')],
  },
  {
    id: 'VO-7',
    pkg: 'PKG-05',
    org: 'C-D',
    activity: 'A-05-2',
    title: 'Трассын дагуух модыг шилжүүлэн суулгах',
    description: 'Дулааны шугамын трассын дагуух 24 модыг шилжүүлэн суулгах.',
    reason: 'client',
    cost: 36,
    days: 4,
    attachments: [],
    by: 'u-d',
    submitted: '2026-08-28',
    state: 'rejected',
    history: [ev('2026-08-28', 'u-d', 'submitted'), ev('2026-08-30', 'u-eng', 'review'), ev('2026-09-05', 'u-pm', 'rejected', 'Гэрээний үнэд багтсан (БОНҮ-ийн арга хэмжээ, ER-3)')],
  },
  {
    id: 'VO-8',
    pkg: 'PKG-01',
    org: 'C-A',
    activity: 'A-01-4',
    title: 'Цахилгаан шатны худгийг өргөтгөх',
    description: 'Ачааны цахилгаан шатны загвар өөрчлөгдсөн тул худгийн хэмжээг 2.2×2.4 м болгож, хананы арматурыг нэмэгдүүлнэ.',
    reason: 'design',
    cost: 95,
    days: 7,
    attachments: ['VO-8_AZ-01-R5.pdf'],
    by: 'u-a',
    submitted: '2026-10-02',
    state: 'review',
    history: [ev('2026-10-02', 'u-a', 'submitted'), ev('2026-10-05', 'u-eng', 'review')],
  },
];
