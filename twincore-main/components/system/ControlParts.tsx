import type { Step } from '@/lib/data';
import Reveal from '@/components/motion/Reveal';

// What construction control covers: the thirteen parts of the specification in four groups, then the platform in
// one line — what goes in, the digital twin, what comes out.

type Group = { icon: keyof typeof ICONS; title: [string, string]; line: [string, string]; parts: number[] };
// indices into the module's steps (lib/data.ts): 0 schedule, 1 progress, 2 funding, 3 QA/QC + H&S, 4 land, 5 permits,
// 6 utilities, 7 IoT, 8 environment, 9 documents, 10 dashboard, 11 reports, 12 administration
const GROUPS: Group[] = [
  {
    icon: 'plan',
    title: ['Төлөвлөгөө ба гүйцэтгэл', 'Plan and progress'],
    line: ['Хуваарь, бодит ажил, мөнгө — нэг дор харьцуулна.', 'Schedule, actual work and money, compared in one place.'],
    parts: [0, 1, 2],
  },
  { icon: 'site', title: ['Талбай дээр', 'On site'], line: ['Чанар, аюулгүй байдал, мэдрэгч, орчны нөлөө.', 'Quality, safety, sensors and the effect on the area.'], parts: [3, 7, 8] },
  {
    icon: 'land',
    title: ['Газар ба зөвшөөрөл', 'Land and permits'],
    line: ['Талбай чөлөөлөлт, зөвшөөрөл, шугам сүлжээ газрын зураг дээр.', 'Clearance, permits and utilities, on the map.'],
    parts: [4, 5, 6],
  },
  { icon: 'lead', title: ['Удирдлага', 'Management'], line: ['Дашбоард, тайлан, баримт, хэрэглэгчийн эрх.', 'Dashboard, reports, documents and user rights.'], parts: [10, 11, 9, 12] },
];

const FLOW = {
  in: [
    ['Суурь өгөгдөл', 'Base data'],
    ['Ерөнхий төлөвлөгөө', 'Master plan'],
    ['BIM', 'BIM'],
    ['Бүтээн байгуулалт', 'Construction'],
  ],
  out: [
    ['Орон зайн дүн шинжилгээ', 'Spatial analysis'],
    ['Эрсдэлийн загварчлал', 'Risk modelling'],
    ['Бүтээн байгуулалтын хяналт', 'Construction control'],
    ['Удирдлагын шийдвэр', 'Decisions'],
  ],
};

const ICONS = {
  plan: 'M4 5h16M4 5v14h16V5M8 3v4M16 3v4M7 11h4M7 15h7',
  site: 'M3 20h18M6 20V9l6-5 6 5v11M10 20v-5h4v5',
  land: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  lead: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
} as const;

export default function ControlParts({ steps, en }: { steps: Step[]; en: boolean }) {
  const L = en ? 1 : 0;
  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-4 sm:grid-cols-2">
        {GROUPS.map((g, k) => (
          <Reveal key={g.icon} delay={(k % 2) * 0.1}>
            <article className="h-full rounded-2xl border border-line bg-surface/40 p-5 sm:p-6">
              <header className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-grad text-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={ICONS[g.icon]} />
                  </svg>
                </span>
                <div>
                  <p className="font-mono text-[11px] text-mute">0{k + 1}</p>
                  <h4 className="text-lg leading-tight font-medium">{g.title[L]}</h4>
                  <p className="mt-1 text-sm text-mute">{g.line[L]}</p>
                </div>
              </header>
              {/* on a phone the parts fold away under their group (tap to open); from sm up they are always shown */}
              <details className="group mt-4 sm:hidden">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg border border-line/70 px-3 text-sm text-fg/85 [&::-webkit-details-marker]:hidden">
                  {g.parts.map((i) => steps[i].title).join(' · ')}
                  <span aria-hidden="true" className="ml-2 shrink-0 text-mute transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>
                <ul className="mt-2 flex flex-col divide-y divide-line/70">
                  {g.parts.map((i) => (
                    <li key={i} className="py-3">
                      <p className="font-medium">{steps[i].title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-mute">{steps[i].desc}</p>
                    </li>
                  ))}
                </ul>
              </details>
              <ul className="mt-5 hidden flex-col divide-y divide-line/70 border-t border-line/70 sm:flex">
                {g.parts.map((i) => (
                  <li key={i} className="py-3">
                    <p className="font-medium">{steps[i].title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-mute">{steps[i].desc}</p>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>

      {/* the platform in one line: what goes in → the digital twin → what comes out */}
      <Reveal>
        <div className="rounded-2xl border border-line bg-gradient-to-b from-[#0f1a30] to-transparent p-5 sm:p-7">
          <p className="max-w-[720px] text-base leading-relaxed text-fg/90">
            {en
              ? 'Base data, the master plan, BIM and construction data in one 3D digital twin.'
              : 'Суурь өгөгдөл, ерөнхий төлөвлөгөө, BIM, бүтээн байгуулалтын мэдээлэл — нэг 3D дижитал твинд.'}
          </p>
          <div className="mt-6 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <ul className="flex flex-wrap gap-2 md:justify-end">
              {FLOW.in.map((x) => (
                <li key={x[0]} className="rounded-full border border-line px-3 py-1 text-sm text-fg/85">
                  {x[L]}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 justify-self-center">
              <span aria-hidden="true" className="text-mute md:block">
                →
              </span>
              <span className="rounded-xl bg-grad px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg shadow-blue-900/40">
                TwinCore
                <span className="block text-[11px] font-normal text-white/80">{en ? '3D digital twin' : '3D дижитал твин'}</span>
              </span>
              <span aria-hidden="true" className="text-mute">
                →
              </span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {FLOW.out.map((x) => (
                <li key={x[0]} className="rounded-full bg-accent/15 px-3 py-1 text-sm text-accent-hi">
                  {x[L]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
