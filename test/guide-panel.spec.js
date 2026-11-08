// Checks the guide panel on the compiler page. It doesn't wait for Java to load, so it's quick.
import { test, expect } from '@playwright/test';

const url = 'http://localhost:4174/compiler/?lang=java';

test('shows the groups and buttons from the language guide', async ({ page }) => {
  await page.goto(url);
  const panel = page.locator('#guide');
  await expect(panel.getByRole('heading', { name: 'Loops' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'for loop' })).toBeVisible();
  await expect(page.locator('#editor')).toBeVisible();
});

test('collapses and expands', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url);
  const toggle = page.getByRole('button', { name: 'Guide' });
  const button = page.getByRole('button', { name: 'for loop' });

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const open = await page.locator('#guide').boundingBox();
  expect(open.width).toBeGreaterThan(200);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeHidden();
  await expect.poll(async () => (await page.locator('#guide').boundingBox()).width).toBeLessThan(60);

  await toggle.click();
  await expect(button).toBeVisible();
});

test('starts collapsed on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Guide' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'for loop' })).toBeHidden();
});
