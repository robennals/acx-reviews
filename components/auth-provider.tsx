'use client';

import { SessionContext, SessionProvider, type SessionContextValue } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { ReactNode } from 'react';

const signedOut: SessionContextValue = {
  data: null,
  status: 'unauthenticated',
  update: async () => null,
};

export function AuthProvider({ children, enabled, session }: {
  children: ReactNode;
  enabled: boolean;
  session: Session | null;
}) {
  // Keep useSession consumers working without mounting SessionProvider's
  // mount/focus/broadcast fetch effects when the auth endpoints are disabled.
  if (!enabled) return <SessionContext.Provider value={signedOut}>{children}</SessionContext.Provider>;
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
