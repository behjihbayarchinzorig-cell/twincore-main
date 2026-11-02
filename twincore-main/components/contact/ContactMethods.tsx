import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

const ICON: Record<'phone' | 'email' | 'web', ReactNode> = {
  phone: <path d="M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8L16 13l4 1.5v3A2.5 2.5 0 0 1 17.5 20 13.5 13.5 0 0 1 4 6.5 2.5 2.5 0 0 1 6.5 4z" />,
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  web: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
};

type Method = { kind: keyof typeof ICON; value: string; href: string; action: string; external?: boolean };

// Phone, email and web. Each whole card is a link straight into the right app: the phone opens the dialler with
// the number filled in, email opens a new message, the website opens in a new tab.
export default function ContactMethods() {
  const t = useTranslations('contact');
  const methods: Method[] = [
    { kind: 'phone', value: '+976 8524 3307', href: 'tel:+97685243307', action: t('call') },
    { kind: 'email', value: 'bilguuntugs50@gmail.com', href: 'mailto:bilguuntugs50@gmail.com', action: t('write') },
    { kind: 'web', value: 'www.monmap.mn', href: 'https://www.monmap.mn', action: t('visit'), external: true },
  ];

  return (
    <ul className="grid gap-3">
      {methods.map((m) => (
        <li key={m.kind}>
          <a
            href={m.href}
            target={m.external ? '_blank' : undefined}
            rel={m.external ? 'noopener' : undefined}
            aria-label={`${m.action}: ${m.value}`}
            className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent/70 active:bg-raised sm:gap-5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 text-accent" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                {ICON[m.kind]}
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-xs text-mute">{t(m.kind)}</span>
              <span className="mt-0.5 block truncate text-xl font-medium tracking-[-0.02em] group-hover:text-accent">{m.value}</span>
            </span>
            <span aria-hidden="true" className="text-2xl text-accent sm:hidden">›</span>
            <span className="hidden rounded-md bg-grad px-4 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors group-hover:brightness-110 sm:inline">
              {m.action}
              {m.external && ' ↗'}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
