'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Wrap } from '@/components/ui';
import DistrictViewer from '@/components/district/DistrictViewer';
import Reveal from '@/components/motion/Reveal';
import BenefitMetrics from '@/components/BenefitMetrics';
import { newTimeline, type Timeline } from '@/components/district/DistrictCanvas';
import type { LiveWeather } from '@/app/api/weather/route';
import { DISTRICT_FIGURES, T } from '@/lib/district';
import { usePersistentState } from '@/lib/persist';

// The front page hero: the district film running full screen behind the headline, like a background video — the
// site planned, built package by package, then alive with traffic and people, in one slow camera sweep. It loops
// once per visit (on arriving or reloading — not again on coming back to the page), then the camera drifts on round
// the living district for as long as you stay. Its sky is live: Ulaanbaatar's time and weather right now (clouds, fog, rain, snow, snow
// lying in winter), refreshed every ten minutes.
// Nobody steers it; a pause button stops it.

type Stage = 'design' | 'build' | 'operate';
const STAGES: Stage[] = ['design', 'build', 'operate'];
const CHAPTER: Record<Stage, number> = { design: 0, build: T.planEnd, operate: T.live };
const FILM = 38000;
// the film fades in from dark as it starts
const fadeAt = (u: number) => Math.max(0, 1 - u / 0.03);
// has the build been shown in this visit? (module state: survives moving between pages, not a reload)
let played = false;

