import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TEST_DB_PATH = path.join(process.cwd(), '.test', 'playwright.db');
const TEST_DB_URL = pathToFileURL(TEST_DB_PATH).toString();

export default defineConfig({
  testDir: './tests',
  // Tests run against a Turbopack dev server (next dev --turbopack). The dev
  // server is not parallel-safe under heavy load — it intermittently 500s
  // with ENOENT on .next/server/app-paths-manifest.json when several
  // workers compile different routes simultaneously. Run a single worker
  // so the server only ever serves one client at a time.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3011',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm tsx tests/init-test-db.ts && PORT=3011 pnpm dev',
    url: 'http://localhost:3011',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      // Point dev server at the isolated test DB built by global-setup.
      DATABASE_URL: TEST_DB_URL,
      TURSO_TOKEN: '',
      // Enable the test-only bypass provider in auth.ts.
      TEST_AUTH_BYPASS: '1',
      // Use a deterministic admin email for /admin assertions.
      ADMIN_EMAILS: 'playwright-admin@example.invalid',
      // Active voting period covering 2025 reviews.
      VOTING_CONTEST_YEAR: '2025',
      VOTING_CONTEST_TITLE: '2025 Non-Book Reviews',
      VOTING_START: '2026-01-01T00:00:00Z',
      VOTING_END: '2027-01-01T00:00:00Z',
      // Required by Auth.js v5.
      AUTH_SECRET: 'playwright-test-secret-not-for-production',
      NEXTAUTH_URL: 'http://localhost:3011',
      // Postmark isn't actually invoked by any e2e test (we use the bypass
      // provider) but env vars must be set or the PIN-request route 500s.
      POSTMARK_TOKEN: 'unused',
      POSTMARK_FROM: 'unused@example.invalid',
    },
  },
});
