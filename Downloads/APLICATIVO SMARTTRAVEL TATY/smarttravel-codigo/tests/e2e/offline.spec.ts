import { test, expect } from '@playwright/test';

// Parte 1: roda sempre. Não depende de dados do Supabase.
test.describe('PWA: manifest e Service Worker', () => {
  test('manifest responde 200 com os campos exigidos', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);

    const manifest = await res.json();
    expect(manifest.name).toBe('SmartTravel');
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color.toUpperCase()).toBe('#F8F6F0');
    expect(manifest.theme_color.toUpperCase()).toBe('#0F172A');

    const tamanhos = (manifest.icons as { sizes: string }[]).map((i) => i.sizes);
    expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  test('o Service Worker é registrado e ativa, sem erros JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);

    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const reg = await navigator.serviceWorker.getRegistration();
            return reg?.active?.scriptURL ?? null;
          }),
        { timeout: 15_000 },
      )
      .toMatch(/\/sw\.js$/);

    expect(errors).toEqual([]);
  });
});

test('a casca do app abre offline depois de visitada', async ({ page, context }) => {
  // Primeira visita: o SW assume a página. Recarregar faz os arquivos do app
  // passarem pelo SW e entrarem no cache.
  await page.goto('/login');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

// Parte 2: cenário completo. Exige um projeto Supabase real com uma viagem,
// uma sessão de família e pelo menos um documento marcado como offline.
// Sem essas variáveis o bloco é pulado com motivo explícito. Não foi executado
// nesta sandbox (não há projeto Supabase com dados).
const TRIP_ID = process.env.E2E_TRIP_ID;
const SESSION_COOKIE = process.env.E2E_SESSION_COOKIE; // "nome=valor" do cookie sb-...-auth-token

test.describe('cenário offline com dados reais', () => {
  test.skip(
    !TRIP_ID || !SESSION_COOKIE,
    'Requer E2E_TRIP_ID, E2E_SESSION_COOKIE e um documento offline num projeto Supabase real.',
  );

  test('com a rede desligada, Roteiro e documento offline continuam abertos', async ({ page, context, baseURL }) => {
    const [name, ...rest] = SESSION_COOKIE!.split('=');
    await context.addCookies([{ name, value: rest.join('='), url: baseURL! }]);

    // Online: abre as telas e aguarda o Service Worker controlar a página.
    await page.goto(`/trip/${TRIP_ID}/documentos`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    // Salva o primeiro documento offline.
    await page.getByRole('button', { name: 'Salvar offline' }).first().click();
    await expect(page.getByText(/salvo neste aparelho/)).toBeVisible();

    // A URL assinada passa a falhar (simula expiração), e a rede cai.
    await page.route('**/storage/v1/object/**', (route) => route.fulfill({ status: 403, body: 'expired' }));
    await context.setOffline(true);

    await page.goto(`/trip/${TRIP_ID}/roteiro`);
    await expect(page.getByRole('heading', { name: 'Roteiro' })).toBeVisible();

    await page.goto(`/trip/${TRIP_ID}/documentos`);
    const abrir = page.getByRole('link', { name: /cópia no aparelho/ }).first();
    await expect(abrir).toHaveAttribute('href', /^blob:/);
  });
});
