import { test, expect } from '@playwright/test';

test.describe('Footnotes', () => {
  test('clicking an in-text footnote opens the sheet with matching content', async ({ page }) => {
    await page.goto('/reviews/down-and-out-in-paris-and-london');

    const firstRef = page.locator('sup.fn-ref').first();
    await expect(firstRef).toBeVisible();

    await firstRef.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Footnote \[1\]/)).toBeVisible();
    await expect(dialog.getByText(/addictioncenter\.com/)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    const secondRef = page.locator('sup.fn-ref').nth(1);
    await secondRef.click();
    const dialog2 = page.getByRole('dialog');
    await expect(dialog2).toBeVisible();
    await expect(dialog2.getByText(/Footnote \[2\]/)).toBeVisible();
    await expect(dialog2.getByText(/historicengland\.org\.uk/)).toBeVisible();
  });

  test('bottom-of-page footnotes section is rendered with all entries', async ({ page }) => {
    await page.goto('/reviews/down-and-out-in-paris-and-london');

    const section = page.getByRole('region', { name: 'Footnotes' });
    await expect(section).toBeVisible();
    const items = section.locator('ol > li');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('addictioncenter.com');
    await expect(items.nth(1)).toContainText('historicengland.org.uk');
  });
});
