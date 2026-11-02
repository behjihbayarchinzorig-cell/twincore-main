import { useTranslations } from 'next-intl';

const MAP_URL = 'https://maps.app.goo.gl/tbbCfmevYhsoJigz7';

// The office address set out the way you'd read it on an envelope, with a link to directions.
export default function AddressCard() {
  const t = useTranslations('contact');
  const lines = [t('addr.street'), t('addr.district'), t('addr.city')];

  return (
    <div className="col-span-full grid gap-6 rounded-lg border border-line bg-surface p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8 sm:p-8">
      {/* pin */}
      <span className="grid h-14 w-14 place-items-center rounded-full bg-accent/15 text-accent" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      </span>

      <address className="not-italic">
        <p className="font-mono text-xs text-mute">{t('address')}</p>
        <p className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">{t('addr.office')}</p>
        <p className="mt-2 leading-relaxed text-mute">
          {lines.map((l, i) => (
            // one line each on phones; a single dotted line on wider screens
            <span key={l} className="block sm:inline">
              {l}
              {i < lines.length - 1 && <span className="mx-2 hidden text-accent-soft/50 sm:inline">·</span>}
            </span>
          ))}
        </p>
      </address>

      <div className="flex flex-wrap gap-3 sm:flex-col sm:items-stretch">
        <a
          href={MAP_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-grad px-5 py-2.5 font-medium text-white transition-colors hover:brightness-110"
        >
          {t('directions')} ↗
        </a>
      </div>
    </div>
  );
}
