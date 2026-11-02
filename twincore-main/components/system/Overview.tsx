import { getTranslations } from 'next-intl/server';
import type { Scene } from '@/components/system/SystemStory';
import type { Lang } from '@/i18n/routing';
import { MODULES } from '@/lib/data';

// The overview, on the front page: the platform told as a short story — the four main parts in order, then how
// they are one platform (one short line each, shortened from the module descriptions) — which runs beside the
// headline. The scenes have their own names (home.story.names); the first four still open their module.
export async function overviewScenes(locale: Lang): Promise<Scene[]> {
  const th = await getTranslations('home.story');
  const en = locale === 'en';
  const modules = MODULES[locale];
  const names = th.raw('names') as string[];
  return [
    ...modules.map((m, k) => ({ name: names[k] ?? m.name, lead: th(m.slug), points: m.steps.slice(0, 3).map((s) => s.title), href: `/system/${m.slug}` })),
    { name: names[modules.length] ?? (en ? 'One platform' : 'Нэг платформ'), lead: th('one'), points: modules.map((m) => m.name) },
  ];
}
