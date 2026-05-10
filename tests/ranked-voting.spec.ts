import { test, expect, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import path from 'node:path';

// Tests for the ranked-voting flows: insert via popup, edit via popup,
// /votes page reorder + remove, and the below-cap "(won't count)" label.
//
// These tests use the test-only bypass auth provider (TEST_AUTH_BYPASS=1)
// configured in playwright.config.ts so each test gets a fresh signed-in
// session without going through Postmark.

/**
 * Sign in via the test-bypass Credentials provider, then return to /.
 * Mirrors the helper in auth-voting-e2e.spec.ts.
 */
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
  await page.goto('/');
  // Wait for client-side session hydration so vote buttons don't open the
  // sign-in dialog instead of the ranking popup.
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
}

/**
 * Read /reviews/<slug> URLs for every review file in the given contest dir.
 * Slugs are the filename stems (matching the frontmatter `slug` field).
 * Reading from disk in the test process keeps these tests deterministic and
 * avoids depending on home-page pagination/filter timing.
 */
function getReviewSlugUrls(contestId: string): string[] {
  const dir = path.join(process.cwd(), 'data', 'reviews', contestId);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => `/reviews/${f.slice(0, -3)}`)
    .sort();
}

/**
 * Wait for the client-side session to hydrate on whatever page we just
 * navigated to. The vote-button checks `useSession().status` and falls back
 * to the sign-in dialog when status !== 'authenticated', so any test that
 * navigates and then immediately clicks Vote needs this wait.
 */
async function waitForSession(page: Page) {
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
}

/**
 * Open the ranking popup on the current review page and click the trailing
 * "Rank at #N (bottom of list)" slot. Waits for the PUT /api/votes/ballot
 * response and the popup to close.
 */
async function rankAtBottom(page: Page) {
  await waitForSession(page);
  const voteButton = page.getByRole('button', { name: /Vote for this review/i });
  await expect(voteButton).toBeVisible();
  await voteButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Rank this review/)).toBeVisible();

  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/votes/ballot') && r.request().method() === 'PUT'
    ),
    dialog.getByRole('button', { name: /Rank at #\d+/ }).click(),
  ]);
  expect(resp.status()).toBe(200);
  await expect(dialog).toBeHidden();
}

