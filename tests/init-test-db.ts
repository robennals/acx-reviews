import { mkdirSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';

const TEST_DIR = path.join(process.cwd(), '.test');
const DB_FILE = path.join(TEST_DIR, 'playwright.db');
const DB_URL = pathToFileURL(DB_FILE).toString();
const MIGRATIONS_DIR = path.join(process.cwd(), 'lib/db/migrations');

async function main() {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });

  const client = createClient({ url: DB_URL });

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = sql.split(/--> statement-breakpoint\n?/);
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) await client.execute(trimmed);
    }
  }

  client.close();
  console.log(`[init-test-db] Initialized ${DB_FILE}`);
}

main().catch((err) => {
  console.error('[init-test-db] Failed:', err);
  process.exit(1);
});
