import { test, expect } from '@playwright/test';

// These tests boot a *separate* dev server with critical env vars stripped,
// to verify the article-reading experience survives missing auth/db config.
// Uses Playwright's per-spec webServer override is not supported, so we
// instead spawn a child server inside the test via a script.
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 3099;
const BASE = `http://localhost:${PORT}`;

let server: ChildProcess | undefined;

async function waitForReady(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  throw new Error(`server didn't become ready on ${BASE}`);
}

test.describe.configure({ mode: 'serial' });

test.describe('Graceful degradation when auth/db are missing', () => {
  test.beforeAll(async () => {
    // Spawn a server with NO database-related env vars at all. This is the
    // worst-case "broken deploy" scenario.
    server = spawn(
      'pnpm',
      ['next', 'dev', '-p', String(PORT)],
      {
        env: {
          ...process.env,
          // Strip auth + DB so the layout has to handle absence.
          DATABASE_URL: '',
          TURSO_TOKEN: '',
          AUTH_SECRET: '',
          GOOGLE_CLIENT_ID: '',
          GOOGLE_CLIENT_SECRET: '',
          POSTMARK_TOKEN: '',
          POSTMARK_FROM: '',
          ADMIN_EMAILS: '',
          NEXTAUTH_URL: '',
          VOTING_CONTEST_YEAR: '',
          VOTING_CONTEST_TITLE: '',
          VOTING_START: '',
          VOTING_END: '',
          TEST_AUTH_BYPASS: '',
        },
        stdio: 'pipe',
      }
    );
    await waitForReady();
  });

  test.afterAll(async () => {
    server?.kill('SIGTERM');
    await sleep(300);
  });

  test('home page renders when DATABASE_URL and AUTH_SECRET are missing', async ({ page }) => {
    const res = await page.goto(BASE);
    expect(res?.status()).toBe(200);
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('a review article renders when DATABASE_URL and AUTH_SECRET are missing', async ({ page }) => {
    await page.goto(BASE);
    const href = await page.locator('a[href^="/reviews/"]').first().getAttribute('href');
    const res = await page.goto(`${BASE}${href}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('the sign-in button does not appear when auth is not configured', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole('button', { name: /Sign in/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Account menu/i })).toHaveCount(0);
  });

  test('the voting banner does not appear when voting env is unset', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText(/Voting is open/i)).toHaveCount(0);
  });

  test('/admin redirects rather than crashes when auth is missing', async ({ page }) => {
    const res = await page.goto(`${BASE}/admin`);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /Admin · Vote tally/i })).toHaveCount(0);
  });

  test('auth API returns 503, not 500, when not configured', async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/session`);
    expect(res.status()).toBe(503);
  });
});
