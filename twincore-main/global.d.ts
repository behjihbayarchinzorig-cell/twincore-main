import type { routing } from '@/i18n/routing';
import type messages from './messages/mn.json';

// Type-checks message keys and locales for useTranslations / getTranslations.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
