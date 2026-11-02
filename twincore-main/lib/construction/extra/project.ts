// Sample passport for the project details page: what the demo's records don't carry (purpose, design figures,
// funding source, key milestones, who does what). Ids refer to lib/construction/demo.ts.

import type { Id } from '../types';

export type Passport = {
  project: Id;
  purpose: string;
  area: number; // ha
  funding: string;
  designer: string;
  outputs: { label: string; value: string }[];
};
// a key milestone is tied to the activity whose finish marks it: its dates and state come from the schedule
export type KeyMilestone = { id: Id; name: string; activity: Id };
export type Stake = { org: Id; role: string; contact: string };

export const PASSPORTS: Passport[] = [
  {
    project: 'P-1',
    purpose: 'Хуучин барилгажсан хэсгийг дахин төлөвлөж, орон сууц, сургууль цэцэрлэг, гудамж, инженерийн шугам сүлжээг цогцоор шинэчлэх.',
    area: 41.6,
    funding: 'Нийслэлийн төсөв, төр-хувийн хэвшлийн түншлэл',
    designer: 'Нийслэлийн ерөнхий төлөвлөгөөний газар',
    outputs: [
      { label: 'Орон сууц', value: '144 айл' },
      { label: 'Сургууль, цэцэрлэг', value: '960 + 240 хүүхэд' },
      { label: 'Гудамж, явган зам', value: '1.2 км' },
      { label: 'Ус, бохир усны шугам', value: '1.6 км' },
      { label: 'Дулааны шугам', value: '1.3 км, 1 дэд станц' },
    ],
  },
];

export const MILESTONES: KeyMilestone[] = [
  { id: 'KM-1', name: 'Ус, бохир усны шугам хүлээлгэх', activity: 'A-03-3' },
  { id: 'KM-2', name: 'Блок А — суурь дуусах', activity: 'A-01-2' },
  { id: 'KM-3', name: 'Дэд станцын суурь', activity: 'A-05-1' },
  { id: 'KM-4', name: 'Гудамжны суурь давхарга', activity: 'A-02-3' },
  { id: 'KM-5', name: 'Блок А — каркас бүрэн', activity: 'A-01-4' },
  { id: 'KM-6', name: 'Сургуулийн зураг төсөл батлах', activity: 'A-04-1' },
  { id: 'KM-7', name: 'Гудамж ашиглалтад өгөх', activity: 'A-02-4' },
  { id: 'KM-8', name: 'Блок А ашиглалтад өгөх', activity: 'A-01-6' },
  { id: 'KM-9', name: 'Дулааны сүлжээ ашиглалтад өгөх', activity: 'A-05-3' },
  { id: 'KM-10', name: 'Сургууль ашиглалтад өгөх', activity: 'A-04-3' },
];

export const STAKES: Stake[] = [
  { org: 'O-CL', role: 'Захиалагч — санхүүжилт, газар чөлөөлөлт, төслийн удирдлага', contact: 'Төслийн менежер' },
  { org: 'O-SV', role: 'Техникийн хяналт (ТУХ) — чанар, гүйцэтгэлийн баталгаажуулалт', contact: 'Хяналтын инженер' },
  { org: 'O-AU', role: 'Төрийн хяналт — зөвшөөрөл, ашиглалтад оруулах комисс', contact: 'Улсын байцаагч' },
  { org: 'O-UT', role: 'Шугам сүлжээ — техникийн нөхцөл, холболт, хүлээн авалт', contact: 'Техникийн хэлтэс' },
];
