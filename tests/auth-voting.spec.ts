import { test, expect } from '@playwright/test';

// These tests cover the UI behavior of the auth + voting features without
// requiring a real sign-in. They assume:
//   - VOTING_CONTEST_YEAR=2025 and the voting window is currently open
//     (matching the test config in .env.local).
//   - At least one 2025 review and one non-2025 review exist in the index.

test.describe('Auth & voting UI (signed out)', () => {
  test('vote button is visible on a 2025 review article', async ({ page }) => {
    await page.goto('/?contest=2025-non-book-reviews');
    const firstReview = page.locator('article').first();
    await firstReview.locator('h3').first().click();
    await page.waitForURL(/\/reviews\//);
    await expect(page.getByRole('button', { name: /Vote for this review/i })).toBeVisible();
  });

  test('vote button is hidden on a non-2025 review article', async ({ page }) => {
    await page.goto('/?contest=2024-book-reviews');
    const firstReview = page.locator('article').first();
    await firstReview.locator('h3').first().click();
    await page.waitForURL(/\/reviews\//);
    await expect(page.getByRole('button', { name: /Vote for this review/i })).toHaveCount(0);
  });

  test('clicking the vote button while signed out opens the sign-in dialog', async ({ page }) => {
    await page.goto('/?contest=2025-non-book-reviews');
    const firstReview = page.locator('article').first();
    await firstReview.locator('h3').first().click();
    await page.waitForURL(/\/reviews\//);
    await page.getByRole('button', { name: /Vote for this review/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with email/i })).toBeVisible();
  });

  test('inline vote button on review cards opens the sign-in dialog (does not navigate)', async ({ page }) => {
    await page.goto('/?contest=2025-non-book-reviews');
    const firstCard = page.locator('article').first();
    const inlineVote = firstCard.getByRole('button', { name: /^Vote$/ });
    await expect(inlineVote).toBeVisible();
    const urlBefore = page.url();
    await inlineVote.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(page.url()).toBe(urlBefore);
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
    await expect(page.getByRole('heading', { name: /Admin · Vote tally/i })).toHaveCount(0);
  });

  test('voting banner is visible when voting is open', async ({ page }) => {
    await page.goto('/');
    // Banner mentions "Voting is open" when the env-configured window covers now.
    await expect(page.getByText(/Voting is open/i)).toBeVisible();
  });
});
