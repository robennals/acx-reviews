import { test, expect, type Page } from '@playwright/test';

// End-to-end happy path covering: sign in -> rate a 2025 review via the
// inline star widget -> see the chip reflect the rating -> /admin shows
// the voter row with the rating chip. Uses the test-only bypass auth
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
 * Click the star labeled `Rate N — Word` on the *inline* RatingCard at the
 * top of a review page (the first one in DOM order). Waits for the
 * `PUT /api/votes/rating` round-trip to land.
 */
async function rateInline(page: Page, n: number) {
  await waitForSession(page);
  const star = page.getByRole('button', { name: new RegExp(`^Rate ${n} — `, 'i') }).first();
  await expect(star).toBeVisible();
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/votes/rating') && r.request().method() === 'PUT'
    ),
    star.click(),
  ]);
  expect(resp.status()).toBe(200);
}

test('signed-in admin can rate a review and see it reflected in /admin', async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  await waitForSession(page);

  // Open the first 2025 non-book review by clicking the title.
  await page.goto('/?year=2025');
  const firstCard = page.locator('article').first();
  const reviewTitle = (await firstCard.locator('h3').first().textContent())?.trim() ?? '';
  expect(reviewTitle.length).toBeGreaterThan(0);
  await firstCard.locator('h3').first().click();
  await page.waitForURL(/\/reviews\//);

  // Rate via the inline card (star 8 = "Very good").
  await rateInline(page, 8);

  // The card's headline flips from "Rate this review" to "Your rating".
  await expect(page.getByText(/^Your rating$/).first()).toBeVisible();

  // Visit /admin: the row for this voter should include a rating chip
  // with the rating value (8) and the (clipped) review title. Other test
  // workers running in parallel populate additional voter rows in the
  // same DB, so we don't assert exact-1; we just find our admin's row.
  await page.goto('/admin?contest=2025-non-book-reviews');
  await expect(page.getByRole('heading', { name: /Admin · Ratings/i })).toBeVisible();
  const voterRow = page.locator('div').filter({ hasText: ADMIN_EMAIL }).first();
  await expect(voterRow).toBeVisible();
  // The chip's badge contains the rating value as plain text "8".
  await expect(voterRow.getByText('8', { exact: true }).first()).toBeVisible();
  // And the clipped title appears in the chip.
  const titleClip = reviewTitle.length <= 22 ? reviewTitle : reviewTitle.slice(0, 21) + '…';
  await expect(voterRow).toContainText(titleClip);
});

test('signed-in non-admin cannot reach /admin', async ({ page }) => {
  await signInAs(page, 'just-a-user@example.invalid');
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /Admin · Ratings/i })).toHaveCount(0);
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
  // A rating cast as "rob.ennals+x@gmail.com" should be visible when the
  // same person later signs in as "robennals@gmail.com" — both normalize
  // to "robennals@gmail.com" and hit the same users row.
  const variantA = 'rob.ennals+test@gmail.com';
  const variantB = 'robennals@gmail.com';

  await signInAs(page, variantA);
  await page.goto('/?year=2025');
  const slug = await page.locator('a[href^="/reviews/"]').first().getAttribute('href');
  await page.goto(slug!);
  await rateInline(page, 7);
  // Chip on the back-to-archive page should show "7 — Good".
  await page.goto('/?year=2025');
  await waitForSession(page);
  // Find the chip for this review on the card listing. We don't know which
  // card it is, so just check that *some* chip on the page shows the rating.
  await expect(
    page.getByRole('button', { name: /^Your rating: 7 — Good$/ }).first()
  ).toBeVisible();

  // Re-sign-in as the canonical variant — this replaces the JWT cookie.
  // If normalization is correct, the server JWT carries the SAME user.id,
  // and the server-rendered initial-votes snapshot includes our rating.
  await signInAs(page, variantB);
  await page.goto(slug!);
  await waitForSession(page);
  // The inline card now reads "Your rating" instead of "Rate this review".
  await expect(page.getByText(/^Your rating$/).first()).toBeVisible();
});

test('rating persists across reload (server state, not just localStorage)', async ({ page }) => {
  await signInAs(page, 'reload-test@example.invalid');

  // Navigate to a specific 2025 review by URL so we don't depend on click
  // ordering or filter timing.
  await page.goto('/?year=2025');
  const slugLink = await page
    .locator('a[href^="/reviews/"]')
    .first()
    .getAttribute('href');
  expect(slugLink).toMatch(/^\/reviews\//);
  await page.goto(slugLink!);

  await rateInline(page, 9);
  await expect(page.getByText(/^Your rating$/).first()).toBeVisible();

  // Hard reload — local optimistic state is gone, the rating must come back
  // from the server-rendered initial-votes snapshot.
  await page.reload();
  await expect(page.getByText(/^Your rating$/).first()).toBeVisible();
  // Star 9 is the persisted value — the bottom label echoes "9 — Excellent".
  await expect(page.getByText(/9 — Excellent/).first()).toBeVisible();
});

test("voting banner's 'My ratings' link goes to /votes and shows the rating", async ({
  page,
}) => {
  await signInAs(page, 'banner-link@example.invalid');

  // Rate a review so the banner shows the My-ratings link (only visible
  // when the user has at least one rating).
  await page.goto('/?year=2025');
  const slugLink = await page
    .locator('a[href^="/reviews/"]')
    .first()
    .getAttribute('href');
  // The href on the home card includes an archive query suffix
  // (?year=2025…); strip both the prefix and the query to get the bare slug
  // for matching the link rendered on /votes (which has no query).
  const slug = slugLink!.replace(/^\/reviews\//, '').split('?')[0];
  await page.goto(slugLink!);
  await rateInline(page, 6);

  // Back to home — the banner should now show "My ratings (1)".
  await page.goto('/');
  await waitForSession(page);
  const myRatings = page.getByRole('link', { name: /^My ratings \(1\)$/ });
  await expect(myRatings).toBeVisible();
  await myRatings.click();

  // Lands on /votes with the page heading and a single rated row.
  await page.waitForURL(/\/votes$/);
  await expect(page.getByRole('heading', { name: /^Your ratings/ })).toBeVisible();
  // The rated review's slug appears as a link in the row.
  await expect(page.locator(`a[href="/reviews/${slug}"]`)).toBeVisible();
  // The chip on the row reflects the rating.
  await expect(
    page.getByRole('button', { name: /^Your rating: 6 — Above average$/ }).first()
  ).toBeVisible();
});
