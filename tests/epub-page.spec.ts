// tests/epub-page.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ePub download page', () => {
  test('renders download card with working link and instructions', async ({ page }) => {
    await page.goto('/epub');
    await expect(page.getByRole('heading', { name: 'Download as ePub' })).toBeVisible();
    const download = page.getByRole('link', { name: 'Download ePub' }).first();
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute('href', /\.epub$/);
    await expect(page.getByRole('heading', { name: 'Kindle', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'iPhone / iPad' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Android' })).toBeVisible();
  });

  test('home page links to /epub', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /ePub/i }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/epub');
  });
});
