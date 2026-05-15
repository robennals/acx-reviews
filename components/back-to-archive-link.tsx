'use client';

import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';

// The home page treats its query string as filter state (contest, tag, q,
// status, sort, page). When the user clicks through to a review we mirror
// that query string onto the article URL, so on mount we can copy it back
// onto "/" verbatim. Any non-filter params would be ignored by the home
// page parser, so a passthrough is safe.
interface Props {
  children: ReactNode;
  className?: string;
}

export function BackToArchiveLink({ children, className }: Props) {
  const [href, setHref] = useState('/');

  useEffect(() => {
    const search = window.location.search;
    setHref(search ? `/${search}` : '/');
  }, []);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
