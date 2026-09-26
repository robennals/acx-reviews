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

test('a preview browsing session never loads analytics when navigating away and back', async ({ page }) => {
  const analyticsRequests: string[] = [];
  await page.route('**/googletagmanager.com/**', route => route.abort());
  page.on('request', request => {
    if (/googletagmanager\.com|google-analytics\.com/.test(request.url())) analyticsRequests.push(request.url());
  });
  // Invalid URL avoids Google traffic while retaining a private document-like query.
  const previewPath = '/preview?url=' + encodeURIComponent('https://example.com/private-document');
  await page.goto(previewPath);
  await page.getByRole('link', { name: 'ACX Review Archive', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  // Prove the destination has hydrated before inspecting delayed Script loading.
  await expect(page.locator('article').first()).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Preview your review' })).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
  expect(analyticsRequests).toEqual([]);
});

test('ordinary archive visits still initialize analytics', async ({ page }) => {
  await page.route('**/googletagmanager.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(1);
});

for (const trigger of ['example link', 'URL form'] as const) {
  test(`${trigger} changes URL and shows progress before the slow export finishes`, async ({ page }) => {
    await page.goto('/preview');
    const example = page.getByRole('link', { name: 'Preview the example' });
    const href = await example.getAttribute('href');
    if (!href) throw new Error('Example preview link is missing');
    const destination = new URL(href, page.url());
    if (trigger === 'example link') {
      await example.click();
    } else {
      await page.getByLabel('Google Docs sharing link').fill(destination.searchParams.get('url')!);
      await page.getByRole('button', { name: 'Preview', exact: true }).click();
    }
    await expect(page).toHaveURL(destination.href, { timeout: 2000 });
    const progress = page.getByRole('status').filter({ hasText: 'Generating preview' });
    await expect(progress).toBeVisible({ timeout: 2000 });
    await expect(progress.locator('svg')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Slow example review', exact: true })).toBeVisible({ timeout: 15000 });
    await expect(progress).toHaveCount(0);
  });
}
