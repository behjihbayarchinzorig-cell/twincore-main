import type { Lang } from '@/i18n/routing';

// The system overview as presented in the TwinCore deck: planning, the construction process and the platform
// after handover.

export type FlowStep = { title: string; desc: string; items: string[] };
export type Control = { title: string; desc: string };
export type Direction = { title: string; desc: string; chips: string[]; accent?: boolean };

export type Deck = {
  planning: { title: string; lead: string; loop: string; next: string; steps: FlowStep[] };
  build: {
    title: string;
    lead: string;
    kinds: string[]; // project types along the delivery line, the last one is handover
    kindsLabel: string;
    controlsTitle: string;
    controls: Control[];
    resultTitle: string;
    plan: string;
    actual: string;
    today: string;
    curveNote: string;
    results: string[];
  };
  platform: { title: string; lead: string; centre: string; directions: Direction[] };
};

export const DECK: Record<Lang, Deck> = {
  mn: {
    planning: {
      title: 'Төлөвлөлт',
      lead: 'Талбайг судлахаас эхлээд сонгосон хувилбарыг дижитал загвар болгох хүртэл таван алхам.',
      loop: 'давтана',
      next: 'Барилгын явц',
      steps: [
        { title: 'Талбай судлах', desc: 'Талбайн нөхцөлийг өгөгдлөөр тодорхойлно', items: ['Хиймэл дагуулын шинжилгээ', 'Одоогийн байдал', 'Дэд бүтэц'] },
        { title: 'Шинжилгээ', desc: 'Зураглалын системээр давхаргыг шинжилнэ', items: ['Тохиромж', 'Эрсдэл', 'Зураглалын систем'] },
        { title: 'Хувилбар', desc: 'AI-аар олон төлөвлөлтийн хувилбар гаргана', items: ['AI олон хувилбарт дизайн', 'Хот төлөвлөлт', 'Блок төлөвлөлт'] },
        { title: 'Үнэлэх', desc: 'Хувилбаруудыг өртөг, стандартаар харьцуулна', items: ['Өртгийн тооцоо', 'FAR · BCR', 'Монгол ба олон улсын стандарт'] },
        { title: 'Батлах', desc: 'Сонгосон хувилбарыг дижитал загвар болгоно', items: ['BIM загвар', 'Интеграц', 'Game Engine дүрслэл'] },
      ],
    },
    build: {
      title: 'Барилгын явц',
      lead: 'Төлөвлөгөө, гүйцэтгэл, санхүү, чанар, HSE-ийн цогц хяналт; S-curve, KPI.',
      kindsLabel: 'Бүтээн байгуулалт',
      kinds: ['Utility', 'ИБАХ', 'Орон сууц', 'Барилга', 'Улсын комисс хүлээн авах'],
      controlsTitle: 'Цогц интеграц',
      controls: [
        { title: 'Ажлын төлөвлөгөө', desc: 'BIM, мастер төсөвт суурилсан' },
        { title: 'Гүйцэтгэлийн хяналт', desc: 'Төлөвлөгөө ба бодит' },
        { title: 'Санхүүгийн хяналт', desc: 'Төсөв, зардал, төлбөр' },
        { title: 'Чанарын хяналт', desc: 'Шалгалт, үл нийцэл' },
        { title: 'Аюулгүй ажиллагаа', desc: 'Safety' },
        { title: 'HSE', desc: 'Эрүүл мэнд, байгаль орчин' },
      ],
      resultTitle: 'Үр дүн',
      plan: 'Төлөвлөгөө',
      actual: 'Гүйцэтгэл',
      today: 'өнөөдөр',
      curveNote: 'S-curve: төсөл эхлэхээс дуусах хүртэл',
      results: ['Ажлын бүтээмжийн хяналт', 'Ажлын хурд, хоцрогдол', 'Ажил зарлах', 'Critical analysis — зогсож болохгүй ажил', 'KPI мониторинг'],
    },
    platform: {
      title: 'Платформ',
      lead: 'Барилга ашиглалтад орсны дараа — 4 чиглэлээр удирдана.',
      centre: 'TwinCore · ашиглалтын горим',
      directions: [
        { title: 'Хөрөнгийн удирдлага', desc: 'Барилга, тоног төхөөрөмж нэг дор', chips: ['Засвар', 'Насжилт', 'Бүртгэл', 'Тооцоо', 'Цогц мониторинг'] },
        { title: 'Ухаалаг төсөл', desc: 'Барилга, дэд бүтцийг ихрээр удирдах', chips: ['Барилга', 'Дэд бүтэц'] },
        { title: 'Удирдлагын платформ', desc: 'Бүх төсөл нэг самбарт', chips: ['Нэгдсэн самбар', 'Шийдвэр гаргалт', 'Тайлан'] },
        { title: 'Орон сууц', desc: 'Ашиглалтын нэмэлт үнэ цэнэ', chips: ['Орлого олох боломж', 'СӨХ'], accent: true },
      ],
    },
  },
  en: {
    planning: {
      title: 'Planning',
      lead: 'Five steps, from studying the site to turning the chosen option into a digital model.',
      loop: 'repeat',
      next: 'Construction process',
      steps: [
        { title: 'Study the site', desc: 'Site conditions defined from data', items: ['Satellite analysis', 'Current state', 'Infrastructure'] },
        { title: 'Analyse', desc: 'Layers analysed in the mapping system', items: ['Suitability', 'Risk', 'Mapping system'] },
        { title: 'Options', desc: 'AI produces many planning options', items: ['AI multi-option design', 'Urban planning', 'Block planning'] },
        { title: 'Evaluate', desc: 'Options compared on cost and standards', items: ['Cost estimate', 'FAR · BCR', 'Mongolian and international standards'] },
        { title: 'Approve', desc: 'The chosen option becomes a digital model', items: ['BIM model', 'Integration', 'Game Engine visuals'] },
      ],
    },
    build: {
      title: 'Construction process',
      lead: 'Plan, progress, finance, quality and HSE under one control; S-curve, KPIs.',
      kindsLabel: 'Construction',
      kinds: ['Utility', 'Engineering prep (ИБАХ)', 'Housing', 'Building', 'State commission handover'],
      controlsTitle: 'Full integration',
      controls: [
        { title: 'Work plan', desc: 'Based on BIM and the master budget' },
        { title: 'Progress control', desc: 'Plan against actual' },
        { title: 'Financial control', desc: 'Budget, cost, payments' },
        { title: 'Quality control', desc: 'Inspections, non-conformities' },
        { title: 'Safe working', desc: 'Safety' },
        { title: 'HSE', desc: 'Health and environment' },
      ],
      resultTitle: 'Results',
      plan: 'Plan',
      actual: 'Actual',
      today: 'today',
      curveNote: 'S-curve: from project start to finish',
      results: ['Productivity control', 'Work rate and delays', 'Work orders', 'Critical analysis — work that must not stop', 'KPI monitoring'],
    },
    platform: {
      title: 'Platform',
      lead: 'Once the building is in use — managed in 4 directions.',
      centre: 'TwinCore · operations mode',
      directions: [
        { title: 'Asset management', desc: 'Building and equipment in one place', chips: ['Maintenance', 'Ageing', 'Register', 'Billing', 'Full monitoring'] },
        { title: 'Smart project', desc: 'Buildings and infrastructure managed as a twin', chips: ['Buildings', 'Infrastructure'] },
        { title: 'Management platform', desc: 'Every project on one board', chips: ['Unified board', 'Decisions', 'Reports'] },
        { title: 'Housing', desc: 'Extra value in operation', chips: ['Revenue opportunities', 'Owners’ association'], accent: true },
      ],
    },
  },
};
