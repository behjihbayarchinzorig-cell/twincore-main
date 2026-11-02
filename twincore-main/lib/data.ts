import type { Lang } from '@/i18n/routing';

// Content follows the official description of the platform ("Бүтээлийн танилцуулга"):
// base data & unified database → digital twin & analysis → construction control.

export type Step = { title: string; desc: string; items: string[] };

export type Module = {
  slug: 'data' | 'twin' | 'control' | 'monitor';
  name: string;
  // Small label beside the heading: the module name in the other language.
  tag: string;
  summary: string;
  lead: string;
  steps: Step[];
};

const step = (title: string, desc: string, items: string[] = []): Step => ({ title, desc, items });

// The presentation groups the platform into four modules; the website shows them in these sections. (Sales has no
// section of its own on the website.)
export type DeckModule = 'plan' | 'build' | 'ops' | 'sales';
export const DECK_MAP: { key: DeckModule; sections: Module['slug'][] }[] = [
  { key: 'plan', sections: ['data', 'twin'] },
  { key: 'build', sections: ['control', 'monitor'] },
  { key: 'ops', sections: ['twin'] },
  { key: 'sales', sections: [] },
];
export const deckModulesOf = (slug: Module['slug']) => DECK_MAP.filter((d) => d.sections.includes(slug)).map((d) => d.key);

