// DEMONSTRATION DATA — the rules the suitability assessment checks each plot against: what is measured, the limit, the
// norm it comes from (references are illustrative, in the form Mongolian building norms are cited: БНбД = барилгын
// норм ба дүрэм), and a plain-words explanation. Measured values come from the detailed plan, the master plan and
// distances on the plan; the sunlight hours come from the BIM sun study.

import type { PlotUse } from './detailplan';

export type CriterionKey = 'far' | 'coverage' | 'height' | 'setback' | 'green' | 'parking' | 'school' | 'kindergarten' | 'clinic' | 'park' | 'fire' | 'sun';
export type Criterion = {
  key: CriterionKey;
  group: 'density' | 'site' | 'access' | 'health';
  kind: 'max' | 'min'; // the measured value must stay at most / at least the limit
  unit: string;
  applies: PlotUse[] | 'all';
  source: string;
  name: { mn: string; en: string };
  rule: { mn: string; en: string };
  plain: { mn: string; en: string };
};

const ALL = 'all' as const;
const HOME: PlotUse[] = ['housing'];

export const CRITERIA: Criterion[] = [
  {
    key: 'far',
    group: 'density',
    kind: 'max',
    unit: '',
    applies: ALL,
    source: 'БНбД 30-01-04 «Хот, суурины төлөвлөлт ба барилгажилт»; ЕТ-ийн бүсчлэл',
    name: { mn: 'Барилгажилтын нягтрал (FAR)', en: 'Floor area ratio (FAR)' },
    rule: { mn: 'Нийт талбай ÷ нэгж талбарын талбай ≤ бүсийн FAR', en: 'Gross floor area ÷ plot area ≤ the zone’s FAR' },
    plain: {
      mn: 'Талбай дээр хэр их барилга барьж болохыг заана. Жишээ нь FAR 2.4 бол 1 000 м² талбайд нийт 2 400 м² шал барьж болно. Хэтэрвэл зам, сургууль, шугам сүлжээ даах хүн амаас олон хүн суурьшина.',
      en: 'How much building a plot may carry. With FAR 2.4, a 1,000 m² plot may hold 2,400 m² of floors. Going over brings more people than the roads, schools and networks were planned for.',
    },
  },
  {
    key: 'coverage',
    group: 'density',
    kind: 'max',
    unit: '%',
    applies: ALL,
    source: 'БНбД 30-01-04, 5-р бүлэг; ЕТ-ийн бүсчлэл',
    name: { mn: 'Барилгажилтын хувь', en: 'Site coverage' },
    rule: { mn: 'Барилгын суурийн талбай ÷ нэгж талбар ≤ бүсийн хязгаар', en: 'Building footprint ÷ plot area ≤ the zone’s limit' },
    plain: {
      mn: 'Талбайн хэдэн хувийг барилга эзэлж болохыг заана. Үлдсэн хэсэг нь хашаа, тоглоомын талбай, ногоон байгууламж, явган зам болно.',
      en: 'How much of the plot the building may cover. The rest is left for yards, play areas, green space and footpaths.',
    },
  },
  {
    key: 'height',
    group: 'density',
    kind: 'max',
    unit: 'м',
    applies: ALL,
    source: 'ЕТ-ийн бүсчлэл; БНбД 30-01-04, 5.12',
    name: { mn: 'Барилгын өндөр', en: 'Building height' },
    rule: { mn: 'Барилгын өндөр ≤ бүсийн өндрийн хязгаар', en: 'Building height ≤ the zone’s height limit' },
    plain: {
      mn: 'Хорооллын дүр төрх, хөрш барилгын нарны гэрэл, галын шатны хүрэх өндрөөр тогтоосон хязгаар.',
      en: 'Set by the townscape, sunlight on the neighbours and the reach of fire ladders.',
    },
  },
  {
    key: 'setback',
    group: 'site',
    kind: 'min',
    unit: 'м',
    applies: ALL,
    source: 'БНбД 30-01-04, 6.4 — улаан шугамаас ухрах зай',
    name: { mn: 'Улаан шугамаас ухрах зай', en: 'Setback from the red line' },
    rule: { mn: 'Барилгын фасад улаан шугамаас ≥ бүсийн шаардлага', en: 'Façade to red line ≥ the zone’s requirement' },
    plain: {
      mn: 'Улаан шугам бол зам, шугам сүлжээнд зориулсан хилийн шугам. Барилга түүнээс зайтай байж явган зам, мод, газар доорх шугамд зай үлдэнэ.',
      en: 'The red line bounds the street and its utilities. Buildings stand back from it to leave room for pavements, trees and buried networks.',
    },
  },
  {
    key: 'green',
    group: 'site',
    kind: 'min',
    unit: '%',
    applies: ALL,
    source: 'БНбД 30-01-04, 7-р бүлэг; Ногоон байгууламжийн тухай хууль',
    name: { mn: 'Ногоон байгууламж', en: 'Green space' },
    rule: { mn: 'Ногоон байгууламжийн талбай ÷ нэгж талбар ≥ бүсийн доод хэмжээ', en: 'Green area ÷ plot area ≥ the zone’s minimum' },
    plain: {
      mn: 'Мод, бут, зүлэгтэй талбайн доод хувь. Тоос, дулаан, борооны усыг бууруулж, оршин суугчдын амралтын орчин болно.',
      en: 'The least share of trees, shrubs and lawn. It cuts dust, heat and storm runoff and gives residents somewhere to rest.',
    },
  },
  {
    key: 'parking',
    group: 'site',
    kind: 'min',
    unit: 'зогсоол',
    applies: ALL,
    source: 'БНбД 30-01-04, Хавсралт 9 — авто зогсоолын норм',
    name: { mn: 'Авто зогсоол', en: 'Parking' },
    rule: { mn: 'Зогсоолын тоо ≥ шалны талбайд ногдох норм', en: 'Spaces ≥ the norm per floor area' },
    plain: {
      mn: 'Зориулалт бүрт 100 м² талбайд ногдох зогсоолын тоогоор тооцно. Дутвал машин гудамж, явган зам дээр зогсоно.',
      en: 'Counted per 100 m² of floor area for each use. Too few and cars end up parked on streets and pavements.',
    },
  },
  {
    key: 'school',
    group: 'access',
    kind: 'max',
    unit: 'м',
    applies: HOME,
    source: 'БНбД 30-01-04, 8.3 — ерөнхий боловсролын сургуулийн үйлчлэх радиус',
    name: { mn: 'Сургууль хүртэлх зай', en: 'Walk to school' },
    rule: { mn: 'Орон сууцнаас сургууль хүртэл алхах зай ≤ 500 м', en: 'Walking distance from home to school ≤ 500 m' },
    plain: {
      mn: 'Хүүхэд сургуульдаа машингүй, том зам хөндлөн гарахгүйгээр алхаж очих боломжтой байх ёстой. Зайг гудамжны тойргийг тооцож шулуун зайг 1.25-аар үржүүлж гаргасан.',
      en: 'Children should be able to walk to school without a car or crossing a major road. Distance is the straight line × 1.25 for the street detour.',
    },
  },
  {
    key: 'kindergarten',
    group: 'access',
    kind: 'max',
    unit: 'м',
    applies: HOME,
    source: 'БНбД 30-01-04, 8.3 — цэцэрлэгийн үйлчлэх радиус',
    name: { mn: 'Цэцэрлэг хүртэлх зай', en: 'Walk to kindergarten' },
    rule: { mn: 'Орон сууцнаас цэцэрлэг хүртэл ≤ 300 м', en: 'Home to kindergarten ≤ 300 m' },
    plain: {
      mn: 'Бага насны хүүхдийг өдөр бүр хүргэж, авдаг тул цэцэрлэг гэрт ойр байх шаардлагатай.',
      en: 'Small children are walked there and back every day, so the kindergarten must be close to home.',
    },
  },
  {
    key: 'clinic',
    group: 'access',
    kind: 'max',
    unit: 'м',
    applies: HOME,
    source: 'БНбД 30-01-04, 8.3; Эрүүл мэндийн сайдын тушаал — өрхийн ЭМТ-ийн хүртээмж',
    name: { mn: 'Эрүүл мэндийн төв хүртэлх зай', en: 'Walk to the health centre' },
    rule: { mn: 'Орон сууцнаас өрхийн эрүүл мэндийн төв хүртэл ≤ 1 000 м', en: 'Home to the family health centre ≤ 1,000 m' },
    plain: {
      mn: 'Өрхийн эмчид ахмад настан, хүүхэдтэй ээж нар алхаж очих боломжтой байх ёстой.',
      en: 'Older people and parents with small children should be able to walk to their family doctor.',
    },
  },
  {
    key: 'park',
    group: 'access',
    kind: 'max',
    unit: 'м',
    applies: HOME,
    source: 'БНбД 30-01-04, 7.5 — нийтийн ногоон байгууламжийн хүртээмж',
    name: { mn: 'Цэцэрлэгт хүрээлэн хүртэлх зай', en: 'Walk to a park' },
    rule: { mn: 'Орон сууцнаас нийтийн цэцэрлэгт хүрээлэн хүртэл ≤ 500 м', en: 'Home to a public park ≤ 500 m' },
    plain: {
      mn: 'Хашааны ногоон байгууламжаас гадна томоохон амралтын талбай ойр байх нь эрүүл мэнд, хүүхдийн хөгжилд чухал.',
      en: 'Beyond the yard’s own green, a proper park close by matters for health and for children.',
    },
  },
  {
    key: 'fire',
    group: 'health',
    kind: 'max',
    unit: 'м',
    applies: ALL,
    source: 'БНбД 21-01-02 «Барилга байгууламжийн галын аюулгүй байдал», 8-р бүлэг',
    name: { mn: 'Галын машин нэвтрэх', en: 'Fire appliance access' },
    rule: { mn: 'Барилгаас машин явах зам хүртэл ≤ 50 м', en: 'Building to a drivable road ≤ 50 m' },
    plain: {
      mn: 'Гал унтраах машин барилгын ойролцоо зогсож, хоолой, шатаа хүргэх боломжтой байх ёстой. Явган зам тооцогдохгүй.',
      en: 'A fire engine must be able to stop near the building and reach it with hoses and ladders. Footpaths don’t count.',
    },
  },
  {
    key: 'sun',
    group: 'health',
    kind: 'min',
    unit: 'ц',
    applies: ['housing', 'school', 'kindergarten'],
    source: 'БНбД 31-01-01 «Орон сууцны барилга» — инсоляц; БНбД 31-04-03 (сургууль, цэцэрлэг)',
    name: { mn: 'Нарны гэрэл (инсоляц)', en: 'Sunlight hours' },
    rule: { mn: 'Өвлийн туйлын өдөр тасралтгүй нарны гэрэл: орон сууц ≥ 2 ц, сургууль, цэцэрлэг ≥ 2.5 ц', en: 'Continuous sun on the winter solstice: homes ≥ 2 h, schools and kindergartens ≥ 2.5 h' },
    plain: {
      mn: 'Өрөөнд өдөрт тодорхой хугацаанд шууд нар тусах нь эрүүл ахуйн шаардлага. Өндөр барилга хөршөө сүүдэрлэвэл энэ шалгуурт тэнцэхгүй. Утгыг BIM загварын нарны судалгаанаас авсан.',
      en: 'Rooms need direct sun for part of the day for health. Tall neighbours that cast shade make a plot fail. Values come from the BIM sun study.',
    },
  },
];

// result points for the score: a warning counts for a little over half
export const POINTS = { pass: 100, warn: 60, fail: 0 } as const;
// walking distance = straight line × detour factor for the street network
export const DETOUR = 1.25;
