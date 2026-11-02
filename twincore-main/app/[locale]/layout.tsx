import type { Metadata, Viewport } from 'next';
import { ConvexAuthNextjsServerProvider, convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { Roboto } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import AccountButton from '@/components/AccountButton';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import LangToggle from '@/components/LangToggle';
import LogoMark from '@/components/LogoMark';
import Nav from '@/components/Nav';
import SmoothScroll from '@/components/motion/SmoothScroll';
import TabBar from '@/components/TabBar';
import { Wrap } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { isDev, viewer } from '@/lib/account';
import { routing } from '@/i18n/routing';
import '../globals.css';

const roboto = Roboto({ subsets: ['latin', 'cyrillic'], weight: ['300', '400', '500', '700'], variable: '--font-roboto' });

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'mn', namespace: 'meta' });
  return {
    title: { default: t('title'), template: '%s — TwinCore' },
    description: t('description'),
    // Mongolian is served without a prefix.
    alternates: { languages: { mn: '/', en: '/en', 'x-default': '/' } },
    // Added to a phone's home screen it opens full screen, like an app.
    appleWebApp: { capable: true, title: 'TwinCore', statusBarStyle: 'black-translucent' },
    icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = { viewportFit: 'cover', themeColor: '#060b18', width: 'device-width', initialScale: 1 };

// Three rising towers with the twin strands, plus the wordmark.
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 justify-self-start font-display text-lg font-bold tracking-[-0.02em]">
      <LogoMark className="h-8 w-8" />
      TwinCore
    </Link>
  );
}

// Who is signed in, read from the session cookie, so the header shows the account from the first paint instead of
// "Log in" until the browser has re-checked the session.
async function initialAccount() {
  const token = await convexAuthNextjsToken();
  if (!token) return { user: null, dev: false };
  try {
    const [user, dev] = await Promise.all([fetchQuery(viewer, {}, { token }), fetchQuery(isDev, {}, { token })]);
    return { user, dev };
  } catch {
    return { user: null, dev: false };
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('contact');
  const tf = await getTranslations('footer');
  const account = await initialAccount();
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang={locale} className={roboto.variable}>
        <body>
          <SmoothScroll />
          <NextIntlClientProvider>
            <ConvexClientProvider>
              {/* Logo in the left corner, the menu centred, language and sign-in on the right. On phones the menu is the
              tab bar at the bottom. */}
              <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
                <Wrap className="grid h-14 grid-cols-[1fr_auto] items-center gap-x-4 sm:h-16 md:grid-cols-[1fr_auto_1fr]">
                  <Logo />
                  <div className="hidden md:block">
                    <Nav />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <LangToggle />
                    <AccountButton initial={account} />
                  </div>
                </Wrap>
              </header>
              <main>{children}</main>
              <footer className="border-t border-line pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                <Wrap className="grid gap-8 py-10 font-mono text-xs text-mute sm:grid-cols-[1fr_auto]">
                  {/* the two companies behind TwinCore, side by side and alike */}
                  <div className="space-y-3">
                    <p className="text-fg">{tf('partners')}</p>
                    <p className="max-w-[520px] text-pretty">{tf('partnersText')}</p>
                    <ul className="grid max-w-[520px] gap-3 sm:grid-cols-2">
                      <li className="rounded-xl border border-line px-4 py-3">
                        <p className="text-fg">Tugs Spatial Mapify LLC</p>
                      </li>
                      <li className="rounded-xl border border-line px-4 py-3">
                        <p className="text-fg">MonMap LLC</p>
                      </li>
                    </ul>
                    <p className="pt-1">{t('addressText')}</p>
                  </div>
                  <div className="space-y-1 sm:text-right">
                    <p>
                      <a className="hover:text-fg" href="tel:+97685243307">
                        +976 8524 3307
                      </a>
                    </p>
                    <p>
                      <a className="hover:text-fg" href="mailto:bilguuntugs50@gmail.com">
                        bilguuntugs50@gmail.com
                      </a>
                    </p>
                    <p>© 2026</p>
                  </div>
                </Wrap>
              </footer>
              <TabBar />
            </ConvexClientProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
