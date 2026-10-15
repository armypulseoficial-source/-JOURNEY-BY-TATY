// Cópia local dos documentos (vouchers, bilhetes). O Blob do PDF e os metadados
// vão no mesmo registro do IndexedDB, numa única transação: ou salva tudo, ou nada.
// Não usamos Cache Storage aqui porque a tela lê o documento direto do IndexedDB
// e a mesma API funciona no Safari/iOS e nos testes (fake-indexeddb).

const DB_NAME = 'smarttravel-offline';
const DB_VERSION = 1;
const STORE = 'documents';

export type OfflineDocumentRecord = {
  id: string;
  blob: Blob;
  size: number;
  mimeType: string;
  savedAt: string;
};

export type SaveDocumentResult = { ok: true } | { ok: false; reason: 'quota' | 'network' };

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new DOMException('Banco offline bloqueado', 'InvalidStateError'));
  });
}

// Executa uma operação numa transação e fecha o banco ao terminar.
// Erros de cota podem chegar de duas formas (lançados em put ou como erro
// assíncrono da transação), e as duas são tratadas aqui.
async function executar<T>(
  modo: IDBTransactionMode,
  operacao: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  const db = await abrirBanco();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, modo);
      const req = operacao(tx.objectStore(STORE));
      let resultado: T | undefined;
      req.onsuccess = () => {
        resultado = req.result;
      };
      tx.oncomplete = () => resolve(resultado);
      tx.onerror = () => reject(req.error ?? tx.error);
      tx.onabort = () => reject(tx.error ?? req.error ?? new DOMException('Transação abortada', 'AbortError'));
    });
  } finally {
    db.close();
  }
}

export function isQuotaError(erro: unknown): boolean {
  const e = erro as { name?: string; code?: number } | null;
  // 22: padrão; 1014: Firefox (NS_ERROR_DOM_QUOTA_REACHED).
  return e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014;
}

// Baixa o PDF pela URL assinada e guarda a cópia local. Falha de download
// (rede caiu ou URL recusada, por exemplo expirada com 403) devolve 'network' e
// não mexe na cópia que já existe. Falha de cota devolve 'quota'. Outros erros
// de armazenamento são relançados, para a tela mostrar um erro genérico.
export async function saveDocumentOffline(id: string, url: string): Promise<SaveDocumentResult> {
  let blob: Blob;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { ok: false, reason: 'network' };
    blob = await res.blob();
  } catch {
    return { ok: false, reason: 'network' };
  }

  const registro: OfflineDocumentRecord = {
    id,
    blob,
    size: blob.size,
    mimeType: blob.type,
    savedAt: new Date().toISOString(),
  };

  try {
    await executar('readwrite', (store) => store.put(registro));
    return { ok: true };
  } catch (erro) {
    if (isQuotaError(erro)) return { ok: false, reason: 'quota' };
    throw erro;
  }
}

async function lerRegistro(id: string): Promise<OfflineDocumentRecord | null> {
  try {
    const registro = await executar<OfflineDocumentRecord | undefined>('readonly', (store) => store.get(id));
    return registro ?? null;
  } catch {
    return null;
  }
}

// Leitura nunca quebra a tela: sem IndexedDB ou com erro, vale "não há cópia".
export async function getOfflineDocument(id: string): Promise<Blob | null> {
  return (await lerRegistro(id))?.blob ?? null;
}

// Data do último download (ISO), para a sincronização não baixar o mesmo PDF toda vez.
export async function getOfflineSavedAt(id: string): Promise<string | null> {
  return (await lerRegistro(id))?.savedAt ?? null;
}
