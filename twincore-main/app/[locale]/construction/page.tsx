import { setRequestLocale } from 'next-intl/server';
import Dashboard from '@/components/construction/sections/Dashboard';
import type { Lang } from '@/i18n/routing';

export default async function ConstructionDashboard({ params }: { params: Promise<{ locale: Lang }> }) {
  setRequestLocale((await params).locale);
  return <Dashboard />;
}
