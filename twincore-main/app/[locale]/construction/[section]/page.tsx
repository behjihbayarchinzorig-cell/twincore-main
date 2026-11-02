import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import SectionView from '@/components/construction/SectionView';
import { routing, type Lang } from '@/i18n/routing';
import { SECTIONS, type Section } from '@/lib/construction/text';

export const dynamicParams = false;
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SECTIONS.filter((s) => s !== 'dashboard').map((section) => ({ locale, section })));
}

export default async function ConstructionSection({ params }: { params: Promise<{ locale: Lang; section: string }> }) {
  const { locale, section } = await params;
  setRequestLocale(locale);
  if (!SECTIONS.includes(section as Section) || section === 'dashboard') notFound();
  return <SectionView section={section as Exclude<Section, 'dashboard'>} />;
}
