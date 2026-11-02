import { getTranslations, setRequestLocale } from 'next-intl/server';
import BenefitMetrics from '@/components/BenefitMetrics';
import Reveal from '@/components/motion/Reveal';
import { overviewScenes } from '@/components/system/Overview';
import SystemStory from '@/components/system/SystemStory';
import { Wrap } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import type { Lang } from '@/i18n/routing';

// The front page is the overview: what TwinCore does, with the platform told as a short animated story beside it;
// then what it delivers. (How the presentation's modules map onto the site lives in the "Систем" menu.) (The 3D district film that used to sit behind the
// headline — components/bim/HeroBim.tsx and components/district — is kept, unused, to bring back later.)
// The headline arrives in sequence — words, lead, buttons.
const rise = (ms: number) => ({ animationDelay: `${ms}ms` });

export default async function Home({ params }: { params: Promise<{ locale: Lang }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const words = t('home.title').split(' ');
  const after = words.length * 90; // when the headline has finished arriving
  const scenes = await overviewScenes(locale);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        {/* a soft blue light and a faint plan grid behind the headline */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_50%_0%,rgb(37_99_235/0.3),transparent_70%)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]"
          style={{ backgroundImage: 'linear-gradient(rgb(148 163 184 / 0.12) 1px, transparent 1px), linear-gradient(90deg, rgb(148 163 184 / 0.12) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
        />
        <Wrap className="grid min-h-[calc(80svh-4rem)] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div className="text-center lg:text-left">
            <h1 className="text-balance text-[clamp(36px,4.6vw,68px)] leading-[1.03] font-medium tracking-[-0.035em]">
              {words.map((w, i) => (
                <span key={i} className="animate-word inline-block" style={rise(i * 90)}>
                  {w}
                  {i < words.length - 1 && '\u00a0'}
                </span>
              ))}
            </h1>
            <p className="animate-word mx-auto mt-6 max-w-[600px] text-pretty text-lg text-mute lg:mx-0" style={rise(after + 100)}>
              {t('home.lead')}
            </p>
            <p className="animate-word mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 lg:justify-start" style={rise(after + 350)}>
              <a href="#overview" className="bg-grad inline-flex items-center rounded-full px-5 py-2 text-sm font-medium text-white transition hover:brightness-110">
                {t('home.cta')}
              </a>
              <Link href="/contact" className="inline-flex items-center rounded-full border border-line px-5 py-2 text-sm text-fg transition-colors hover:border-mute">
                {t('nav.contact')}
              </Link>
            </p>
          </div>
          {/* the overview, beside the headline */}
          <div id="overview" className="animate-word scroll-mt-24" style={rise(after + 200)}>
            <SystemStory scenes={scenes} more={t('system.openModule')} compact />
          </div>
        </Wrap>
      </section>

      <Wrap className="pb-24">
        <Reveal>
          <BenefitMetrics />
        </Reveal>
      </Wrap>
    </>
  );
}