const MODULES_MN: Module[] = [
  {
    slug: 'data',
    name: 'Суурь өгөгдөл',
    tag: 'Base data',
    summary: 'Газрын зураг, хэмжилт, хотын ерөнхий төлөвлөгөө, бүтээн байгуулалт, барилгын 3D загвар (BIM) — нэг санд',
    lead: 'Хотын газрын зургийн бүх өгөгдлийг нэг санд, нэг солбицлоор нэгтгэнэ. Объект бүр өөрийн ID-тай тул бусад хэсэг болон дижитал твинтэй шууд холбогдоно.',
    steps: [
      step('Газрын зураг, хэмжилт', 'Дроноор авсан зургаас бүтээсэн нарийвчилсан 2D, 3D суурь газрын зураг', ['Агаараас авсан зураг', 'Газрын өндрийн загвар', '3D цэгэн скан', '3D гадаргуун загвар']),
      step('Хотын ерөнхий төлөвлөгөө', 'Хаана юу барьж болох вэ: бүс, газар ашиглалт, өндөр ба нягтралын хязгаар, зам, ус, дулаан, цахилгааны шугам', ['Бүсчлэл', 'Газар ашиглалт', 'Барилгажилтын хязгаар', 'Авто зам', 'Ус, дулаан, цахилгааны шугам']),
      step('Бүтээн байгуулалтын ажил', 'Багц ажил бүрийн хил, гүйцэтгэгч, хугацаа, төлөв, гүйцэтгэл — орон зайн объекттой холбогдсон', ['Багцын хил', 'Гүйцэтгэгч', 'Хугацаа', 'Төлөв']),
      step('Барилгын загвар (BIM)', 'Барилгын нарийвчилсан 3D загварыг газрын зурагт байршуулж вэбд нийтэлнэ; мэргэжлийн салбар, эд ангийн төрөл, давхраар шүүнэ', ['Стандарт файл (IFC)', 'Салбараар шүүх', 'Давхраар шүүх', 'Эд анги хайх']),
    ],
  },
  {
    slug: 'twin',
    name: 'Дижитал твин',
    tag: 'Digital twin',
    summary: 'Дөрвөн түвшний нарийвчлалтай хотын 3D загвар, төлөвлөгөө ба бодит байдлыг цаг хугацаагаар харьцуулах, агаарын зургийг уншдаг AI, үер, агаар, замын хөдөлгөөний загварчлал',
    lead: 'Нэгдсэн сангийн өгөгдлөөс хотын 3 хэмжээст дижитал твин үүсгэж, түүн дээр дүн шинжилгээ, эрсдэлийн загварчлал хийнэ.',
    steps: [
      step('Дижитал твин загвар', 'Барилга, авто зам, ногоон байгууламж, инженерийн шугам сүлжээг ангилал, атрибуттай нь загварчилна', ['Энгийн хайрцаг, дээвэр', 'Гадна талын нарийвчлал', 'Дотор тал', 'Төлөвлөгөө ба бодит байдал цаг хугацаагаар', 'Мэдрэгч, системийн холболт']),
      step('Агаарын зураг дээрх AI', 'AI загвар агаарын зурагнаас объектыг олж, тоолж, хаана байгааг газрын зурагт гаргана', ['Объект олох', 'Тоолох', 'Бохирдлын эх үүсвэр']),
      step('«Хэрэв…» загварчлал', 'Газрын өндөр болон 3D хотын загварт тулгуурлан загварчилж, төлөвлөлтийн хувилбаруудыг харьцуулна', ['Үерийн тархалт', 'Салхи, агаарын бохирдол', 'Замын ачаалал, түгжрэл']),
      step('Төлөвлөгөө дүрэмд нийцэж байна уу?', 'Ерөнхий төлөвлөгөөг барилгын норм, дүрмээр шалгаж, өнгөөр ялгасан зураг, тоогоор харуулна', ['Норм, дүрэм', 'Өнгөт зураглал', 'Тоон үзүүлэлт']),
    ],
  },
  {
    slug: 'control',
    name: 'Бүтээн байгуулалтын хяналт',
    tag: 'Construction control',
    summary: 'Хуваарь, гүйцэтгэл, санхүүжилт, QA/QC, ХАБЭА, газар чөлөөлөлт, зөвшөөрөл, IoT, дашбоард, тайлан',
    lead: 'Бүтээн байгуулалтын үйл ажиллагааг дижитал твин болон газрын зурагтай уялдуулан бүртгэж, төлөвлөгөө болон бодит гүйцэтгэлийн хооронд хянана.',
    steps: [
      step('Ажлын хуваарь', 'Хуваарийг төлөвлөж батлуулах, ажлын харилцан хамаарлыг хянах, санхүүжилтийн төлөвлөгөөтэй уялдуулах'),
      step('Гүйцэтгэл', 'Бодит гүйцэтгэлийг бүртгэж батлуулах, багц бүрийн явцыг хуваарьтай харьцуулж хоцрогдлыг хянах'),
      step('Санхүүжилт', 'Багц бүрийн санхүүжилт, гэрээний төлбөр, санхүүгийн гүйцэтгэлийг биет гүйцэтгэлтэй уялдуулах'),
      step('QA/QC ба ХАБЭА', 'Материал, ажлын чанарын баримтыг бодит цагт хянах, аюулгүй байдал, эрүүл ахуйн бүртгэл'),
      step('Газар чөлөөлөлт', 'Нэгж талбар бүрийн байршил, төлөв, чөлөөлөлтийн явцыг газрын зурагтай уялдуулах'),
      step('Зөвшөөрлийн үйл явц', 'Барилгын ажилтай холбоотой зөвшөөрөл, хүсэлт, шийдвэрийн явцыг бүртгэн хянах'),
      step('Инженерийн дэд бүтэц', 'Шугам сүлжээ, байгууламжийн төлөвлөлт, байршил, хэрэгжилтийн мэдээлэл'),
      step('IoT хяналт', 'Мэдрэгчийн заалтыг бодит цагт хүлээн авч, байршилтай нь уялдуулан хянах'),
      step('Байгаль орчин, нийгэм', 'Байгаль орчны эрсдэл, үйлчилгээний хүртээмж, амьдрах орчны өөрчлөлт'),
      step('Баримт бичиг', 'ТЭЗҮ, БОНҮ болон бусад баримтыг төвлөрүүлж, ажлын урсгалыг схемээр харуулах'),
      step('Ерөнхий дашбоард', 'Үзүүлэлт, явц, гүйцэтгэл, санхүүжилтийг газрын зураг, график, хүснэгтээр'),
      step('Тайлан', 'Хуримтлагдсан мэдээлэлд үндэслэн хэрэгжилт, явцын тайлан боловсруулах'),
      step('Системийн удирдлага', 'Хэрэглэгч, хандах эрх, эрхийн түвшин, мэдээллийн эх сурвалжийн лавлах'),
    ],
  },
  {
    slug: 'monitor',
    name: 'Бүтээн байгуулалтын мониторинг',
    tag: 'Construction monitoring',
    summary: 'Талбай дээрх мэдрэгч — кран, бетон, газрын суулт, тоос, дуу чимээ — мөн ажилчид, техник, аюулгүй байдал, бодит цагт',
    lead: 'Барилгын талбайг бодит цагт хянана: мэдрэгчийн заалт дижитал твин дээр шууд харагдаж, хязгаараас хэтэрмэгц сэрэмжлүүлэг өгнө.',
    steps: [
      step('Талбайн мэдрэгч', 'Кран ачаалал, бетоны температур, газрын суулт, хазайлт, тоос, дуу чимээний заалт бодит цагт', ['Кран ачаалал', 'Бетоны температур', 'Суулт, хазайлт', 'Тоос, дуу чимээ']),
      step('Сэрэмжлүүлэг', 'Заалт хязгаараас хэтэрмэгц хариуцсан хүнд мэдэгдэж, бүртгэлд үлдээнэ', ['Хязгаар', 'Мэдэгдэл', 'Бүртгэл']),
      step('Талбайн өдөр тутмын мэдээ', 'Ажилчид, техник, цаг агаар, хөдөлмөрийн аюулгүй байдлын төлөв нэг дор', ['Ажилчид', 'Техник', 'Цаг агаар', 'Аюулгүй байдал']),
      step('Хандлага', 'Сүүлийн хоногуудын гүйцэтгэл, бетон цутгалт, осол зөрчлийн хандлага', ['14 хоног', 'График', 'Тайлан']),
    ],
  },
];

