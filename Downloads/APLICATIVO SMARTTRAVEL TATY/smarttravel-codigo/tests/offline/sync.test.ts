import { describe, expect, it, vi } from 'vitest';

// syncTrip roda ao reconectar. Nunca pode lançar: falha de rede é esperada.
vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => {
    throw new TypeError('Failed to fetch');
  },
}));

import { syncTrip } from '@/lib/offline/sync';

describe('syncTrip', () => {
  it('resolve sem lançar quando a rede está indisponível', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));

    await expect(syncTrip('trip-1')).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });
});
