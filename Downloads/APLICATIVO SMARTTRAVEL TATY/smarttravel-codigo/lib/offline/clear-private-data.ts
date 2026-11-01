import { clearOfflineDocuments } from './store';

export async function clearPrivateOfflineData(): Promise<void> {
  const cachesToClear = 'caches' in globalThis
    ? (await caches.keys()).filter((name) => name.startsWith('st-html-') || name.startsWith('st-rsc-'))
    : [];

  await Promise.all([
    clearOfflineDocuments(),
    ...cachesToClear.map((name) => caches.delete(name)),
  ]);
}
