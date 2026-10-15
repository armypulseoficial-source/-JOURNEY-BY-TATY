import { test, expect } from '@playwright/test';

test('página inicial responde 200 e não tem erros JS', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const res = await page.goto('/');

  expect(res?.status()).toBe(200);
  expect(errors).toEqual([]);
});
