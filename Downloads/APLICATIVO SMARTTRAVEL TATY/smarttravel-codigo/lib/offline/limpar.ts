// Apaga no aparelho tudo o que guarda dados da família: o banco de vouchers
// (IndexedDB) e as páginas em cache do Service Worker (prefixo "st-").
// Usado no logout. Nunca lança: falha aqui não deve impedir a saída.

const DB_NAME = 'smarttravel-offline';

function apagarBanco(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function apagarCaches(): Promise<void> {
  try {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('st-')).map((n) => caches.delete(n)));
  } catch {
    // Sem Cache Storage (navegador antigo ou contexto restrito): nada a apagar.
  }
}

export async function limparDadosLocais(): Promise<void> {
  await Promise.allSettled([apagarBanco(), apagarCaches()]);
}
