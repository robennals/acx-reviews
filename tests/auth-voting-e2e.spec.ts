import { test, expect, type Page } from '@playwright/test';

// End-to-end happy path covering: sign in -> vote on a 2025 review ->
// see "Voted" state -> /admin shows the vote count. Uses the test-only
// bypass auth provider enabled in playwright.config.ts.

const ADMIN_EMAIL = 'playwright-admin@example.invalid';

/**
 * Sign in via the test-bypass Credentials provider, then return to /.
 * Auth.js v5 requires a CSRF token round-trip even for credentials sign-in.
 * The session cookie is set on the page's storage context.
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
}

async function voteAndWait(page: Page) {
  // Make sure the session has hydrated client-side before clicking — otherwise
  // useSession() may still report 'loading' and the click opens the sign-in
  // dialog instead of toggling.
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
  const voteButton = page.getByRole('button', { name: /Vote for this review/i });
  await expect(voteButton).toBeVisible();
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/votes/toggle') && r.request().method() === 'POST'
    ),
    voteButton.click(),
  ]);
  expect(resp.status()).toBe(200);
}

async function unvoteAndWait(page: Page) {
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
  const votedButton = page.getByRole('button', { name: /^Voted$/ });
  await expect(votedButton).toBeVisible();
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/votes/toggle') && r.request().method() === 'POST'
    ),
    votedButton.click(),
  ]);
  expect(resp.status()).toBe(200);
}

test('signed-in admin can vote and see it reflected in the admin tally', async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();

  // Open the first 2025 non-book review.
  await page.goto('/?contest=2025-non-book-reviews');
  const firstCard = page.locator('article').first();
  const reviewTitle = (await firstCard.locator('h3').first().textContent())?.trim() ?? '';
  expect(reviewTitle.length).toBeGreaterThan(0);
  await firstCard.locator('h3').first().click();
  await page.waitForURL(/\/reviews\//);

  // Click vote and wait for the server toggle to settle.
  await voteAndWait(page);
  await expect(page.getByRole('button', { name: /^Voted$/ })).toBeVisible();

  // Visit /admin: with one vote in the system, our review is rank #1.
  await page.goto('/admin?contest=2025-non-book-reviews');
  await expect(page.getByRole('heading', { name: /Admin · Vote tally/i })).toBeVisible();
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toContainText(reviewTitle);
  await expect(firstRow.locator('td').last()).toHaveText('1');
  await expect(page.getByText(/1 vote across/)).toBeVisible();

  // Unvote and verify the tally drops back to zero votes.
  await page.goto('/?contest=2025-non-book-reviews');
  await page.locator('article').first().locator('h3').first().click();
  await page.waitForURL(/\/reviews\//);
  await unvoteAndWait(page);
  await expect(page.getByRole('button', { name: /Vote for this review/i })).toBeVisible();

  await page.goto('/admin?contest=2025-non-book-reviews');
  await expect(page.getByText(/0 votes across/)).toBeVisible();
});

test('signed-in non-admin cannot reach /admin', async ({ page }) => {
  await signInAs(page, 'just-a-user@example.invalid');
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /Admin · Vote tally/i })).toHaveCount(0);
});

test('admin link in user menu is visible only for admin users', async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  await page.goto('/');
  await page.getByRole('button', { name: /Account menu/i }).click();
  await expect(page.getByRole('link', { name: /^Admin$/ })).toBeVisible();
});

test('admin link in user menu is hidden for non-admin users', async ({ page }) => {
  await signInAs(page, 'just-a-user@example.invalid');
  await page.goto('/');
  await page.getByRole('button', { name: /Account menu/i }).click();
  await expect(page.getByRole('link', { name: /^Admin$/ })).toHaveCount(0);
});

test('voting persists across reload (server state, not just localStorage)', async ({ page }) => {
  await signInAs(page, 'reload-test@example.invalid');

  // Navigate to a specific 2025 review by URL so we don't depend on click
  // ordering or filter timing.
  await page.goto('/?contest=2025-non-book-reviews');
  const slugLink = await page
    .locator('a[href^="/reviews/"]')
    .first()
    .getAttribute('href');
  expect(slugLink).toMatch(/^\/reviews\//);
  await page.goto(slugLink!);

  await voteAndWait(page);
  await expect(page.getByRole('button', { name: /^Voted$/ })).toBeVisible();

  // Hard reload — local optimistic state is gone, the "Voted" pill must
  // come back from the server-rendered initial-votes snapshot.
  await page.reload();
  await expect(page.getByRole('button', { name: /^Voted$/ })).toBeVisible();
});
