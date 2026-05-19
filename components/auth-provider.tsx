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
  // refetchOnWindowFocus={false}: trade-off intentionally chosen. Auth is
  // JWT-based with no per-request DB lookup, so the only thing focus refetch
  // would catch is "user signed in/out in another tab" — accepted as stale
  // until next reload, in exchange for skipping a /api/auth/session round-
  // trip on every tab switch.
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
