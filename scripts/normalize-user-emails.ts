/**
 * One-time migration: canonicalize every users.email row and merge any
 * duplicates that collapse under the new normalization rules (Gmail dot
 * stripping, +tag stripping, lowercasing).
 *
 * Usage:
 *   pnpm tsx scripts/normalize-user-emails.ts
 *
 * Reads DATABASE_URL and TURSO_TOKEN from .env.local. Safe to re-run: a
 * second invocation is a no-op.
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

async function main() {
  // Dynamic imports so dotenv runs before lib/db/client.ts evaluates env.
  const { db } = await import('@/lib/db/client');
  const { normalizeUserEmails } = await import('@/lib/api/normalize-users-migration');

  const report = await normalizeUserEmails(db);
  console.log(JSON.stringify(report, null, 2));
  console.log(
    `\nScanned ${report.scanned} users; renamed ${report.renamed}; merged ${report.merged}; deleted ${report.deletedUsers} duplicate row(s).`
  );
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
