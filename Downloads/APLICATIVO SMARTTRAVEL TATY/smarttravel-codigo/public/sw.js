// Service Worker do SmartTravel. Escrito à mão (sem Serwist): ver o relatório
// da Tarefa 8. Estratégia: rede primeiro, cópia do cache quando a rede falha.
// Assim o app nunca mostra versão antiga quando há conexão, e abre offline com o
// que já foi visto. Só GET do próprio domínio é tratado; APIs e autenticação passam direto.

const VERSAO = 'v1';
const CACHE_HTML = `st-html-${VERSAO}`;
const CACHE_RSC = `st-rsc-${VERSAO}`;
const CACHE_ARQUIVOS = `st-arquivos-${VERSAO}`;
const CACHES_ATUAIS = [CACHE_HTML, CACHE_RSC, CACHE_ARQUIVOS];

// Casca do app, guardada na instalação. As telas /trip/** entram no cache quando
// são abertas e quando a sincronização da viagem as busca (lib/offline/sync.ts).
const CASCA_HTML = ['/login'];
const CASCA_ARQUIVOS = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

const IGNORAR = ['/api/', '/auth/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const buscarEGuardar = async (url, nomeCache) => {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) await (await caches.open(nomeCache)).put(url, res);
        } catch {
          // Sem rede na instalação: a página entra no cache na primeira visita.
        }
      };
      await Promise.all([
        ...CASCA_HTML.map((url) => buscarEGuardar(url, CACHE_HTML)),
        ...CASCA_ARQUIVOS.map((url) => buscarEGuardar(url, CACHE_ARQUIVOS)),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((nome) => nome.startsWith('st-') && !CACHES_ATUAIS.includes(nome))
          .map((nome) => caches.delete(nome)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (IGNORAR.some((prefixo) => url.pathname.startsWith(prefixo))) return;

  // Navegação interna do Next (payload RSC) e navegação de página inteira (HTML)
  // ficam em caches separados, porque a mesma URL tem os dois formatos.
  if (req.headers.get('RSC') === '1') {
    event.respondWith(redePrimeiro(req, CACHE_RSC));
    return;
  }
  const aceita = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || aceita.includes('text/html')) {
    event.respondWith(redePrimeiro(req, CACHE_HTML));
    return;
  }
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(redePrimeiro(req, CACHE_ARQUIVOS));
  }
});

async function redePrimeiro(req, nomeCache) {
  const cache = await caches.open(nomeCache);
  const chave = req.url;
  try {
    const res = await fetch(req);
    // Só guarda respostas próprias e finais (sem redirect de login, sem erro).
    if (res.ok && res.type === 'basic' && !res.redirected) {
      cache.put(chave, res.clone()).catch(() => {});
    }
    return res;
  } catch (erro) {
    const guardado = await cache.match(chave);
    if (guardado) return guardado;
    throw erro;
  }
}
