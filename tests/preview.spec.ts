import { test, expect } from '@playwright/test';

test('preview guide submits its URL and reports an invalid document without an article', async ({ page }) => {
  await page.goto('/preview');
  await expect(page.getByRole('heading', { name: 'Preview your review' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Preview the example' })).toHaveAttribute('href', /\/preview\?url=/);
  await page.getByLabel('Google Docs sharing link').fill('https://example.com/not-a-doc');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not create preview' })).toContainText('standard Google Docs sharing link');
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Formatting guide' }).click();
  await expect(page.getByRole('heading', { name: 'Formatting your review' })).toBeVisible();
});
