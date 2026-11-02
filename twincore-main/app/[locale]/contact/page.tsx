import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import AddressCard from '@/components/AddressCard';
import ContactMethods from '@/components/contact/ContactMethods';
import { Eyebrow, H1, Lead, Section } from '@/components/ui';
import type { Lang } from '@/i18n/routing';

type Props = { params: Promise<{ locale: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale });
  return { title: t('nav.contact'), description: t('contact.lead') };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <Section>
      <Eyebrow>MonMap LLC</Eyebrow>
      <H1>{t('nav.contact')}</H1>
      <Lead>{t('contact.lead')}</Lead>

      <div className="mt-12 grid gap-6">
        <ContactMethods />
        <p className="text-sm text-mute">{t('contact.responds')}</p>
      </div>

      <div className="mt-6 grid">
        <AddressCard />
      </div>
    </Section>
  );
}
