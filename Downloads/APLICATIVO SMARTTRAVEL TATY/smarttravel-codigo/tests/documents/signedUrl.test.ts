import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSignedUrl, SIGNED_URL_TTL_SECONDS } from '@/lib/documents/signedUrl';
import { uploadDocument, MAX_UPLOAD_BYTES } from '@/lib/documents/upload';

// Mock mínimo do Storage e da tabela documents.
function fakeSupabase(opts: { signedError?: string; uploadError?: string; insertError?: string } = {}) {
  const calls: { signed?: [string, number]; uploaded?: string; inserted?: Record<string, unknown> } = {};
  const client = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, expires: number) => {
          calls.signed = [path, expires];
          if (opts.signedError) return { data: null, error: { message: opts.signedError } };
          return { data: { signedUrl: `https://storage.test/${bucket}/${path}?exp=${expires}` }, error: null };
        },
        upload: async (path: string) => {
          calls.uploaded = path;
          if (opts.uploadError) return { data: null, error: { message: opts.uploadError } };
          return { data: { path }, error: null };
        },
      }),
    },
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        calls.inserted = payload;
        return {
          select: () => ({
            single: async () =>
              opts.insertError
                ? { data: null, error: { message: opts.insertError } }
                : { data: { id: 'doc-1' }, error: null },
          }),
        };
      },
    }),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('getSignedUrl', () => {
  it('pede URL com validade de 3600 segundos', async () => {
    const { client, calls } = fakeSupabase();
    const url = await getSignedUrl(client, 'tripA/voucher.pdf');
    expect(calls.signed).toEqual(['tripA/voucher.pdf', 3600]);
    expect(SIGNED_URL_TTL_SECONDS).toBe(3600);
    expect(url).toContain('exp=3600');
  });

  it('propaga erro do Storage', async () => {
    const { client } = fakeSupabase({ signedError: 'Object not found' });
    await expect(getSignedUrl(client, 'x.pdf')).rejects.toThrow('Object not found');
  });
});

describe('uploadDocument', () => {
  it('recusa arquivo acima de 25 MB com motivo too_large e não envia nada', async () => {
    const { client, calls } = fakeSupabase();
    const grande = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'voucher.pdf', { type: 'application/pdf' });
    await expect(uploadDocument(client, 'tripA', grande, true)).rejects.toThrow('too_large');
    expect(calls.uploaded).toBeUndefined();
  });

  it('grava em vouchers-pdf/{tripId}/{uuid}.pdf e registra o documento offline', async () => {
    const { client, calls } = fakeSupabase();
    const pequeno = new File([new Uint8Array(1024)], 'voucher.pdf', { type: 'application/pdf' });
    const r = await uploadDocument(client, 'tripA', pequeno, true);

    expect(calls.uploaded).toMatch(/^tripA\/[0-9a-f-]{36}\.pdf$/);
    expect(calls.inserted).toMatchObject({ trip_id: 'tripA', is_offline_available: true });
    expect(r.id).toBe('doc-1');
    expect(r.path).toBe(calls.uploaded);
  });
});
