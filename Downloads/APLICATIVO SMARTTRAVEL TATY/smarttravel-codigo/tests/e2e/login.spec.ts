import { test, expect } from '@playwright/test';

// Não há projeto Supabase real neste ambiente. Estes testes não dependem dele:
// o redirect é decidido pela ausência de cookie de sessão, antes de qualquer
// chamada de rede ao Supabase. O envio do formulário intercepta a chamada ao
// endpoint de OTP (rede mockada) e confirma só a montagem do pedido.

test('/agency sem sessão redireciona para /login', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/agency');

  await expect(page).toHaveURL(/\/login(\?|$)/);
  expect(errors).toEqual([]);
});

test('/trip sem sessão redireciona para /login preservando o destino', async ({ page }) => {
  await page.goto('/trip/abc/roteiro');

  const url = new URL(page.url());
  expect(url.pathname).toBe('/login');
  expect(url.searchParams.get('next')).toBe('/trip/abc/roteiro');
});

test('formulário envia o link mágico com retorno para /auth/callback', async ({ page }) => {
  let otpBody: string | null = null;
  let otpUrl = '';

  // Mock do endpoint de OTP do Supabase (rede simulada).
  await page.route(/\/auth\/v1\/otp/, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
        },
      });
      return;
    }
    otpBody = route.request().postData();
    otpUrl = route.request().url();
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: '{}',
    });
  });

  await page.goto('/login?next=/agency/trips');
  await page.getByLabel('E-mail').fill('consultora@example.com');
  await page.getByRole('button', { name: 'Enviar link de acesso' }).click();

  await expect(page.getByText('Se o e-mail estiver cadastrado')).toBeVisible();
  expect(otpBody).toContain('consultora@example.com');
  const redirectTo = new URL(otpUrl).searchParams.get('redirect_to');
  expect(redirectTo).toBeTruthy();
  const callback = new URL(redirectTo!);
  expect(callback.pathname).toBe('/auth/callback');
  expect(callback.searchParams.get('next')).toBe('/agency/trips');
});
