// DEMONSTRATION DATA — schedule revisions submitted for approval (the "Хуваарь батлах" page). Each revision proposes
// new dates for some activities of one package; approving it adds a new baseline (see the page).

import type { Event, Id } from '../types';

export type RevisionState = 'submitted' | 'approved' | 'returned';
export type RevisionChange = { activity: Id; start: string; finish: string };
export type Revision = {
  id: Id;
  pkg: Id;
  title: string;
  reason: string;
  by: Id;
  submitted: string;
  changes: RevisionChange[];
  state: RevisionState;
  // the baseline this revision became, once approved
  baseline?: Id;
  history: Event[];
};

const ev = (at: string, by: string, action: string, comment?: string): Event => ({ at, by, action, comment });

export const REVISIONS: Revision[] = [
  {
    id: 'REV-1',
    pkg: 'PKG-02',
    title: 'Гудамж, явган зам — шинэчилсэн хуваарь R2',
    reason: 'NP-104 нэгж талбарын маргаан шийдвэрлэгдээгүй, суурь давхаргын нягтралыг дахин гүйцэтгэх (NC-2). Асфальтын ажлыг 2027 оны хавар руу шилжүүлнэ.',
    by: 'u-b',
    submitted: '2026-10-14',
    changes: [
      { activity: 'A-02-2', start: '2026-04-10', finish: '2026-09-20' },
      { activity: 'A-02-3', start: '2026-08-15', finish: '2026-12-10' },
      { activity: 'A-02-4', start: '2027-04-01', finish: '2027-06-15' },
    ],
    state: 'submitted',
    history: [ev('2026-10-14', 'u-b', 'submitted')],
  },
  {
    id: 'REV-2',
    pkg: 'PKG-01',
    title: 'Блок А — каркас, фасадны хуваарь R2',
    reason: 'L5 хучилтын бетоны бат бэх хүрэлцээгүй (NC-1) тул дахин шалгалт хийсэн; 7–12 давхрын цутгалт өвлийн горимд орно.',
    by: 'u-a',
    submitted: '2026-10-10',
    changes: [
      { activity: 'A-01-3', start: '2026-06-10', finish: '2026-10-31' },
      { activity: 'A-01-4', start: '2026-10-15', finish: '2027-03-20' },
      { activity: 'A-01-5', start: '2027-03-01', finish: '2027-05-31' },
      { activity: 'A-01-6', start: '2027-03-10', finish: '2027-07-20' },
    ],
    state: 'submitted',
    history: [ev('2026-10-10', 'u-a', 'submitted'), ev('2026-10-12', 'u-eng', 'comment', 'Өвлийн бетон цутгалтын аргачлалыг хавсаргах')],
  },
  {
    id: 'REV-3',
    pkg: 'PKG-05',
    title: 'Дулааны шугам — техникийн нөхцөлөөс хамаарсан хойшлуулалт',
    reason: 'ТН-2026/311 техникийн нөхцөл хүлээгдэж байгаа тул магистральд холбох ажлыг хойшлуулна.',
    by: 'u-d',
    submitted: '2026-10-16',
    changes: [
      { activity: 'A-05-2', start: '2026-07-01', finish: '2027-10-15' },
      { activity: 'A-05-3', start: '2027-09-15', finish: '2028-03-15' },
    ],
    state: 'submitted',
    history: [ev('2026-10-16', 'u-d', 'submitted')],
  },
  {
    id: 'REV-4',
    pkg: 'PKG-03',
    title: 'Ус, бохир ус — туршилтын хугацаа сунгах',
    reason: 'Даралтын туршилтыг 2 үе шаттай хийх.',
    by: 'u-c',
    submitted: '2026-05-04',
    changes: [{ activity: 'A-03-3', start: '2026-05-15', finish: '2026-09-15' }],
    state: 'returned',
    history: [ev('2026-05-04', 'u-c', 'submitted'), ev('2026-05-08', 'u-pm', 'returned', 'Үндэслэл хангалтгүй — туршилтыг одоогийн хугацаанд багтаах боломжтой')],
  },
];
