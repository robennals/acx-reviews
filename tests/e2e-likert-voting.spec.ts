import { test, expect, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import path from 'node:path';

// Tests for the Likert rating flows: insert via the inline RatingCard,
// edit by clicking a different star, remove via the inline card's Remove
// button, and the home-page "voted" filter.
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
  // Wait for client-side session hydration so chip clicks don't open the
  // sign-in dialog instead of the rating popup.
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
 * navigated to. The chip/card components check `useSession().status` and
 * fall back to the sign-in dialog when status !== 'authenticated', so any
 * test that navigates and then immediately clicks Rate needs this wait.
 */
async function waitForSession(page: Page) {
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
}

/**
 * Click the star labeled `Rate N — Word` on the *first* RatingCard on the
 * page (the inline one at the top of the review page) and wait for the
 * PUT /api/votes/rating round-trip.
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

test.describe('Likert rating', () => {
  test('insert flow — first rating shows up and persists across reload', async ({ page }) => {
    await signInAs(page, 'insert-test@example.invalid');

    const slugs = getReviewSlugUrls('2025-non-book-reviews');
    expect(slugs.length).toBeGreaterThan(0);
    await page.goto(slugs[0]);
    await waitForSession(page);

    // Empty rating → "Rate this review" headline on both inline cards.
    await expect(page.getByText(/^Rate this review$/).first()).toBeVisible();

    await rateInline(page, 5);

    // Inline card headline flips to "Your rating".
    await expect(page.getByText(/^Your rating$/).first()).toBeVisible();
    // The bottom label echoes the committed value.
    await expect(page.getByText(/5 — Average/).first()).toBeVisible();

    // Reload — state must come back from the server-rendered initial
    // votes snapshot.
    await page.reload();
    await waitForSession(page);
    await expect(page.getByText(/^Your rating$/).first()).toBeVisible();
    await expect(page.getByText(/5 — Average/).first()).toBeVisible();
  });

  test('edit flow — change the rating, then remove it', async ({ page }) => {
    await signInAs(page, 'edit-test@example.invalid');

    const slugs = getReviewSlugUrls('2025-non-book-reviews');
    expect(slugs.length).toBeGreaterThan(0);
    await page.goto(slugs[0]);
    await waitForSession(page);

    // Rate 5 first.
    await rateInline(page, 5);
    await expect(page.getByText(/5 — Average/).first()).toBeVisible();

    // Now click star 8 to update the rating.
    await rateInline(page, 8);
    await expect(page.getByText(/8 — Very good/).first()).toBeVisible();
    await expect(page.getByText(/5 — Average/)).toHaveCount(0);

    // Click the "Remove" button inside the inline card. Move the mouse
    // away from the stars first so the hover-preview state clears and the
    // Remove button is rendered (it only shows when hover === null).
    await page.mouse.move(0, 0);
    const removeButton = page.getByRole('button', { name: /^Remove$/ }).first();
    await expect(removeButton).toBeVisible();
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/votes/rating') && r.request().method() === 'DELETE'
      ),
      removeButton.click(),
    ]);
    expect(resp.status()).toBe(200);

    // The inline card flips back to "Rate this review". Both cards
    // (top + bottom) share state, so both eventually show this headline.
    await expect(page.getByText(/^Rate this review$/)).toHaveCount(2);
  });

  test('filter flow — rating 3 reviews and visiting /?status=voted shows exactly 3 cards', async ({
    page,
  }) => {
    await signInAs(page, 'filter-test@example.invalid');

    const slugs = getReviewSlugUrls('2025-non-book-reviews');
    expect(slugs.length).toBeGreaterThanOrEqual(3);
    const [slugA, slugB, slugC] = slugs;

    for (const slug of [slugA, slugB, slugC]) {
      await page.goto(slug);
      await waitForSession(page);
      await rateInline(page, 7);
      // Confirm the rating committed before moving to the next review.
      await expect(page.getByText(/^Your rating$/).first()).toBeVisible();
    }

    // Navigate via the URL the banner's My-ratings link would use.
    await page.goto('/?status=voted&year=2025');
    await waitForSession(page);
    // Exactly 3 review cards visible.
    await expect(page.locator('article')).toHaveCount(3);
    // Each card's chip shows the committed "7 — Good" label.
    await expect(
      page.getByRole('button', { name: /^Your rating: 7 — Good$/ })
    ).toHaveCount(3);
  });

  test('rating chip on the home page card opens the popup and rates without navigating', async ({
    page,
  }) => {
    await signInAs(page, 'chip-popup@example.invalid');

    await page.goto('/?year=2025');
    await waitForSession(page);

    // Click the unrated chip on the first card → popup opens.
    // (The card itself is wrapped in a <Link>, so the <a> is the outer
    // element — we don't need to scope to the card to assert non-navigation.)
    const firstCard = page.locator('article').first();
    const chip = firstCard.getByRole('button', { name: /^Rate this review$/i });
    await expect(chip).toBeVisible();
    const urlBefore = page.url();
    await chip.click();
    expect(page.url()).toBe(urlBefore);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Click star 3 inside the popup.
    const star = dialog.getByRole('button', { name: /^Rate 3 — Poor$/i });
    await expect(star).toBeVisible();
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/votes/rating') && r.request().method() === 'PUT'
      ),
      star.click(),
    ]);
    expect(resp.status()).toBe(200);

    // Popup auto-closes after a successful commit.
    await expect(dialog).toBeHidden();

    // The chip on the card now reflects the committed rating.
    await expect(
      firstCard.getByRole('button', { name: /^Your rating: 3 — Poor$/ })
    ).toBeVisible();
  });
});
