// DEMONSTRATION DATA — the project risk register kept by the "Эрсдэлийн загвар" page (see components/construction/extra).
// Probability and impact are 1–5; the score is their product. `rp` / `ri` are the expected values once the
// mitigation is in place (the residual risk). Ids point at the sample project in ../demo.ts.

import type { Event, Id } from '../types';

export type RiskCat = 'schedule' | 'cost' | 'technical' | 'safety' | 'environmental' | 'social' | 'permits';
export const RISK_CATS: RiskCat[] = ['schedule', 'cost', 'technical', 'safety', 'environmental', 'social', 'permits'];
export type Trend = 'up' | 'flat' | 'down';
export type RiskState = 'open' | 'closed';

export type Risk = {
  id: Id;
  title: string;
  cat: RiskCat;
  pkg: Id;
  owner: Id;
  p: number;
  i: number;
  rp: number;
  ri: number;
  mitigation: string;
  // when the mitigation should be in place
  due: string;
  trend: Trend;
  state: RiskState;
  // a related record elsewhere in the workspace (permit, defect, H&S record, parcel…)
  ref?: string;
  history: Event[];
};

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });

export const RISKS: Risk[] = [
  { id: 'RK-1', title: 'Газар чөлөөлөлтийн маргаан гудамжны ажлыг хоцрооно', cat: 'schedule', pkg: 'PKG-02', owner: 'u-pm', p: 4, i: 4, rp: 2, ri: 3, mitigation: 'Маргаантай нэгж талбарыг тойруулсан түр трасс, шүүхийн шийдвэрийг хүлээх хооронд бусад хэсгийг урагшлуулах', due: '2026-11-30', trend: 'up', state: 'open', ref: 'NP-104', history: [ev('2026-02-10', 'u-pm', 'opened'), ev('2026-09-15', 'u-pm', 'score 12 → 16', 'Шүүх хурал хойшилсон')] },
  { id: 'RK-2', title: 'Арматур, цементийн үнийн өсөлт', cat: 'cost', pkg: 'PKG-01', owner: 'u-pm', p: 3, i: 4, rp: 2, ri: 3, mitigation: 'Үлдсэн давхруудын арматурыг урьдчилан худалдан авах, гэрээнд үнийн тохируулгын заалт', due: '2026-12-15', trend: 'flat', state: 'open', history: [ev('2026-03-01', 'u-pm', 'opened')] },
  { id: 'RK-3', title: 'L5 хучилтын бетоны бат бэх хүрэлцээгүй — бүтээцийн аюулгүй байдал', cat: 'technical', pkg: 'PKG-01', owner: 'u-eng', p: 3, i: 5, rp: 1, ri: 4, mitigation: 'Цөмийн дээжийн шинжилгээ, шаардлагатай бол бүтээцийн бэхжүүлэлт; бетон нийлүүлэгчийн хяналтыг чангатгах', due: '2026-10-31', trend: 'flat', state: 'open', ref: 'NC-1', history: [ev('2026-09-29', 'u-eng', 'opened')] },
  { id: 'RK-4', title: 'Цамхаг кран — хүчтэй салхины ачаалал', cat: 'safety', pkg: 'PKG-05', owner: 'u-d', p: 3, i: 5, rp: 2, ri: 4, mitigation: 'Салхи 15 м/с-ээс дээш үед өргөлт зогсоох журам, анемометрийн сэрэмжлүүлэг', due: '2026-11-15', trend: 'down', state: 'open', ref: 'HS-3', history: [ev('2026-09-01', 'u-eng', 'opened'), ev('2026-10-05', 'u-eng', 'score 20 → 15', 'Журам батлагдсан')] },
  { id: 'RK-5', title: 'Дулааны шугамын техникийн нөхцөл хойшлох', cat: 'permits', pkg: 'PKG-05', owner: 'u-pm', p: 4, i: 3, rp: 2, ri: 3, mitigation: 'Даралтын тооцоо, трассын зургийг 10 хоногт дахин ирүүлэх; шугам сүлжээний газартай долоо хоног бүр уулзах', due: '2026-10-30', trend: 'up', state: 'open', ref: 'PM-3', history: [ev('2026-09-20', 'u-pm', 'opened')] },
  { id: 'RK-6', title: 'Сургуулийн барилгын зөвшөөрөл — экспертизийн дүгнэлт удаашрах', cat: 'permits', pkg: 'PKG-04', owner: 'u-pm', p: 3, i: 4, rp: 2, ri: 3, mitigation: 'Зураг төслийн экспертизийг урьдчилсан байдлаар хянуулах, БОНБҮ-г зэрэгцүүлэн бэлтгэх', due: '2027-01-15', trend: 'flat', state: 'open', ref: 'PM-4', history: [ev('2026-08-20', 'u-pm', 'opened')] },
  { id: 'RK-7', title: 'Зам хаалтаас оршин суугчдын гомдол, тээврийн саатал', cat: 'social', pkg: 'PKG-02', owner: 'u-b', p: 4, i: 2, rp: 2, ri: 2, mitigation: 'Тойруу замын тэмдэглэгээ, хорооны мэдээллийн самбар, ажлын цагийг 08–20 болгох', due: '2026-11-10', trend: 'flat', state: 'open', history: [ev('2026-04-05', 'u-eng', 'opened')] },
  { id: 'RK-8', title: 'Өвлийн хүйтэнд дулааны шугам угсралт зогсох', cat: 'schedule', pkg: 'PKG-05', owner: 'u-d', p: 5, i: 3, rp: 3, ri: 2, mitigation: 'Гагнуурын халаалттай майхан, хүйтний үеийн ажлын технологийн карт; ухалтыг 11-р сарын 15-аас өмнө дуусгах', due: '2026-11-15', trend: 'up', state: 'open', history: [ev('2026-09-10', 'u-pm', 'opened')] },
  { id: 'RK-9', title: 'Тендерийн үнэ сургуулийн багцын төсвөөс давах', cat: 'cost', pkg: 'PKG-04', owner: 'u-pm', p: 3, i: 4, rp: 2, ri: 4, mitigation: 'Зураг төслийн үнэ цэнийн шинжилгээ (value engineering), тендерийг үе шаттай зарлах', due: '2027-02-01', trend: 'flat', state: 'open', history: [ev('2026-07-15', 'u-pm', 'opened')] },
  { id: 'RK-10', title: 'Шуудууны хашлага дутуу — явган зорчигч унах', cat: 'safety', pkg: 'PKG-02', owner: 'u-b', p: 4, i: 4, rp: 1, ri: 4, mitigation: 'Шуудуу бүрт хатуу хашлага, гэрэлтүүлэг, анхааруулах тэмдэг', due: '2026-10-21', trend: 'flat', state: 'open', ref: 'HS-2', history: [ev('2026-10-09', 'u-eng', 'opened')] },
  { id: 'RK-11', title: 'Ус, бохир усны шугамын гоожилт — баталгаат хугацаанд', cat: 'technical', pkg: 'PKG-03', owner: 'u-c', p: 2, i: 3, rp: 1, ri: 3, mitigation: 'Даралтын туршилт амжилттай; баталгаат хугацааны үзлэг улирал бүр', due: '2026-08-31', trend: 'down', state: 'closed', ref: 'QI-4', history: [ev('2026-05-10', 'u-eng', 'opened'), ev('2026-08-16', 'u-eng', 'closed', 'Туршилт хэвийн, комисс хүлээн авсан')] },
];
