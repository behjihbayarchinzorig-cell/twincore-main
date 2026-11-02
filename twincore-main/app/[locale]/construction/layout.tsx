import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import Shell from '@/components/construction/Shell';
import type { Lang } from '@/i18n/routing';

// The construction workspace (demonstration data). Not indexed: it is a working tool, not a page about the product.
export const metadata: Metadata = { title: 'Бүтээн байгуулалтын хяналт — ажлын орон зай', robots: { index: false } };

export default async function ConstructionLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Lang);
  return <Shell>{children}</Shell>;
}
