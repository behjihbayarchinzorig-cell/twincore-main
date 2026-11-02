import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['mn', 'en'],
  // Mongolian is the main language: it has no URL prefix (/system), English lives under /en.
  defaultLocale: 'mn',
  localePrefix: 'as-needed',
  // Only the flag button changes the language; the browser's language is never used to redirect.
  localeDetection: false,
});

export type Lang = (typeof routing.locales)[number];