test.describe('ranked voting', () => {
  test('insert flow — first vote ends up at #1', async ({ page }) => {
    await signInAs(page, 'insert-test@example.invalid');

    const slugs = getReviewSlugUrls('2025-non-book-reviews');
    expect(slugs.length).toBeGreaterThan(0);
    await page.goto(slugs[0]);
    await waitForSession(page);

    // Empty ballot → "Rank this review" header, only the trailing slot.
    const voteButton = page.getByRole('button', { name: /Vote for this review/i });
    await expect(voteButton).toBeVisible();
    await voteButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Rank this review')).toBeVisible();

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/votes/ballot') && r.request().method() === 'PUT'
      ),
      dialog.getByRole('button', { name: /Rank at #1/ }).click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(dialog).toBeHidden();

    // Block-variant button now reads "#1".
    await expect(page.getByRole('button', { name: /^#1$/ })).toBeVisible();

    // Reload — same state from server-rendered initial votes.
    await page.reload();
    await expect(page.getByRole('button', { name: /^#1$/ })).toBeVisible();
  });

  test('edit flow — move and remove', async ({ page }) => {
    await signInAs(page, 'edit-test@example.invalid');

    const slugs = getReviewSlugUrls('2025-non-book-reviews');
    expect(slugs.length).toBeGreaterThanOrEqual(3);
    const [slugA, slugB, slugC] = slugs;

    // Rank A, B, C in order — each via the popup's "Rank at #N (bottom)" slot.
    for (const slug of [slugA, slugB, slugC]) {
      await page.goto(slug);
      await rankAtBottom(page);
    }

    // The third review we ranked is currently at #3.
    await page.goto(slugC);
    await waitForSession(page);
    await expect(page.getByRole('button', { name: /^#3$/ })).toBeVisible();

    // Click vote → edit-mode popup.
    await page.getByRole('button', { name: /^#3$/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Edit ranking/)).toBeVisible();
    await expect(dialog.getByText(/Currently ranked · #3/)).toBeVisible();
    await expect(dialog.getByText(/This one/)).toBeVisible();

    // Move it to #1 by clicking the "place before" row currently at #1.
    // Other rows are <button> elements; the self-row is a <div>. The rank
    // badge is a <span> with the digit as its text. Find the button whose
    // descendant span has text "1".
    const placeBeforeFirst = dialog.locator('button:has(span:text-is("1"))').first();
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/votes/ballot') && r.request().method() === 'PUT'
      ),
      placeBeforeFirst.click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(dialog).toBeHidden();

    // Now slugC is at #1.
    await expect(page.getByRole('button', { name: /^#1$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^#3$/ })).toHaveCount(0);

    // Open the popup again and click "Remove from list".
    await page.getByRole('button', { name: /^#1$/ }).click();
    await expect(dialog).toBeVisible();
    const [removeResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/votes/ballot') && r.request().method() === 'PUT'
      ),
      dialog.getByRole('button', { name: /Remove from list/i }).click(),
    ]);
    expect(removeResp.status()).toBe(200);
    await expect(dialog).toBeHidden();

    // Block variant returns to "Vote for this review".
    await expect(page.getByRole('button', { name: /Vote for this review/i })).toBeVisible();
  });

  test('/votes page — X remove and persistence', async ({ page }) => {
    await signInAs(page, 'votes-page@example.invalid');

    const slugs = getReviewSlugUrls('2025-non-book-reviews');
    expect(slugs.length).toBeGreaterThanOrEqual(3);
    const [slugA, slugB, slugC] = slugs;

    for (const slug of [slugA, slugB, slugC]) {
      await page.goto(slug);
      await rankAtBottom(page);
    }

    await page.goto('/votes');
    await waitForSession(page);
    await expect(page.getByRole('heading', { name: /Your ballot/i })).toBeVisible();

    // The /votes page renders one row per ballot entry, each containing a
    // drag handle and a remove button. Find rows by remove buttons (which
    // carry an aria-label like "Remove <title>").
    const removeButtons = page.getByRole('button', { name: /^Remove / });
    await expect(removeButtons).toHaveCount(3);

    // Capture the initial slug order. /votes shows rows where the title link
    // is the only `/reviews/...` link in the row, so reading them in DOM
    // order yields the ballot order.
    const rowsBefore = await page
      .locator('a[href^="/reviews/"]')
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href')).filter(Boolean)
      );
    expect(rowsBefore.slice(0, 3)).toEqual([slugA, slugB, slugC]);

    // Click the X on the first row to remove it (most reliable @dnd-kit
    // interaction in synthetic tests). Drag-and-drop reorder is exercised
    // separately by unit tests on the ballot helpers.
    const allRemoves = page.getByRole('button', { name: /^Remove / });
    const [removeResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/votes/ballot') && r.request().method() === 'PUT'
      ),
      allRemoves.first().click(),
    ]);
    expect(removeResp.status()).toBe(200);

    // 2 rows remain, in the right order.
    await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(2);
    const rowsAfterRemove = await page
      .locator('a[href^="/reviews/"]')
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href')).filter(Boolean)
      );
    expect(rowsAfterRemove.slice(0, 2)).toEqual([slugB, slugC]);

    // Reload — server has the new order.
    await page.reload();
    await waitForSession(page);
    await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(2);
    const rowsReloaded = await page
      .locator('a[href^="/reviews/"]')
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href')).filter(Boolean)
      );
    expect(rowsReloaded.slice(0, 2)).toEqual([slugB, slugC]);
  });

  test("vote button shows '(won't count)' for ranks past #10", async ({ page }) => {
    // 11 sequential page-loads + clicks; bump the per-test timeout.
    test.setTimeout(120_000);
    await signInAs(page, 'overflow-test@example.invalid');

    const slugs = getReviewSlugUrls('2025-non-book-reviews');
    expect(slugs.length).toBeGreaterThanOrEqual(11);
    const eleven = slugs.slice(0, 11);

    // First rank 10 reviews via the popup's "Rank at #N (bottom)" slot. The
    // trailing slot is only shown while ballot.length < 10.
    for (let i = 0; i < 10; i++) {
      await page.goto(eleven[i]);
      await rankAtBottom(page);
    }

    // For the 11th review, the trailing slot is gone (ballot full). Open the
    // popup and click on the row currently at #10 — this inserts the new
    // review at #10 and pushes the previous #10 down to #11 (below cap).
    const tenthSlug = eleven[9];
    await page.goto(eleven[10]);
    await waitForSession(page);
    const voteButton = page.getByRole('button', { name: /Vote for this review/i });
    await expect(voteButton).toBeVisible();
    await voteButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Click the row currently at rank #10 — its rank badge has text "10".
    const rowAt10 = dialog.locator('button:has(span:text-is("10"))').first();
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/votes/ballot') && r.request().method() === 'PUT'
      ),
      rowAt10.click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(dialog).toBeHidden();

    // The new review (eleven[10]) is now at rank #10 (counted, no paren).
    await expect(page.getByRole('button', { name: /^#10$/ })).toBeVisible();

    // The previously #10 review (tenthSlug) was pushed to #11 — below cap.
    // Visit it and assert the button shows the won't-count parenthetical.
    await page.goto(tenthSlug);
    await waitForSession(page);
    await expect(
      page.getByRole('button', { name: /^#11 \(won't count\)$/ })
    ).toBeVisible();
  });
});
