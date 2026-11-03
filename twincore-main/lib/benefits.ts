// "TwinCore юу өгөх вэ?": the six benefits, with the performance figures exactly as supplied in the project's
// reference image. They are claims from the presentation, not independently verified results. Edit the values here;
// the page shows them as they are and never recalculates them.
//
//  claim: the improvement as it is shown on the card. Where the supplied "x%" was in fact a difference of percentage
//         points (10% → 3%), it is written as such ("7 нэгж хувиар буурсан"), never as a new percentage.
//  check: what the supplied numbers themselves give, so a reader can see where the stated figure comes from

export type BenefitIcon = 'budget' | 'calendar' | 'alert' | 'report' | 'schedule' | 'dashboard';

export type Benefit = {
  id: string;
  icon: BenefitIcon;
  name: [string, string]; // mn, en
  about: [string, string]; // what TwinCore does for it, in one sentence
  unit: [string, string];
  before: [string, string];
  after: [string, string];
  claim: [string, string];
  // numeric before / after for the comparison bars (null when the value isn't a single number)
  bars: [number, number] | null;
  check: [string, string];
};

export const BENEFITS: Benefit[] = [
  {
    id: 'budget',
    icon: 'budget',
    name: ['Төсвийн зөрүү', 'Budget performance'],
    about: ['Төлөвлөсөн төсөв, бодит зардлыг тулгаж, зөрүүг нь харна.', 'Compares the planned budget with actual cost and tracks the variance.'],
    unit: ['%', '%'],
    before: ['Зөрүү 10%', '10% variance'],
    after: ['3%', '3%'],
    claim: ['7 нэгж хувиар буурсан', 'Down 7 percentage points'],
    bars: [10, 3],
    check: ['10% → 3%: 7 нэгж хувь (харьцангуй 70%)', '10% → 3%: 7 percentage points (70% relative)'],
  },
  {
    id: 'planning',
    icon: 'calendar',
    name: ['Төлөвлөхөд зарцуулах хугацаа', 'Planning time'],
    about: ['Газрын болон төслийн мэдээлэл нэг дор байгаа тул төлөвлөх ажил амар болно.', 'Spatial and project information in one place makes the planning work lighter.'],
    unit: ['хоног', 'days'],
    before: ['75 хоног', '75 days'],
    after: ['12 хоног', '12 days'],
    claim: ['84%-иар хурдан', '84% improvement'],
    bars: [75, 12],
    check: ['(75 − 12) / 75 = 84%', '(75 − 12) / 75 = 84%'],
  },
  {
    id: 'contingency',
    icon: 'alert',
    name: ['Гэнэтийн нэмэлт зардал', 'Unplanned extra costs'],
    about: ['Төлөвлөгөө ба бодит ажлын зөрүүг олж, зардал нэмэх өөрчлөлтийг хянана.', 'Finds the gap between plan and progress and tracks the changes that add cost.'],
    unit: ['%', '%'],
    before: ['10%', '10%'],
    after: ['6%', '6%'],
    claim: ['4 нэгж хувиар буурсан', 'Down 4 percentage points'],
    bars: [10, 6],
    check: ['10% → 6%: 4 нэгж хувь (харьцангуй 40%)', '10% → 6%: 4 percentage points (40% relative)'],
  },
  {
    id: 'people',
    icon: 'report',
    name: ['Хянаж, тайлан бичихэд зарцуулах цаг', 'Monitoring and reporting hours'],
    about: ['Ажлын явцын мэдээллийг нэг дор цуглуулж, хянах, тайлан бичихийг амар болгоно.', 'Brings the progress data together and makes monitoring and reporting lighter.'],
    unit: ['хүн·цаг', 'person·hours'],
    before: ['Сард 467', '467 per month'],
    after: ['Сард 93', '93 per month'],
    claim: ['80%-иар бага', '80% reduction'],
    bars: [467, 93],
    check: ['(467 − 93) / 467 ≈ 80%', '(467 − 93) / 467 ≈ 80%'],
  },
  {
    id: 'delay',
    icon: 'schedule',
    name: ['Ажлын хоцрогдол', 'Schedule adherence'],
    about: ['Төлөвлөсөн ба бодит ажлыг тулгаж, хаана хоцорч байгааг харуулна.', 'Compares planned and actual progress and identifies the delays.'],
    unit: ['%', '%'],
    before: ['Хоцрогдол 10%', '10% delay'],
    after: ['Хоцрогдол 3%', '3% delay'],
    claim: ['7 нэгж хувиар буурсан', 'Down 7 percentage points'],
    bars: [10, 3],
    check: ['10% → 3%: 7 нэгж хувь (харьцангуй 70%)', '10% → 3%: 7 percentage points (70% relative)'],
  },
  {
    id: 'transparency',
    icon: 'dashboard',
    name: ['Шийдвэр гаргах хурд', 'Data-driven decisions'],
    about: ['Газрын зураг, загвар, тайланг хамт харж, шийдвэрт хэрэгтэй бүхнээ нэг дороос авна.', 'See the map, the model and the reports together, and take what a decision needs from one place.'],
    unit: ['хугацаа / тайлагнал', 'time / reporting'],
    before: ['7 хоног; 10 бүртгэл', '7 days; 10 records'],
    after: ['1 хоног; нэг самбар, нэг тайлан', '1 day; 1 Dashboard and report'],
    claim: ['86%-иар хурдан', '86% improvement'],
    bars: [7, 1],
    check: ['(7 − 1) / 7 ≈ 86% — зөвхөн хугацаагаар; бүртгэлийн тоо (10 → 1) ороогүй', '(7 − 1) / 7 ≈ 86% — time only; the records (10 → 1) are not in it'],
  },
];
