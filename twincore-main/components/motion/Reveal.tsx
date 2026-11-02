'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

// Content that rises gently into place the first time it scrolls into view (Motion). `delay` staggers siblings.
// With reduced motion it simply appears (no movement). Always the same element, so the server's starting style is
// never left behind on hydration.
export default function Reveal({ children, delay = 0, y = 24, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={still ? { duration: 0 } : { duration: 0.75, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
