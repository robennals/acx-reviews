import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const MIGRATIONS_DIR = path.join(process.cwd(), 'lib/db/migrations');

/**
 * Build a fresh in-memory libSQL database with the full schema applied via
 * the checked-in drizzle-kit migration files. Each call returns an isolated
 * DB; tests must not share instances.
 */
export async function createTestDb() {
  const client = createClient({ url: ':memory:' });

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    // drizzle migrations separate statements with a sentinel comment.
    const statements = sql.split(/--> statement-breakpoint\n?/);
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) await client.execute(trimmed);
    }
  }

  return drizzle(client, { schema });
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;
