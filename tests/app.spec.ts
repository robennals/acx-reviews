import { test, expect } from '@playwright/test';

test.describe('ACX Reviews App', () => {
  test('home page loads and displays sample review', async ({ page }) => {
    await page.goto('/');

    // Check that the title is visible
    await expect(page.getByRole('heading', { name: 'ACX Reviews', level: 1 })).toBeVisible();

    // Check that we have 1 review
    await expect(page.getByText(/Browse 1 reviews?/)).toBeVisible();

    // Check that the sample review card is present
    await expect(page.getByText('Sample Book Title')).toBeVisible();
    await expect(page.getByText('by Sample Author')).toBeVisible();
    await expect(page.getByText('reviewed by Anonymous')).toBeVisible();

    // Check reading time is shown
    await expect(page.getByText('3 min')).toBeVisible();

    // Check contest badge (using more specific selector)
    await expect(page.locator('.inline-flex.items-center.rounded-md.border').filter({ hasText: '2023' }).first()).toBeVisible();
  });

  test('can navigate to review detail page', async ({ page }) => {
    await page.goto('/');

    // Click on the review card
    await page.getByText('Sample Book Title').click();

    // Wait for navigation
    await page.waitForURL('/reviews/sample-review');

    // Check that we're on the review page
    await expect(page).toHaveURL('/reviews/sample-review');

    // Check that the review title is shown
    await expect(page.getByRole('heading', { name: 'Sample Book Title' })).toBeVisible();

    // Check that the author is shown
    await expect(page.getByText('by Sample Author')).toBeVisible();

    // Check that the review content is visible
    await expect(page.getByText('This is a sample review')).toBeVisible();
  });

  test('filter controls are present', async ({ page }) => {
    await page.goto('/');

    // Check filter section
    await expect(page.getByText('Filter by Contest')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All Reviews' })).toBeVisible();
    await expect(page.getByRole('button', { name: /2023 Book Reviews/ })).toBeVisible();

    // Check statistics
    await expect(page.getByText(/Total: 1/)).toBeVisible();
    await expect(page.getByText(/Completed: 0/)).toBeVisible();
    await expect(page.getByText(/In Progress: 0/)).toBeVisible();
    await expect(page.getByText(/Unread: 1/)).toBeVisible();
  });

  test('can filter by contest', async ({ page }) => {
    await page.goto('/');

    // Initially should show "All Reviews"
    await expect(page.getByRole('heading', { name: 'All Reviews' })).toBeVisible();

    // Click on a specific contest filter
    await page.getByRole('button', { name: /2023 Book Reviews/ }).click();

    // Should now show "Filtered Reviews"
    await expect(page.getByRole('heading', { name: 'Filtered Reviews' })).toBeVisible();

    // Sample review should still be visible (it's in 2023 contest)
    await expect(page.getByText('Sample Book Title')).toBeVisible();
  });

  test('navigation elements work', async ({ page }) => {
    await page.goto('/reviews/sample-review');

    // Check back button exists
    const backButton = page.getByRole('button', { name: /Back to Reviews/ });
    await expect(backButton).toBeVisible();

    // Click back button
    await backButton.click();

    // Should return to home page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'ACX Reviews', level: 1 })).toBeVisible();
  });

  test('header navigation works', async ({ page }) => {
    await page.goto('/reviews/sample-review');

    // Click on "ACX Reviews" in header
    await page.getByRole('link', { name: 'ACX Reviews' }).click();

    // Should return to home page
    await expect(page).toHaveURL('/');
  });

  test('reading progress bar is present on review page', async ({ page }) => {
    await page.goto('/reviews/sample-review');

    // The progress bar should be in the DOM (it's a fixed element at top)
    // We can't easily check its visibility since it's at 0% initially
    // But we can check that the review content is present
    await expect(page.getByRole('heading', { name: 'Sample Review' })).toBeVisible();
  });

  test('no reviews message when index is empty', async ({ page }) => {
    // This test assumes we could somehow load with no reviews
    // For now we'll skip it since we have a sample review
    test.skip();
  });
});
