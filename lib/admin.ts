import { normalizeEmail } from './auth/pin';

/**
 * Parse the ADMIN_EMAILS env var into a canonicalized set. Each entry is
 * run through normalizeEmail so "Rob.Ennals@Gmail.com" and
 * "robennals@gmail.com" both end up as the same canonical string — this
 * must match how auth.ts stores user emails, or the admin check will
 * silently fail when the user signs in.
 */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => normalizeEmail(s))
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined, raw?: string): boolean {
  if (!email) return false;
  const set = parseAdminEmails(raw ?? process.env.ADMIN_EMAILS);
  return set.has(normalizeEmail(email));
}
