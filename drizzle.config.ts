import { defineConfig } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_TOKEN;

if (!url) {
  throw new Error('DATABASE_URL is required (set in .env.local)');
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken,
  },
});
