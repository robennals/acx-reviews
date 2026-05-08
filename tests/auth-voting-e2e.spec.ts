import { test, expect, type Page } from '@playwright/test';

// End-to-end happy path covering: sign in -> rank a 2025 review -> see "#1"
// state -> /admin shows the voter's ballot. Uses the test-only bypass auth
// provider enabled in playwright.config.ts.

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

async function waitForSession(page: Page) {
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
}

/**
 * Rank the review currently visible on the page at #1 via the ranking popup.
 * Asserts the popup opens, then closes after the rank-at-#1 click.
 */
async function rankAtTopAndWait(page: Page) {
  // Make sure the session has hydrated client-side before clicking — otherwise
  // useSession() may still report 'loading' and the click opens the sign-in
  // dialog instead of the ranking popup.
  await waitForSession(page);
  const voteButton = page.getByRole('button', { name: /Vote for this review/i });
  await expect(voteButton).toBeVisible();
  await voteButton.click();

  // The popup is a Radix dialog; "Rank this review" is the title (first add).
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Rank this review|Edit ranking/)).toBeVisible();

  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/votes/ballot') && r.request().method() === 'PUT'
    ),
    // For an empty/short ballot the only slot is "Rank at #N (bottom of list)".
    dialog.getByRole('button', { name: /Rank at #\d+/ }).click(),
  ]);
  expect(resp.status()).toBe(200);
  // Popup closes after a successful rank.
  await expect(dialog).toBeHidden();
}

/**
 * Open the popup on a review that is already on the ballot, then click
 * "Remove from list".
 */
async function unrankAndWait(page: Page) {
  await waitForSession(page);
  const rankedButton = page.getByRole('button', { name: /^#\d+/ }).first();
  await expect(rankedButton).toBeVisible();
  await rankedButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Edit ranking/)).toBeVisible();

  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/votes/ballot') && r.request().method() === 'PUT'
    ),
    dialog.getByRole('button', { name: /Remove from list/i }).click(),
  ]);
  expect(resp.status()).toBe(200);
  await expect(dialog).toBeHidden();
}

test('signed-in admin can rank a review and see it reflected in the admin ballots view', async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();

  // Open the first 2025 non-book review.
  await page.goto('/?contest=2025-non-book-reviews');
  const firstCard = page.locator('article').first();
  const reviewTitle = (await firstCard.locator('h3').first().textContent())?.trim() ?? '';
  expect(reviewTitle.length).toBeGreaterThan(0);
  await firstCard.locator('h3').first().click();
  await page.waitForURL(/\/reviews\//);

  // Rank the review at #1 via the popup.
  await rankAtTopAndWait(page);
  await expect(page.getByRole('button', { name: /^#1/ })).toBeVisible();

  // Visit /admin: the ranked ballot for this voter should include this review.
  await page.goto('/admin?contest=2025-non-book-reviews');
  await expect(page.getByRole('heading', { name: /Admin · Ranked ballots/i })).toBeVisible();
  // 1 voter, our row.
  await expect(page.getByText(/^1 voters/i)).toBeVisible();
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toContainText(ADMIN_EMAIL);
  // The #1 cell holds the (clipped) title — assert the row links to the slug.
  await expect(firstRow.locator('td').nth(1).locator('a')).toBeVisible();

  // Unrank and verify the admin view drops to zero voters.
  await page.goto('/?contest=2025-non-book-reviews');
  await page.locator('article').first().locator('h3').first().click();
  await page.waitForURL(/\/reviews\//);
  await unrankAndWait(page);
  await expect(page.getByRole('button', { name: /Vote for this review/i })).toBeVisible();

  await page.goto('/admin?contest=2025-non-book-reviews');
  await expect(page.getByText(/^0 voters/i)).toBeVisible();
});

test('signed-in non-admin cannot reach /admin', async ({ page }) => {
  await signInAs(page, 'just-a-user@example.invalid');
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /Admin · Ranked ballots/i })).toHaveCount(0);
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

test('signing in with Gmail dot variants or +tag lands in the same account', async ({ page }) => {
  // A vote cast as "rob.ennals+x@gmail.com" should be visible when the same
  // person later signs in as "robennals@gmail.com" — both normalize to
  // "robennals@gmail.com" and hit the same users row.
  const variantA = 'rob.ennals+test@gmail.com';
  const variantB = 'robennals@gmail.com';

  await signInAs(page, variantA);
  await page.goto('/?contest=2025-non-book-reviews');
  const slug = await page.locator('a[href^="/reviews/"]').first().getAttribute('href');
  await page.goto(slug!);
  await rankAtTopAndWait(page);
  await expect(page.getByRole('button', { name: /^#1/ })).toBeVisible();

  // Re-sign-in as the canonical variant — this replaces the JWT cookie.
  // If normalization is correct, the server JWT carries the SAME user.id,
  // and the server-rendered initial-votes snapshot includes our vote.
  await signInAs(page, variantB);
  await page.goto(slug!);
  await expect(page.getByRole('button', { name: /^#1/ })).toBeVisible();
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

  await rankAtTopAndWait(page);
  await expect(page.getByRole('button', { name: /^#1/ })).toBeVisible();

  // Hard reload — local optimistic state is gone, the rank must come back from
  // the server-rendered initial-votes snapshot.
  await page.reload();
  await expect(page.getByRole('button', { name: /^#1/ })).toBeVisible();
});
