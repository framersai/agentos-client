import { test, expect } from '@playwright/test';

test('loads home and shows tabs', async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible();
  // Tabs present
  await expect(page.getByRole('tab', { name: /Compose/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Personas/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Agency/i })).toBeVisible();
});


