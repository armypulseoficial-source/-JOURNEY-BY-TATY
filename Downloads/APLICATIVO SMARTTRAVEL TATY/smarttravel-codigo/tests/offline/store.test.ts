// Escolha de ambiente: IndexedDB real em Node, via fake-indexeddb (registra
// indexedDB, IDBObjectStore etc. no escopo global). Os blobs dos documentos
// ficam no próprio IndexedDB, junto com os metadados, numa única transação.
// Download simulado com fetch stub. Quota simulada: put lança QuotaExceededError
// (é o que Safari/iOS faz quando a cota do origin estoura).
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPrivateOfflineData } from '@/lib/offline/clear-private-data';
import { clearOfflineDocuments, saveDocumentOffline, getOfflineDocument } from '@/lib/offline/store';

const SIGNED_URL = 'https://storage.test/vouchers-pdf/cancun/voucher.pdf?token=abc&exp=3600';

function pdf(conteudo: string): Blob {
  return new Blob([conteudo], { type: 'application/pdf' });
}

function apagarBanco(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('smarttravel-offline');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await apagarBanco();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('saveDocumentOffline', () => {
  it('devolve reason "quota" quando o armazenamento lança QuotaExceededError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pdf('voucher'))));
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Cota excedida', 'QuotaExceededError');
    });

    const resultado = await saveDocumentOffline('doc-1', SIGNED_URL);

    expect(resultado).toEqual({ ok: false, reason: 'quota' });
  });

  it('devolve reason "network" quando a rede cai durante o download', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));

    const resultado = await saveDocumentOffline('doc-1', SIGNED_URL);

    expect(resultado).toEqual({ ok: false, reason: 'network' });
    expect(await getOfflineDocument('doc-1')).toBeNull();
  });
});

describe('getOfflineDocument', () => {
  it('limpa documentos e caches privados sem apagar arquivos estáticos', async () => {
    const deleteCache = vi.fn(async () => true);
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => ['st-html-v1', 'st-rsc-v1', 'st-arquivos-v1']),
      delete: deleteCache,
    });

    await clearPrivateOfflineData();

    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith('st-html-v1');
    expect(deleteCache).toHaveBeenCalledWith('st-rsc-v1');
    expect(deleteCache).not.toHaveBeenCalledWith('st-arquivos-v1');
  });

  it('apaga cópias offline no encerramento da sessão', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pdf('voucher'))));
    expect(await saveDocumentOffline('doc-1', SIGNED_URL)).toEqual({ ok: true });

    await clearOfflineDocuments();

    expect(await getOfflineDocument('doc-1')).toBeNull();
  });

  it('devolve o Blob salvo com o conteúdo original', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pdf('%PDF-1.4 voucher Cancun'))));
    expect(await saveDocumentOffline('doc-1', SIGNED_URL)).toEqual({ ok: true });

    const blob = await getOfflineDocument('doc-1');

    expect(blob).not.toBeNull();
    expect(blob!.type).toBe('application/pdf');
    expect(await blob!.text()).toBe('%PDF-1.4 voucher Cancun');
  });

  it('URL expirada: com a rede indisponível, ainda devolve a cópia local', async () => {
    // Salvo enquanto a URL ainda valia.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pdf('voucher original'))));
    expect(await saveDocumentOffline('doc-1', SIGNED_URL)).toEqual({ ok: true });

    // Depois: sem rede. A URL assinada também já expirou, então nada chega ao servidor.
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));

    const blob = await getOfflineDocument('doc-1');

    expect(blob).not.toBeNull();
    expect(await blob!.text()).toBe('voucher original');
  });

  it('URL expirada no novo download (403) não apaga a cópia que já existe', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pdf('voucher original'))));
    expect(await saveDocumentOffline('doc-1', SIGNED_URL)).toEqual({ ok: true });

    vi.stubGlobal('fetch', vi.fn(async () => new Response('expired', { status: 403 })));
    const tentativa = await saveDocumentOffline('doc-1', SIGNED_URL);

    expect(tentativa).toEqual({ ok: false, reason: 'network' });
    const blob = await getOfflineDocument('doc-1');
    expect(await blob!.text()).toBe('voucher original');
  });

  it('devolve null para documento que nunca foi salvo', async () => {
    expect(await getOfflineDocument('nao-existe')).toBeNull();
  });
});
