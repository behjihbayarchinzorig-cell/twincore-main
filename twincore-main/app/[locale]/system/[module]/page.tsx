import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import BuildCurve from '@/components/system/BuildCurve';
import LayerMap from '@/components/system/LayerMap';
import PackageTable from '@/components/system/PackageTable';
import { ToHandover } from '@/components/system/MonitorDelivery';
import SitePlanner from '@/components/system/SitePlanner';
import { AlertFeed, LiveSensors } from '@/components/system/SiteMonitor';
import GeoAi from '@/components/system/GeoAi';
import { LodViewer, RiskSim } from '@/components/system/TwinLab';
import { H1, H2, Lead, Sample, Wrap } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { routing, type Lang } from '@/i18n/routing';
import { DECK_MAP, MODULES, deckModulesOf, type Module } from '@/lib/data';
import DeckChips from '@/components/system/DeckChips';
import CenterCurrent from '@/components/CenterCurrent';
import ControlParts from '@/components/system/ControlParts';
import ModuleNarrator from '@/components/system/ModuleNarrator';
import Reveal from '@/components/motion/Reveal';

type Props = { params: Promise<{ locale: Lang; module: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => MODULES[locale].map((m) => ({ locale, module: m.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, module } = await params;
  const m = MODULES[locale].find((x) => x.slug === module);
  return { title: m?.name, description: m?.lead };
}

export default async function ModulePage({ params }: Props) {
  const { locale, module } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const modules = MODULES[locale];
  const i = modules.findIndex((m) => m.slug === module);
  if (i < 0) notFound();
  const m = modules[i];
  const prev = modules[i - 1];
  const next = modules[i + 1];

  // The working parts of each module, one section each.
  const demos: Record<Module['slug'], { id: string; title: string; body: React.ReactNode }[]> = {
    data: [
      { id: 'map', title: t('system.data.title'), body: <LayerMap /> },
      { id: 'planner', title: t('system.data.planner.title'), body: <SitePlanner /> },
    ],
    twin: [
      { id: 'lod', title: t('system.twin.lodTitle'), body: <LodViewer /> },
      { id: 'sim', title: t('system.twin.simTitle'), body: <RiskSim /> },
      { id: 'geoai', title: t('system.twin.geoai.title'), body: <GeoAi /> },
    ],
    control: [
      { id: 'curve', title: t('system.control.curveTitle'), body: <BuildCurve stages={(['s1', 's2', 's3', 's4', 's5'] as const).map((k) => t(`system.control.stages.${k}`))} /> },
      { id: 'packages', title: t('system.control.packagesTitle'), body: <PackageTable /> },
    ],
    monitor: [
      { id: 'live', title: t('system.monitor.liveTitle'), body: <LiveSensors /> },
      { id: 'handover', title: t('system.monitor.handoverTitle'), body: <ToHandover /> },
      { id: 'alerts', title: t('system.monitor.alertsTitle'), body: <AlertFeed /> },
    ],
  };

  return (
    <>
      <section className="pt-10 pb-12 sm:pt-14">
        <Wrap>
          <ol data-strip className="no-scrollbar -mx-5 flex gap-x-5 overflow-x-auto px-5 py-1 text-sm whitespace-nowrap sm:mx-0 sm:flex-wrap sm:gap-y-2 sm:px-0">
            {modules.map((x, j) => (
              <li key={x.slug}>
                <Link
                  href={`/system/${x.slug}`}
                  aria-current={j === i ? 'page' : undefined}
                  className={`transition-colors ${j === i ? 'text-fg underline decoration-accent decoration-2 underline-offset-[7px]' : 'text-mute hover:text-fg'}`}
                >
                  {x.name}
                </Link>
              </li>
            ))}
          </ol>
          <CenterCurrent />
          <div className="mt-10">
            <H1>{m.name}</H1>
            <Lead>{t(`home.story.${m.slug}`)}</Lead>
            {/* which of the presentation's four modules this section shows: each opens what it covers and its pages */}
            <DeckChips
              label={t('system.deck.in')}
              here={t('system.deck.here')}
              chips={deckModulesOf(m.slug).map((k) => ({
                key: k,
                name: t(`system.deck.m.${k}`),
                why: t(`system.deck.why.${k}`),
                pages: (DECK_MAP.find((d) => d.key === k)?.sections ?? []).map((slug) => ({ slug, name: modules.find((x) => x.slug === slug)?.name ?? slug, current: slug === m.slug })),
              }))}
            />
          </div>
          {/* what the module does, told one part at a time */}
          {m.slug !== 'control' && (
            <Reveal className="mt-10" delay={0.15}>
              <ModuleNarrator steps={m.steps} />
            </Reveal>
          )}
          {/* construction control: the working workspace behind this description */}
          {m.slug === 'control' && (
            <Link href="/construction" className="group mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/40 bg-accent/[0.07] p-5 transition-colors hover:border-accent">
              <span>
                <span className="block font-medium text-fg">{t('system.control.openWorkspace')}</span>
                <span className="mt-1 block max-w-[760px] text-sm text-mute">{t('system.control.workspaceLine')}</span>
              </span>
              <span className="bg-grad rounded-full px-4 py-2 text-sm font-medium text-white transition group-hover:brightness-110">{t('system.control.open')} →</span>
            </Link>
          )}
          {/* the monitoring readings are generated, not measured: say so plainly, before anything is shown */}
          {m.slug === 'monitor' && (
            <div role="note" className="mt-8 flex gap-4 rounded-2xl border border-sky-400/40 bg-sky-400/[0.07] p-5">
              <span aria-hidden="true" className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-400/20 font-mono text-sm text-sky-300">
                !
              </span>
              <div>
                <p className="font-medium text-sky-200">{t('system.monitor.sim.title')}</p>
                <p className="mt-1 max-w-[760px] text-sm leading-relaxed text-fg/80">{t('system.monitor.sim.body')}</p>
              </div>
            </div>
          )}
        </Wrap>
      </section>

      {demos[m.slug].map((d) => (
        <section key={d.id} id={d.id} className="scroll-mt-20 border-t border-line py-12 sm:py-16">
          <Wrap>
            <Reveal>
              <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
                <H2>{d.title}</H2>
                {m.slug === 'monitor' ? (
                  <span className="rounded-full border border-sky-400/50 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-300">{t('system.monitor.sim.badge')}</span>
                ) : (
                  <Sample>{t('twin.sample')}</Sample>
                )}
              </div>
            </Reveal>
            <Reveal delay={0.1}>{d.body}</Reveal>
          </Wrap>
        </section>
      ))}

      {/* construction control: its thirteen parts, grouped */}
      {m.slug === 'control' && (
        <section className="border-t border-line py-12 sm:py-16">
          <Wrap>
            <ControlParts steps={m.steps} en={locale === 'en'} />
          </Wrap>
        </section>
      )}

      <Wrap className="pb-16">
        <nav className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-6">
          {prev ? (
            <Link href={`/system/${prev.slug}`} className="group">
              <span className="block font-mono text-xs text-mute">← {t('system.prev')}</span>
              <span className="mt-1 block font-display text-base group-hover:text-accent sm:text-lg">{prev.name}</span>
            </Link>
          ) : (
            <Link href="/#overview" className="group">
              <span className="block font-mono text-xs text-mute">← {t('nav.system')}</span>
              <span className="mt-1 block font-display text-base group-hover:text-accent sm:text-lg">{t('system.title')}</span>
            </Link>
          )}
          <Link href={next ? `/system/${next.slug}` : '/contact'} className="group text-right">
            <span className="block font-mono text-xs text-mute">{next ? t('system.next') : t('nav.contact')} →</span>
            <span className="mt-1 block font-display text-base group-hover:text-accent sm:text-lg">{next ? next.name : t('nav.contact')}</span>
          </Link>
        </nav>
      </Wrap>
    </>
  );
}
