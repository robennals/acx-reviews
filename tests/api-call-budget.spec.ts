import { test, expect, type Page } from '@playwright/test';

// Regression test for excessive client→server chatter on page reload.
// Before this was fixed: both ReadingProgressProvider and FavoritesProvider
// independently called /api/sync, and SessionProvider always made a
// /api/auth/session round-trip on mount because it wasn't hydrated with the
// server-side session. After the fix, a logged-in reload should make:
//   - exactly 1 /api/sync call (deduped via fetchSyncOnce)
//   - 0 /api/auth/session calls (SessionProvider hydrated from auth())
//
// Tests run in dev mode (next dev), so React strict mode is active and runs
// effects twice. The dedup helper must hold up under that too.

async function signInAs(page: Page, email: string) {
  const csrf = await page.request.get('/api/auth/csrf').then((r) => r.json());
  const r = await page.request.post('/api/auth/callback/test-bypass', {
    form: {
      email,
      csrfToken: csrf.csrfToken,
      callbackUrl: '/',
      json: 'true',
    },
  });
  if (!r.ok()) throw new Error(`sign-in failed: ${r.status()} ${await r.text()}`);
}

function countMatching(urls: string[], pattern: RegExp): number {
  return urls.filter((u) => pattern.test(u)).length;
}

/**
 * Capture every /api/* request fired while running `action`. Waits for the
 * page to be fully idle on both sides of the action so we don't include
 * leftover in-flight requests from a previous navigation.
 */
async function captureApiCalls(page: Page, action: () => Promise<void>): Promise<string[]> {
  // Make sure nothing is still in flight before we start listening.
  await page.waitForLoadState('networkidle');
  const urls: string[] = [];
  const handler = (req: import('@playwright/test').Request) => {
    const url = req.url();
    if (url.includes('/api/')) urls.push(url);
  };
  page.on('request', handler);
  try {
    await action();
    // Let post-load effects settle (covers strict-mode double-fire).
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  } finally {
    page.off('request', handler);
  }
  return urls;
}

test('signed-in reload of home page makes exactly one /api/sync and no /api/auth/session', async ({
  page,
}) => {
  await signInAs(page, 'api-budget-home@example.invalid');
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();

  const urls = await captureApiCalls(page, async () => {
    await page.reload();
    await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
  });

  const syncCount = countMatching(urls, /\/api\/sync(\?|$)/);
  const sessionCount = countMatching(urls, /\/api\/auth\/session(\?|$)/);

  // Exact counts — a 0 here would mean the dedup is dropping a legitimate
  // fetch (regression in initial pull); a 2 means the dedup broke.
  expect(syncCount, `expected exactly 1 /api/sync, saw: ${urls.join(', ')}`).toBe(1);
  expect(sessionCount, `expected 0 /api/auth/session, saw: ${urls.join(', ')}`).toBe(0);
});

test('signed-in reload of a review page makes exactly one /api/sync and no /api/auth/session (dev path)', async ({
  page,
}) => {
  // NOTE: this test runs under `next dev`, which serves every route
  // dynamically — so the layout's auth() call resolves and the session
  // is hydrated into SessionProvider. In a production build, /reviews/[slug]
  // is statically prerendered: auth() throws at build time, the layout
  // passes session=undefined to AuthProvider, and SessionProvider fetches
  // /api/auth/session once on mount. That production codepath is NOT
  // exercised here. Worth adding a prod-mode Playwright project later if
  // we want to assert that exact budget end-to-end.
  await signInAs(page, 'api-budget-review@example.invalid');
  await page.goto('/');
  const slugHref = await page
    .locator('a[href^="/reviews/"]')
    .first()
    .getAttribute('href');
  expect(slugHref).toBeTruthy();
  await page.goto(slugHref!);
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();

  const urls = await captureApiCalls(page, async () => {
    await page.reload();
    await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
  });

  const syncCount = countMatching(urls, /\/api\/sync(\?|$)/);
  const sessionCount = countMatching(urls, /\/api\/auth\/session(\?|$)/);

  expect(syncCount, `expected exactly 1 /api/sync, saw: ${urls.join(', ')}`).toBe(1);
  expect(sessionCount, `expected 0 /api/auth/session, saw: ${urls.join(', ')}`).toBe(0);
});

test('signed-out reload makes no /api/sync and no /api/auth/session', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Sign in$/ })).toBeVisible();

  const urls = await captureApiCalls(page, async () => {
    await page.reload();
    await expect(page.getByRole('button', { name: /^Sign in$/ })).toBeVisible();
  });

  const syncCount = countMatching(urls, /\/api\/sync(\?|$)/);
  const sessionCount = countMatching(urls, /\/api\/auth\/session(\?|$)/);

  // Signed-out users shouldn't hit /api/sync at all — both contexts gate on
  // isAuthed before fetching.
  expect(syncCount).toBe(0);
  // SessionProvider hydrated with null session means no client-side fetch.
  expect(sessionCount).toBe(0);
});
