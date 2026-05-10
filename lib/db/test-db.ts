import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const MIGRATIONS_DIR = path.join(process.cwd(), 'lib/db/migrations');

/**
 * Build a fresh libSQL database with the full schema applied via the
 * checked-in drizzle-kit migration files. Each call returns an isolated
 * DB backed by its own tmpfs file (not `:memory:`, which can't share state
 * across the connections that `db.transaction()` opens internally). Tests
 * must not share instances.
 *
 * The temp file is auto-removed on process exit; node:test runs each file
 * in its own process so cleanup is bounded.
 */
export async function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'acx-testdb-'));
  const file = path.join(dir, `${randomUUID()}.db`);
  const client = createClient({ url: `file:${file}` });
  process.on('exit', () => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

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
