import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import '@/styles/tokens.css';
import '@/styles/global.css';
import '@/styles/features.css';
import '@/styles/sakura-theme.css';
import '@/styles/components.css';
import '@/styles/ow-nav.css';
import '@/styles/browser-bar.css';
import '@/styles/foundations.css';
import Header from '@/components/Header';
import NavWheel from '@/components/NavWheel';
import Footer from '@/components/Footer';
import MagicEffects from '@/components/MagicEffects';
import MagicScrollEffects from '@/components/MagicScrollEffects';
import ReadMarkers from '@/components/ReadMarkers';
import BodySection from '@/components/BodySection';
import Analytics from '@/components/Analytics';
import PerformanceInsights from '@/components/PerformanceInsights';
import JsonLd from '@/components/JsonLd';
import OwnerTools, { OwnerProvider } from '@/components/OwnerTools';
import { siteConfig } from '@/config/site';
import { siteUrl } from '@/lib/site';
import { routing, type Locale } from '@/i18n/routing';

// 主题反闪烁：在首帧绘制前从 localStorage 恢复主题，避免浅色闪一下。
const themeScript = `(() => { try {
  const saved = localStorage.getItem('theme');
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[data-theme-color]')?.setAttribute('content', theme === 'dark' ? '#211a1d' : '#f8f2ef');
} catch {} })();`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  return {
    metadataBase: new URL(siteUrl('/')),
    title: siteConfig.name,
    description: siteConfig.description,
    icons: {
      icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
      shortcut: '/favicon.svg',
    },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      images: [{ url: '/images/brand/default-og.png', width: 1200, height: 630, alt: t('brand') }],
    },
    twitter: { card: 'summary_large_image', images: ['/images/brand/default-og.png'] },
    alternates: {
      types: { 'application/rss+xml': [{ url: '/rss.xml', title: siteConfig.name }] },
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <html lang={locale} data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f8f2ef" data-theme-color />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <NextIntlClientProvider messages={messages}>
          <BodySection />
          <a className="skip-link" href="#main-content">{t('skipToContent')}</a>
          <MagicEffects />
          <MagicScrollEffects />
          <OwnerProvider enabled={process.env.CONTENT_SOURCE === 'supabase'}><div className="page-shell">
            <NavWheel />
            <Header />
            {process.env.CONTENT_SOURCE === 'supabase' && <OwnerTools />}
            <main id="main-content" className="site-main">{children}</main>
            <Footer />
          </div></OwnerProvider>
          <ReadMarkers />
        </NextIntlClientProvider>
        <Analytics />
        {process.env.VERCEL === '1' && <PerformanceInsights />}
        <JsonLd type="website" />
      </body>
    </html>
  );
}