const MODULES_EN: Module[] = [
  {
    slug: 'data',
    name: 'Base data',
    tag: 'Суурь өгөгдөл',
    summary: 'Maps and surveys, the city plan, construction works and 3D building models (BIM) — in one map database',
    lead: 'All of the city’s map data is kept in one database, lined up on the same coordinates. Every object has its own ID, so it links directly to the other parts and to the digital twin.',
    steps: [
      step('Survey maps', 'A detailed base map made from drone flights, in 2D and 3D', ['Aerial photo map', 'Ground height model', '3D point scan', '3D surface model']),
      step('City master plan', 'What may be built where: zones, land use, height and density limits, roads, and water, heat and power lines', ['Zones', 'Land use', 'Building limits', 'Roads', 'Water, heat and power lines']),
      step('Construction works', 'Each work package’s boundary, contractor, schedule, status and progress, tied to its location', ['Package boundary', 'Contractor', 'Schedule', 'Status']),
      step('Building models (BIM)', 'Detailed 3D building models placed on the map and shared on the web; filter them by trade, type of part and floor', ['Standard file format (IFC)', 'Filter by trade', 'Filter by floor', 'Search for a part']),
    ],
  },
  {
    slug: 'twin',
    name: 'Digital twin',
    tag: 'Дижитал твин',
    summary: '3D city model at four levels of detail, plan vs. actual over time, AI that reads aerial photos, and flood, air and traffic simulations',
    lead: 'The unified data becomes a 3D digital twin of the city, used for analysis and risk modelling.',
    steps: [
      step('Digital twin model', 'Buildings, roads, green space and utility networks, modelled with their classes and attributes', ['Simple blocks and roofs', 'Outside detail', 'Inside view', 'Plan vs. actual over time', 'Live sensor and system links']),
      step('AI on aerial photos', 'An AI model finds and counts objects in aerial photos and maps where they are', ['Finding objects', 'Counting them', 'Pollution sources']),
      step('What-if simulations', 'Simulations on the ground heights and the 3D city model, used to compare planning options', ['Flood spread', 'Wind and air pollution', 'Traffic load and congestion']),
      step('Does the plan fit the rules?', 'The master plan checked against building codes, shown as colour-coded maps and figures', ['Codes and rules', 'Colour-coded maps', 'Figures']),
    ],
  },
  {
    slug: 'control',
    name: 'Construction control',
    tag: 'Бүтээн байгуулалтын хяналт',
    summary: 'Schedule, progress, funding, QA/QC, health & safety, land clearance, permits, IoT, dashboard, reports',
    lead: 'Construction is recorded against the digital twin and the map, and progress is checked against the plan.',
    steps: [
      step('Schedule', 'Plan and approve the schedule, track dependencies, tie funding to it'),
      step('Progress', 'Record and approve actual work, compare each package with its schedule, track delays'),
      step('Funding', 'Each package’s funding, contract payments and financial progress, matched to physical progress'),
      step('QA/QC and H&S', 'Material and workmanship records checked in real time; health and safety records'),
      step('Land clearance', 'Each parcel’s location, status and clearance progress on the map'),
      step('Permits', 'Permits, requests and decisions for the works, tracked'),
      step('Utilities', 'Planning, location and delivery of networks and structures'),
      step('IoT monitoring', 'Sensor readings received in real time and tied to their location'),
      step('Environment and society', 'Environmental risk, access to services, change in living conditions'),
      step('Documents', 'Feasibility studies, environmental assessments and other documents in one place, with workflow diagrams'),
      step('Dashboard', 'Indicators, progress, performance and funding as maps, charts and tables'),
      step('Reports', 'Delivery and progress reports from the data in the system'),
      step('Administration', 'Users, access rights, permission levels, data source catalogue'),
    ],
  },
  {
    slug: 'monitor',
    name: 'Construction monitoring',
    tag: 'Бүтээн байгуулалтын мониторинг',
    summary: 'Sensors on site — crane, concrete, ground sinking, dust, noise — plus workers, machines and safety, live',
    lead: 'Watch the site in real time: sensor readings appear on the digital twin, and you are alerted the moment one crosses its limit.',
    steps: [
      step('Site sensors', 'Live readings of crane load, concrete temperature, ground sinking, lean, dust and noise', ['Crane load', 'Concrete temperature', 'Sinking, lean', 'Dust, noise']),
      step('Alerts', 'When a reading crosses its limit, the person responsible is notified and it is logged', ['Limits', 'Notifications', 'Log']),
      step('Daily site report', 'Workers, machines, weather and health & safety in one place', ['Workers', 'Machines', 'Weather', 'Health & safety']),
      step('Trends', 'Progress, concrete poured and incidents over recent days', ['14 days', 'Charts', 'Reports']),
    ],
  },
];

