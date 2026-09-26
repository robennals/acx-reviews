'use client';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

/** Applicant document URLs must not enter analytics through page_location. */
export function SiteAnalytics() {
  const pathname = usePathname();
  if (pathname === '/preview' || pathname.startsWith('/preview/')) return null;
  return <>
    <Script src="https://www.googletagmanager.com/gtag/js?id=G-MW01Z50CB3" strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-MW01Z50CB3');
    `}</Script>
  </>;
}
