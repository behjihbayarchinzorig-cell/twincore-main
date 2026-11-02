import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import LoginForm from '@/components/LoginForm';
import LogoMark from '@/components/LogoMark';
import type { Lang } from '@/i18n/routing';

type Props = { params: Promise<{ locale: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'login' });
  return { title: t('title'), description: t('lead'), robots: { index: false } };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('login');

  return (
    <section className="grid min-h-[calc(100svh-10rem)] place-items-center px-5 py-16">
      <div className="w-full max-w-[400px]">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-5 text-center text-3xl">{t('title')}</h1>
        <p className="mt-2 mb-8 text-center text-mute">{t('lead')}</p>
        <div className="rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur">
          <LoginForm />
        </div>
      </div>
    </section>
  );
}