export const MODULES: Record<Lang, Module[]> = { mn: MODULES_MN, en: MODULES_EN };

// A chip is either a plain label or [label, sublabel].
export type ArchLayer = { title: string; verb: string; desc: string; items: (string | [string, string])[] };
export type Architecture = { layers: ArchLayer[]; security: [string, string] };

export const ARCHITECTURE: Record<Lang, Architecture> = {
  mn: {
    layers: [
      { title: 'Эх өгөгдөл', verb: 'Цуглуулах', desc: 'BIM, GIS, агаар, сансрын зураг, талбайн мэдээ, санхүү/ERP-ээс өгөгдлийг татна.', items: ['BIM/IFC', 'GIS', 'Агаар, сансрын зураг', 'Талбайн мэдээ', 'Санхүү / ERP'] },
      { title: 'Өгөгдлийн сан', verb: 'Хадгалах', desc: 'Орон зайн өгөгдөл, BIM, төсөл, санхүү, баримт бичиг нэг санд хадгалагдана.', items: ['Орон зайн өгөгдөл', 'BIM загвар', 'Төсөл, хуваарь', 'Санхүү', 'Баримт, зураг'] },
      { title: 'Дижитал твин', verb: 'Боловсруулах', desc: 'Өгөгдлөөс 3D загвар үүсгэж, AI ба аналитикаар боловсруулна.', items: ['BIM / 3D загвар', 'GIS зураглал', 'AI ба аналитик', 'S-curve, KPI', 'Тайлан, мэдэгдэл'] },
      { title: 'Модулиуд', verb: 'Ашиглах', desc: 'Төслийн үе шат бүрт тохирсон модулиудаар ашиглана.', items: ['Төлөвлөлт', 'Барилгын явц', 'Платформ', 'Борлуулалт'] },
      {
        title: 'Хэрэглэгч',
        verb: 'Хүргэх',
        desc: 'Хэрэглэгч бүр эрхийнхээ хүрээнд самбар, апп, порталаар хандана.',
        items: [['Удирдлага', 'Самбар'], ['Инженер', 'Веб, талбайн апп'], ['Худалдан авагч', '3D танилцуулга'], ['СӨХ, оршин суугч', 'Портал']],
      },
    ],
    security: ['Аюулгүй байдал', 'Нэвтрэлт, эрхийн зохицуулалт, архив зэрэг нь бүх шатанд хийгдэнэ'],
  },
  en: {
    layers: [
      { title: 'Source data', verb: 'Collect', desc: 'Data comes in from BIM, GIS, aerial and satellite imagery, site reports and finance/ERP.', items: ['BIM/IFC', 'GIS', 'Aerial and satellite imagery', 'Site reports', 'Finance / ERP'] },
      { title: 'Database', verb: 'Store', desc: 'Spatial data, BIM, projects, finance and documents kept in one store.', items: ['Spatial data', 'BIM models', 'Projects, schedules', 'Finance', 'Documents, drawings'] },
      { title: 'Digital twin', verb: 'Process', desc: 'The data becomes a 3D model, processed with AI and analytics.', items: ['BIM / 3D model', 'GIS mapping', 'AI and analytics', 'S-curve, KPIs', 'Reports, notifications'] },
      { title: 'Modules', verb: 'Use', desc: 'Used through modules matched to each stage of a project.', items: ['Planning', 'Construction process', 'Platform', 'Sales'] },
      {
        title: 'Users',
        verb: 'Deliver',
        desc: 'Each user works within their access rights — boards, apps and portals.',
        items: [['Management', 'Board'], ['Engineers', 'Web, site app'], ['Buyers', '3D presentation'], ['Owners’ association, residents', 'Portal']],
      },
    ],
    security: ['Security', 'Sign-in, access rights and archiving apply at every stage'],
  },
};

export const pad2 = (n: number) => String(n).padStart(2, '0');
