import { test, expect } from '@playwright/test';

// Exige um projeto Supabase real com uma viagem de teste e uma sessão de família.
// Sem essas variáveis, o teste é pulado com motivo explícito (não há como
// simular os dados do servidor pelo navegador).
const TRIP_ID = process.env.E2E_TRIP_ID;
const SESSION_COOKIE = process.env.E2E_SESSION_COOKIE; // "nome=valor" do cookie sb-...-auth-token

test.skip(!TRIP_ID || !SESSION_COOKIE, 'Requer E2E_TRIP_ID e E2E_SESSION_COOKIE de um projeto Supabase real.');

test.beforeEach(async ({ context, baseURL }) => {
  const [name, ...rest] = SESSION_COOKIE!.split('=');
  await context.addCookies([{ name, value: rest.join('='), url: baseURL! }]);
});

const telas = ['', '/roteiro', '/documentos', '/cartao-celiaco'];

for (const sufixo of telas) {
  test(`tela ${sufixo || 'Hoje'} abre sem erros JS e sem rolagem horizontal em 390px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const res = await page.goto(`/trip/${TRIP_ID}${sufixo}`);
    expect(res?.status()).toBe(200);

    const larguraPagina = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(larguraPagina).toBeLessThanOrEqual(390);
    expect(errors).toEqual([]);
  });
}

test('Hoje mostra a data do destino em português', async ({ page }) => {
  await page.goto(`/trip/${TRIP_ID}`);
  await expect(page.getByText(/dezembro/)).toBeVisible();
});
