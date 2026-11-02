'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Step } from '@/lib/data';

// What the module does, told one part at a time. The old line slips away, then the new one slides in (never both), the
// number rolls over like a counter, the part's tags pop in one by one, and the glow drifts across with each step.
// Hover to hold a line; tap a part to jump to it.
const DUR = 7700;
const EASE = [0.22, 0.8, 0.2, 1] as const;

export default function ModuleNarrator({ steps }: { steps: Step[] }) {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [seen, setSeen] = useState(false);
  const still = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.4 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  // the step's timer: paused while held (or off screen), resumed with the time it had left
  const left = useRef(DUR);
  const started = useRef(0);
  useEffect(() => {
    left.current = DUR;
  }, [i]);
  useEffect(() => {
    if (!seen || held) return;
    started.current = performance.now();
    const id = setTimeout(() => setI((v) => (v + 1) % steps.length), Math.max(0, left.current));
    return () => {
      clearTimeout(id);
      left.current -= performance.now() - started.current;
    };
  }, [i, seen, held, steps.length]);
  const s = steps[i];
  const run = { ['--dur' as string]: `${DUR}ms`, animationPlayState: held || !seen ? 'paused' : 'running' } as React.CSSProperties;
  const t = still ? { duration: 0 } : { duration: 0.35, ease: EASE };

  return (
    <div ref={box} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#0f1d3a] via-ink to-ink p-6 sm:p-9">
      {/* the glow drifts across as the story moves on */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 h-80 w-80 rounded-full bg-accent/25 blur-3xl"
        animate={{ left: `${10 + (i / Math.max(1, steps.length - 1)) * 70}%` }}
        transition={{ duration: 1.6, ease: EASE }}
      />
      <div className="relative grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-8">
        {/* the number rolls over */}
        <div className="relative h-[3.25rem] w-[4.5rem] overflow-hidden sm:h-[4.5rem] sm:w-[6.5rem]" aria-hidden="true">
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={i}
              className="text-grad absolute inset-0 font-mono text-5xl leading-none tabular-nums sm:text-7xl"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={t}
            >
              {String(i + 1).padStart(2, '0')}
            </motion.span>
          </AnimatePresence>
        </div>
        {/* the line: the old one slides up and away while the new one comes in */}
        <div className="relative min-h-[150px] sm:min-h-[132px]" aria-live="polite">
          <AnimatePresence initial={false} mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={t}>
              <p className="text-2xl font-medium tracking-[-0.01em] sm:text-3xl">{s.title}</p>
              <p className="mt-2 max-w-[640px] text-base leading-relaxed text-fg/75 sm:text-lg">{s.desc}</p>
              {s.items.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.items.map((x, k) => (
                    <motion.li
                      key={x}
                      className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent-hi"
                      initial={{ opacity: 0, scale: 0.85, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={still ? { duration: 0 } : { duration: 0.45, delay: 0.25 + k * 0.08, ease: EASE }}
                    >
                      {x}
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {/* the parts: progress, and a way to jump */}
      <ol className="relative mt-8 flex flex-wrap gap-x-1.5 gap-y-2">
        {steps.map((x, k) => (
          <li key={x.title} className="min-w-[40px] flex-1">
            <button type="button" onClick={() => setI(k)} title={x.title} aria-label={x.title} aria-current={k === i} className="group block w-full cursor-pointer py-2">
              <span className="relative block h-1 overflow-hidden rounded-full bg-line transition-colors group-hover:bg-line/80">
                <motion.span className="absolute inset-y-0 left-0 bg-accent/70" initial={false} animate={{ width: k < i ? '100%' : '0%' }} transition={{ duration: 0.5, ease: EASE }} />
                {k === i && <span key={i} className="animate-fill absolute inset-0 bg-grad" style={run} />}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
