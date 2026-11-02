'use client';

import dynamic from 'next/dynamic';
import { memo, useEffect, useRef, useState } from 'react';
import type { DistrictProps } from './DistrictCanvas';

const DistrictCanvas = dynamic(() => import('./DistrictCanvas'), {
  ssr: false,
  loading: () => <div className="shimmer h-full w-full" />,
});

// The district film as a background: it renders only while on screen, and nobody steers it — clicks and scrolling
// pass straight through to the page.
export default memo(function DistrictViewer({ className = '', ...props }: Omit<DistrictProps, 'running'> & { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { rootMargin: '100px' });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} aria-hidden="true" className={`pointer-events-none relative ${className}`}>
      <DistrictCanvas {...props} running={running} />
    </div>
  );
});
