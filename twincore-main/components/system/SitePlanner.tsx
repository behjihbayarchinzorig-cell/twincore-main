'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import FinanceCounter from '@/components/bim/Blueprint';
import BimViewer, { type Pose } from '@/components/bim/BimViewer';
import { PLAN_GHOST, planRiseStyler } from '@/components/bim/stages';
import { FLOORS, LIMITS, SITE, UNITS, VARIANTS } from '@/lib/twin';

// Planning a site in three steps: pick the plot, raise the BIM model from the approved drawings, and work out
// the money. It plays once when it comes into view, at a pace you can read; each step can be picked, paused
// and replayed. Only the step on screen is opened up, with its key facts ticking in as the model gets there.

const STEPS = ['site', 'bim', 'finance'] as const;
type Step = (typeof STEPS)[number];
const AT: Record<Step, [number, number]> = { site: [0, 7000], bim: [7000, 16000], finance: [16000, 25000] };
const END = AT.finance[1];
const VIEW: Pose = { position: [132, 189, 165], target: [-8, 0, 52] };
const V = VARIANTS[0];
const HOMES = (FLOORS - 1) * UNITS;
const sp = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export default function SitePlanner() {
  const t = useTranslations('system.data.planner');
  const th = useTranslations('home');
  const box = useRef<HTMLDivElement>(null); // the viewer: on phones the steps sit below it, so start when the model itself is in view
  const [time, setTime] = useState(END); // the finished state until it plays
  const [run, setRun] = useState<{ from: number; nonce: number } | null>(null);

  // Start once, the first time it scrolls into view (straight to the result for reduced motion).
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setRun({ from: 0, nonce: Date.now() });
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now() - run.from;
    let last = -1;
    const tick = (now: number) => {
      const el = Math.min(END, now - start);
      const q = Math.floor(el / 50) * 50;
      if (q !== last) setTime((last = q));
      if (el < END) raf = requestAnimationFrame(tick);
      else setRun(null);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);

  const playing = run !== null;
  const step: Step = time < AT.site[1] ? 'site' : time < AT.bim[1] ? 'bim' : 'finance';
  const within = (s: Step) => Math.min(1, Math.max(0, (time - AT[s][0]) / (AT[s][1] - AT[s][0])));
  const rise = Math.min(1, within('bim') / 0.8); // the model is up with a little time to look at it
  const levels = Math.floor(rise * (FLOORS + 1));
  const finance = Math.min(1, within('finance') / 0.75);
  const styler = useMemo(() => planRiseStyler(levels), [levels]);

  const go = (s: Step) => setRun({ from: AT[s][0], nonce: Date.now() });
  const toggle = () => (playing ? setRun(null) : setRun({ from: time >= END ? 0 : time, nonce: Date.now() }));

  // the key facts of each step, ticking in at set points through it
  const facts: Record<Step, [string, string, boolean?][]> = {
    site: [
      [t('f.plot'), t('f.plotV', { w: SITE.w, d: SITE.d, a: sp(SITE.w * SITE.d) })],
      [t('f.zone'), t('f.zoneV', { far: LIMITS.far, bcr: LIMITS.bcr })],
      [t('f.infra'), t('f.infraV')],
    ],
    bim: [
      [t('f.variant'), t('f.variantV', { id: V.id, n: FLOORS, h: HOMES })],
      [t('f.far'), `${V.far} / ${LIMITS.far}`, V.far <= LIMITS.far],
      [t('f.bcr'), `${V.bcr}% / ${LIMITS.bcr}%`, V.bcr <= LIMITS.bcr],
    ],
    finance: [],
  };
  const shownFacts = (s: Step) => (s !== step ? 3 : Math.floor(within(s) / 0.22));

  // what the model is doing right now, for the caption on the view
  const live =
    step === 'site'
      ? t('live.site')
      : step === 'bim'
        ? rise < 1
          ? t('live.bim', { n: Math.min(levels, FLOORS + 1), of: FLOORS + 1 })
          : t('live.bimDone')
        : finance < 1
          ? t('live.finance')
          : t('live.financeDone');

  return (
    <div className="grid items-start gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div>
        <div ref={box} className="relative">
          <BimViewer
            className="h-[340px] sm:h-[420px] lg:h-[560px]"
            cameraKey="planner.cam"
            styler={styler}
            styleKey={`planner:${levels}`}
            pickable={() => false}
            paper
            siteSelect={step === 'site' && playing}
            ghost={PLAN_GHOST}
            defaultView={VIEW}
          />
          {/* caption: which step, and what is happening */}
          <div className="pointer-events-none absolute top-2 left-2 max-w-[calc(100%-1rem)] rounded-md bg-ink/80 px-3 py-2 backdrop-blur-sm sm:top-3 sm:left-3 sm:max-w-[calc(100%-1.5rem)] sm:px-3.5 sm:py-2.5">
            <p className="font-mono text-[11px] text-accent">
              {STEPS.indexOf(step) + 1} / 3 · {th(`designSteps.${step}`)}
            </p>
            <p key={live} className="animate-fade-in mt-0.5 text-[13px] leading-snug text-fg sm:text-sm">
              {live}
            </p>
          </div>
        </div>

        {/* the timeline: three segments, click to jump, with play / pause */}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? th('pause') : th('play')}
            data-round className={`grid h-10 w-10 shrink-0 sm:h-8 sm:w-8 cursor-pointer place-items-center rounded-full border transition-colors ${
              playing ? 'border-line text-mute hover:text-fg' : 'border-accent bg-accent/15 text-accent'
            }`}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : time >= END ? <path d="M8 3a5 5 0 1 0 5 5h-2a3 3 0 1 1-3-3v2l3.5-3L8 1z" /> : <path d="M5 3l8 5-8 5z" />}
            </svg>
          </button>
          <div className="grid flex-1 grid-cols-[7fr_9fr_9fr] gap-1.5">
            {STEPS.map((s) => (
              <button key={s} type="button" onClick={() => go(s)} className="group cursor-pointer py-2.5 text-left sm:py-1.5" aria-label={th(`designSteps.${s}`)}>
                <span className="block h-1 overflow-hidden rounded-full bg-line">
                  <span className="block h-full bg-accent" style={{ width: `${within(s) * 100}%` }} />
                </span>
                <span className={`mt-1.5 block truncate text-[11px] transition-colors ${s === step ? 'text-fg' : 'text-mute group-hover:text-fg'}`}>
                  {th(`designSteps.${s}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* the steps: the current one opened up */}
      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const on = s === step;
          const done = STEPS.indexOf(step) > i;
          return (
            <li key={s} className={`rounded-lg border transition-colors duration-500 ${on ? 'border-line bg-surface' : 'border-transparent'}`}>
              <button type="button" onClick={() => go(s)} className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left sm:px-4">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs transition-colors ${
                    on ? 'border-accent bg-accent/15 text-accent' : done ? 'border-line text-fg' : 'border-line/60 text-mute'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className={on ? 'text-fg' : 'text-mute'}>{th(`designSteps.${s}`)}</span>
              </button>

              {on && (
                <div className="animate-fade-in px-3.5 pb-4 sm:px-4 sm:pl-14">
                  <p className="text-sm leading-relaxed text-fg/85">{t(`${s}.what`)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{t(`${s}.why`)}</p>

                  {facts[s].length > 0 && (
                    <dl className="mt-4 space-y-1.5">
                      {facts[s].map(([k, v, ok], j) => {
                        const shown = j < shownFacts(s);
                        return (
                          <div
                            key={k}
                            className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md bg-ink/60 px-3 py-2 text-sm transition-[opacity,transform] duration-500 ${
                              shown ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                            }`}
                          >
                            <dt className="text-mute">{k}</dt>
                            <dd className="text-right font-mono text-xs text-fg">
                              {v}
                              {ok !== undefined && <span className={`ml-2 ${ok ? 'text-[#9fbf8a]' : 'text-accent'}`}>{ok ? '✓' : '✕'}</span>}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                  {s === 'finance' && <FinanceCounter progress={finance} />}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
