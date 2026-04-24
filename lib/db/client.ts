import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export class DbNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set — DB-backed features are disabled');
    this.name = 'DbNotConfiguredError';
  }
}

const url = process.env.DATABASE_URL;
const _real = url
  ? drizzle(createClient({ url, authToken: process.env.TURSO_TOKEN }), { schema })
  : null;

/**
 * True iff the DB is wired. When false, `db` is a Proxy that throws
 * DbNotConfiguredError on any method access — safe to import, unsafe to use.
 * Callers that should degrade gracefully must check this flag first.
 */
export const isDbConfigured = _real !== null;

export const db = (_real ??
  new Proxy({} as Record<string, unknown>, {
    get() {
      throw new DbNotConfiguredError();
    },
  })) as NonNullable<typeof _real>;

export type DB = NonNullable<typeof _real>;