export default function HeroBim({ names, children }: { names: string[]; children: ReactNode }) {
  const [playing, setPlaying] = usePersistentState('hero.playing', true);
  const timeline = useRef<Timeline>(newTimeline());
  const [stage, setStage] = useState<Stage>('design');
  const fade = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const th = useTranslations('home');
  const [live, setLive] = useState<LiveWeather | null>(null);
  const [clock, setClock] = useState('');

  // the weather outside, now and every ten minutes
  useEffect(() => {
    let gone = false;
    const get = () =>
      fetch('/api/weather')
        .then((r) => (r.ok ? r.json() : null))
        .then((w: LiveWeather | null) => {
          if (gone) return;
          setLive(w);
          timeline.current.live = w ? { cloud: w.kind === 'storm' ? 1 : w.cloud, rain: w.rain, snow: w.snow, fog: w.fog, cover: w.cover } : null;
        })
        .catch(() => {});
    get();
    const id = setInterval(get, 600000);
    return () => {
      gone = true;
      clearInterval(id);
    };
  }, []);
  // Ulaanbaatar's time on the badge
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const tick = () => setClock(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  // Reduced motion: no film — the finished district, still.
  const [still, setStill] = useState(false);
  // back on the page later in the same visit: no second build, straight to the living district
  useEffect(() => {
    if (!played) return;
    const tl = timeline.current;
    tl.t = tl.cam = 1;
    setStage('operate');
  }, []);
  useEffect(() => {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setStill(true);
    const tl = timeline.current;
    tl.t = tl.cam = 1;
    setStage('operate');
  }, []);

  // The film: runs, fades to dark at the end, and starts again with the next weather.
  useEffect(() => {
    const tl = timeline.current;
    tl.playing = playing && !still;
    // paused (or still): never leave the opening fade covering the picture
    if (fade.current) fade.current.style.opacity = playing && !still ? String(fadeAt(tl.cam)) : '0';
    if (!playing || still) return;
    let raf = 0;
    let prev = performance.now();
    let readyAt = 0;
    const tick = (ts: number) => {
      const dt = Math.min(250, ts - prev); // a long pause (another tab) doesn't jump the film
      prev = ts;
      // the scene builds behind the dark; once it's ready it fades in, and only then does the film run
      if (!tl.ready) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!readyAt) readyAt = ts;
      const reveal = Math.min(1, (ts - readyAt) / 1100);
      if (tl.cam < 1) {
        tl.cam = Math.min(1, tl.cam + dt / FILM);
        if (tl.cam >= 1) played = true;
      } else tl.after += dt / 1000;
      tl.t = tl.cam;
      if (fade.current) fade.current.style.opacity = String(Math.max(fadeAt(tl.cam), 1 - reveal * reveal * (3 - 2 * reveal)));
      const s: Stage = tl.cam >= CHAPTER.operate ? 'operate' : tl.cam >= CHAPTER.build ? 'build' : 'design';
      setStage((v) => (v === s ? v : s));
      const end = s === 'design' ? CHAPTER.build : s === 'build' ? CHAPTER.operate : 1;
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, (tl.cam - CHAPTER[s]) / (end - CHAPTER[s]))})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, still]);

  return (
    <>
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden">
        {/* the film, behind everything */}
        <div className="absolute inset-0 -z-30">
          <DistrictViewer className="h-full w-full" timeline={timeline} />
        </div>
        {/* shading so the words read: dark at the top and bottom edges, a soft pool behind the headline */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_bottom,rgb(6_11_24/0.85)_0%,rgb(6_11_24/0.15)_22%,rgb(6_11_24/0.1)_60%,rgb(6_11_24/0.95)_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(55%_45%_at_50%_42%,rgb(6_11_24/0.72),rgb(6_11_24/0.25)_65%,transparent)]" />
        {/* between loops: a fade to dark */}
        <div ref={fade} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-ink" style={{ opacity: still ? 0 : 1 }} />

        {/* live: the city, its time and its weather now */}
        {live && (
          <div className="animate-fade-in absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-ink/50 px-3 py-1.5 text-xs text-fg/85 backdrop-blur-md sm:top-6 sm:right-6" title={th('live.note')}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="font-medium tracking-wide uppercase">{th('live.label')}</span>
            <span className="text-mute">·</span>
            <span>{th('live.city')}</span>
            <span className="font-mono tabular-nums">{clock}</span>
            <span className="text-mute">·</span>
            <span className="font-mono tabular-nums">
              {live.temp > 0 ? '+' : ''}
              {live.temp}°C
            </span>
            <span className="hidden sm:inline">{th(`live.kind.${live.kind}`)}</span>
            {/* the weather data's licence (CC BY 4.0) asks for credit */}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hidden text-[10px] text-mute hover:text-fg md:inline">
              Open-Meteo
            </a>
          </div>
        )}

        <Wrap className="flex flex-1 flex-col items-center justify-center py-20 text-center sm:py-28">
          <div className="mx-auto max-w-[880px] [text-shadow:0_2px_24px_rgb(6_11_24/0.8)]">{children}</div>
        </Wrap>

        {/* where the film is: the three chapters, and pause */}
        <Wrap className="pb-8">
          <div className="mx-auto flex max-w-[640px] items-center gap-4">
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? th('pause') : th('play')}
              title={playing ? th('pause') : th('play')}
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-white/15 bg-ink/50 text-fg/80 backdrop-blur transition-colors hover:text-fg"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                {playing && !still ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M5 3l8 5-8 5z" />}
              </svg>
            </button>
            <ol className="grid flex-1 grid-cols-3 gap-3">
              {STAGES.map((s, i) => {
                const on = stage === s;
                const done = STAGES.indexOf(stage) > i;
                return (
                  <li key={s} className="min-w-0">
                    <span className="block h-0.5 overflow-hidden rounded-full bg-white/15">
                      {on ? <span ref={bar} className="block h-full origin-left bg-grad" style={{ transform: 'scaleX(0)' }} /> : <span className={`block h-full bg-white/50 ${done ? 'w-full' : 'w-0'}`} />}
                    </span>
                    <span className={`mt-2 block truncate text-xs transition-colors duration-500 ${on ? 'text-fg' : 'text-mute'}`}>{names[i]}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </Wrap>
      </section>

      <Wrap className="py-14">
        <Reveal className="mx-auto max-w-[1000px]">
          <Figures />
        </Reveal>
        <Reveal className="mt-24">
          <BenefitMetrics />
        </Reveal>
      </Wrap>
    </>
  );
}

// The sample district in five numbers, all worked out from the model.
function Figures() {
  const t = useTranslations('home.district');
  const f = DISTRICT_FIGURES;
  const figs: [string, string, boolean?][] = [
    [t('area'), t('ha', { n: f.hectares }), true],
    [t('buildings'), String(f.buildings)],
    [t('green'), `${f.greenPct}%`],
    [t('schools'), String(f.schools)],
    [t('stops'), String(f.stops)],
  ];
  return (
    <div>
      <p className="mb-4 text-center font-mono text-[11px] text-mute">{t('sample')}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-center sm:grid-cols-5">
        {figs.map(([k, v, accent]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-mute">{k}</dt>
            <dd className={`mt-1 font-mono text-xl tabular-nums sm:text-2xl ${accent ? 'text-grad' : 'text-fg'}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
