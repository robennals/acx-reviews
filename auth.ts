import NextAuth, { type NextAuthConfig, type Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db, isDbConfigured } from '@/lib/db/client';
import { users, accounts, verificationTokens } from '@/lib/db/schema';
import { makeDbPinStore } from '@/lib/auth/pin-store-db';
import { verifyPin, normalizeEmail } from '@/lib/auth/pin';

/**
 * Auth is "configured" iff both AUTH_SECRET and DATABASE_URL are set. When
 * either is missing the site renders as if no one is signed in and the auth
 * UI hides itself — articles still load.
 */
export const isAuthConfigured = isDbConfigured && !!process.env.AUTH_SECRET;

async function findOrCreateUserByEmail(email: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    if (!existing[0].emailVerified) {
      await db
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.id, existing[0].id));
    }
    return { id: existing[0].id, email: existing[0].email, name: existing[0].name ?? null };
  }
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, email, emailVerified: new Date() });
  return { id, email, name: null };
}

const providers: NextAuthConfig['providers'] = [
  // allowDangerousEmailAccountLinking: when a user who originally signed up
  // with the email-PIN provider later signs in with Google, link both to
  // the same user record by matching email. Safe here because the PIN flow
  // only ever marks a user verified by email, and Google verifies email
  // for us — both sides agree the bearer owns the address.
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
    // Normalize the email returned by Google the same way normalizeEmail()
    // normalizes it on the PIN side. Without this, a Google Workspace user
    // whose email casing differs would create a second account with a
    // distinct row in `users`, defeating the same-email-same-account
    // invariant. Gmail emails are always lowercase in practice, but don't
    // rely on that.
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: normalizeEmail(profile.email ?? ''),
        image: profile.picture,
      };
    },
  }),
  Credentials({
    id: 'pin',
    name: 'Email PIN',
    credentials: {
      email: { label: 'Email', type: 'email' },
      pin: { label: 'PIN', type: 'text' },
    },
    authorize: async (raw) => {
      const secret = process.env.AUTH_SECRET;
      if (!secret) throw new Error('AUTH_SECRET not set');
      const email = normalizeEmail(String(raw?.email ?? ''));
      const pin = String(raw?.pin ?? '');
      const result = await verifyPin(makeDbPinStore(db), { email, pin, secret });
      if (!result.ok) return null;
      return findOrCreateUserByEmail(email);
    },
  }),
];

// Test-only bypass provider. Active only when explicitly opted in via env
// AND we're not in a production build. Lets Playwright sign in as any email
// without going through Google or Postmark. NEVER reachable in prod builds.
if (
  process.env.TEST_AUTH_BYPASS === '1' &&
  process.env.NODE_ENV !== 'production'
) {
  providers.push(
    Credentials({
      id: 'test-bypass',
      name: 'Test bypass',
      credentials: { email: { label: 'Email', type: 'email' } },
      authorize: async (raw) => {
        const email = normalizeEmail(String(raw?.email ?? ''));
        if (!email.includes('@')) return null;
        return findOrCreateUserByEmail(email);
      },
    })
  );
}

type AuthExports = {
  handlers: { GET: (req: Request) => Promise<Response>; POST: (req: Request) => Promise<Response> };
  signIn: (...args: unknown[]) => Promise<unknown>;
  signOut: (...args: unknown[]) => Promise<unknown>;
  auth: () => Promise<Session | null>;
};

let _exports: AuthExports;

if (isAuthConfigured) {
  const adapter = DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  });

  _exports = NextAuth({
    adapter,
    session: { strategy: 'jwt' },
    trustHost: true,
    providers,
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.uid = user.id;
          token.email = user.email;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user && token.uid) {
          (session.user as { id?: string }).id = token.uid as string;
        }
        return session;
      },
    },
  }) as unknown as AuthExports;
} else {
  // Stub exports so the rest of the app can import these names without
  // crashing at module load when AUTH_SECRET / DATABASE_URL is absent.
  const notConfigured = () =>
    new Response('Authentication is not configured on this deployment.', { status: 503 });
  _exports = {
    handlers: {
      GET: async () => notConfigured(),
      POST: async () => notConfigured(),
    },
    signIn: async () => {
      throw new Error('Auth not configured');
    },
    signOut: async () => {
      throw new Error('Auth not configured');
    },
    auth: async () => null,
  };
}

export const { handlers, signIn, signOut, auth } = _exports;
