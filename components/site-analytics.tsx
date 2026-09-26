'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

/** Applicant document URLs must not enter analytics through page_location. */
export function SiteAnalytics() {
  const pathname = usePathname();
  const isPreview = pathname === '/preview' || pathname.startsWith('/preview/');
  // Keep the entire document lifetime private, including SPA navigation away
  // and browser Back. Unmounting Script cannot remove GA's history listeners.
  // Entry into preview must stay a full document navigation (the GET form),
  // not a client-side Link from a page where analytics is already initialized.
  const [startedOnPreview] = useState(isPreview);
  if (startedOnPreview || isPreview) return null;
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
