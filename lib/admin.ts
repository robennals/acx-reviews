export function parseAdminEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined, raw?: string): boolean {
  if (!email) return false;
  const set = parseAdminEmails(raw ?? process.env.ADMIN_EMAILS);
  return set.has(email.trim().toLowerCase());
}
