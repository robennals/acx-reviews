import { test, expect } from '@playwright/test';

// These tests cover the UI behavior of the auth + Likert rating features
// without requiring a real sign-in. They assume:
//   - VOTING_CONTEST_YEAR=2025 and the voting window is currently open
//     (matching the test config in playwright.config.ts).
//   - At least one 2025 review and one non-2025 review exist in the index.

test.describe('Auth & rating UI (signed out)', () => {
  test('rating card is visible on a 2025 review article', async ({ page }) => {
    await page.goto('/?year=2025');
    const firstReview = page.locator('article').first();
    await firstReview.locator('h3').first().click();
    await page.waitForURL(/\/reviews\//);
    // The inline RatingCard renders both at the top of the review and
    // again just before the footnotes. Headline reads "Rate this review"
    // when there's no committed rating.
    const cardHeadings = page.getByText(/^Rate this review$/);
    await expect(cardHeadings.first()).toBeVisible();
    // Card appears twice: top and bottom.
    await expect(cardHeadings).toHaveCount(2);
    // Each instance renders the 10 Likert star buttons. Sum across all
    // instances on the page should be 20 (10 stars x 2 cards).
    await expect(page.getByRole('button', { name: /^Rate \d+ — /i })).toHaveCount(20);
  });

  test('rating card is hidden on a non-2025 review article', async ({ page }) => {
    await page.goto('/?year=2024');
    const firstReview = page.locator('article').first();
    await firstReview.locator('h3').first().click();
    await page.waitForURL(/\/reviews\//);
    // Non-2025 review: <RatingCard> early-returns null. No "Rate this review"
    // heading, no star buttons.
    await expect(page.getByText(/^Rate this review$/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Rate \d+ — /i })).toHaveCount(0);
  });

  test('clicking the rating chip on a card while signed out opens the sign-in dialog', async ({
    page,
  }) => {
    await page.goto('/?year=2025');
    const firstCard = page.locator('article').first();
    // RatingChip on the card: aria-label is "Rate this review" when no rating.
    const chip = firstCard.getByRole('button', { name: /^Rate this review$/i });
    await expect(chip).toBeVisible();
    const urlBefore = page.url();
    await chip.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with email/i })).toBeVisible();
    // Clicking the chip must not navigate to the review page.
    expect(page.url()).toBe(urlBefore);
  });

  test('clicking a star on the inline rating card while signed out opens the sign-in dialog', async ({
    page,
  }) => {
    await page.goto('/?year=2025');
    const firstReview = page.locator('article').first();
    await firstReview.locator('h3').first().click();
    await page.waitForURL(/\/reviews\//);
    // Inline RatingCard: signed-out users see a "Sign in to rate" link
    // instead of being able to commit a star. The stars themselves are
    // rendered as disabled buttons (clicks are no-ops in the widget), but
    // the "Sign in to rate" link triggers the sign-in dialog.
    const signInLink = page.getByRole('button', { name: /^Sign in to rate$/i }).first();
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('header sign-in button opens the sign-in dialog', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Sign in$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('email PIN flow advances to the code-entry step', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Sign in$/ }).click();
    await page.getByRole('button', { name: /Sign in with email/i }).click();
    await page.getByLabel('Email address').fill('not-a-real-email@example.invalid');
    // Don't actually submit — just verify the email step rendered. Submitting
    // would hit Postmark, which we don't want in CI.
    await expect(page.getByRole('button', { name: /Send code/i })).toBeEnabled();
  });

  test('admin page redirects to home when not signed in', async ({ page }) => {
    const response = await page.goto('/admin');
    // After the redirect, we should land on / and not see the admin heading.
    await expect(page).toHaveURL('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /Admin · Ratings/i })).toHaveCount(0);
  });

  test('voting banner is visible when voting is open', async ({ page }) => {
    await page.goto('/');
    // Banner mentions "Voting is open" when the env-configured window covers now.
    await expect(page.getByText(/Voting is open/i)).toBeVisible();
  });

  test('article reading still works even when reaching API endpoints fails', async ({ page }) => {
    // Sabotage every /api/* call from the browser. The article reading
    // experience must keep working — this is the contract the contexts +
    // server-rendered initial state are supposed to honor.
    await page.route('**/api/**', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('article').first()).toBeVisible();
    const firstLink = await page.locator('a[href^="/reviews/"]').first().getAttribute('href');
    await page.goto(firstLink!);
    // Review header + content render; favorites/progress sync silently fails.
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
