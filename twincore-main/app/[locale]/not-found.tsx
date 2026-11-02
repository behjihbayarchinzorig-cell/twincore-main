import { useTranslations } from 'next-intl';
import { H1, Lead, Section } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <Section>
      <p className="mb-4 font-mono text-xs text-mute">404</p>
      <H1>{t('title')}</H1>
      <Lead>
        <Link href="/" className="text-accent hover:text-accent-hi">{t('back')}</Link>
      </Lead>
    </Section>
  );
}
