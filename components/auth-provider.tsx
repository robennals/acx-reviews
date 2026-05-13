'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { ReactNode } from 'react';

export function AuthProvider({
  children,
  session,
}: {
  children: ReactNode;
  // Server-side session from auth(). Pass it (incl. null) to let
  // SessionProvider hydrate without a /api/auth/session round-trip. Pass
  // `undefined` for statically-prerendered routes where auth() couldn't run —
  // SessionProvider will then fetch on mount to determine the real state.
  session: Session | null | undefined;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
