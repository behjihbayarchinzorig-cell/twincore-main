// "TwinCore-ийн үр өгөөж": the six benefits, with the performance figures exactly as supplied in the project's
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
    name: ['Төсвийн гүйцэтгэл', 'Budget performance'],
    about: ['Төлөвлөсөн төсөв болон бодит зардлыг харьцуулж, зөрүүг хянана.', 'Compares the planned budget with actual cost and tracks the variance.'],
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
    name: ['Төлөвлөлтийн хугацаа', 'Planning time'],
    about: ['Орон зайн болон төслийн мэдээллийг нэг дороос авч, төлөвлөлтийн ажлыг хөнгөвчилнө.', 'Spatial and project information in one place makes the planning work lighter.'],
    unit: ['хоног', 'days'],
    before: ['75 хоног', '75 days'],
    after: ['12 хоног', '12 days'],
    claim: ['84% сайжирсан', '84% improvement'],
    bars: [75, 12],
    check: ['(75 − 12) / 75 = 84%', '(75 − 12) / 75 = 84%'],
  },
  {
    id: 'contingency',
    icon: 'alert',
    name: ['Төлөвлөөгүй нэмэлт зардал', 'Unplanned extra costs'],
    about: ['Төлөвлөгөө, гүйцэтгэлийн зөрүүг илрүүлж, нэмэлт зардалд нөлөөлөх өөрчлөлтийг хянана.', 'Finds the gap between plan and progress and tracks the changes that add cost.'],
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
    name: ['Хяналт, тайлагналын ажлын цаг', 'Monitoring and reporting hours'],
    about: ['Гүйцэтгэлийн мэдээллийг нэгтгэж, хяналт болон тайлан бэлтгэх ажлыг хөнгөвчилнө.', 'Brings the progress data together and makes monitoring and reporting lighter.'],
    unit: ['хүн·цаг', 'person·hours'],
    before: ['Сард 467', '467 per month'],
    after: ['Сард 93', '93 per month'],
    claim: ['80% бууруулсан', '80% reduction'],
    bars: [467, 93],
    check: ['(467 − 93) / 467 ≈ 80%', '(467 − 93) / 467 ≈ 80%'],
  },
  {
    id: 'delay',
    icon: 'schedule',
    name: ['Ажлын хуваарийн хэрэгжилт', 'Schedule adherence'],
    about: ['Төлөвлөсөн болон бодит гүйцэтгэлийг харьцуулж, хоцрогдлыг тодорхойлно.', 'Compares planned and actual progress and identifies the delays.'],
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
    name: ['Мэдээлэлд тулгуурласан шийдвэр', 'Data-driven decisions'],
    about: ['Газрын зураг, загвар, тайланг хамтад нь харж, шийдвэрт шаардлагатай мэдээллээ нэг дороос авна.', 'See the map, the model and the reports together, and take what a decision needs from one place.'],
    unit: ['хугацаа / тайлагнал', 'time / reporting'],
    before: ['7 хоног; 10 бүртгэл', '7 days; 10 records'],
    after: ['1 хоног; Нэгдсэн хяналтын самбар, тайлан', '1 day; 1 Dashboard and report'],
    claim: ['86% сайжирсан', '86% improvement'],
    bars: [7, 1],
    check: ['(7 − 1) / 7 ≈ 86% — зөвхөн хугацаагаар; бүртгэлийн тоо (10 → 1) ороогүй', '(7 − 1) / 7 ≈ 86% — time only; the records (10 → 1) are not in it'],
  },
];
