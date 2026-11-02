import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import DevPanel from '@/components/DevPanel';
import { Wrap } from '@/components/ui';
import type { Lang } from '@/i18n/routing';

type Props = { params: Promise<{ locale: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'dev' });
  return { title: t('title'), robots: { index: false } };
}

// The developer's account monitor. Access is checked in Convex (DEV_EMAILS), not here.
export default async function DevPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dev');

  return (
    <Wrap className="py-12 sm:py-16">
      <p className="mb-3 font-mono text-xs text-mute">{t('eyebrow')}</p>
      <h1 className="text-3xl sm:text-4xl">{t('title')}</h1>
      <p className="mt-2 mb-8 max-w-[60ch] text-mute">{t('lead')}</p>
      <DevPanel />
    </Wrap>
  );
}
