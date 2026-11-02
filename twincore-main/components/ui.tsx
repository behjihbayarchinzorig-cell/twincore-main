import type { ReactNode } from 'react';

export function Wrap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1520px] px-5 sm:px-8 lg:px-12 ${className}`}>{children}</div>;
}

export function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`py-16 sm:py-24 ${className}`}>
      <Wrap>{children}</Wrap>
    </section>
  );
}

// Small mono label above a heading.
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 font-mono text-xs text-mute">{children}</p>;
}

export function H1({ children }: { children: ReactNode }) {
  return <h1 className="max-w-[20ch] text-[clamp(34px,5vw,64px)] leading-[1.04] font-medium break-words">{children}</h1>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-[clamp(26px,3.4vw,42px)] leading-[1.08]">{children}</h2>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-5 max-w-[620px] text-lg text-mute">{children}</p>;
}

// A block separated by a rule rather than boxed in.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border-t border-line pt-5 ${className}`}>{children}</div>;
}

export function CardLabel({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs text-mute">{children}</p>;
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-8 gap-y-10">{children}</div>;
}

export function Sample({ children }: { children: ReactNode }) {
  return <span className="text-xs text-mute">{children}</span>;
}
