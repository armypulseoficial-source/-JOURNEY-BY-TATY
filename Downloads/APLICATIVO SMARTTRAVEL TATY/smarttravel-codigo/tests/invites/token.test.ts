import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { generateToken, hashToken, acceptInvite, createInvite } from '@/lib/invites/token';

// Mock mínimo do cliente Supabase: só o necessário para estes testes.
function fakeSupabase(opts: {
  rpc?: { data: string | null; error: { message: string } | null };
  insert?: { error: { message: string } | null };
}) {
  const calls: { table?: string; payload?: unknown; rpc?: string; args?: unknown } = {};
  return {
    calls,
    rpc: async (name: string, args: unknown) => {
      calls.rpc = name;
      calls.args = args;
      return opts.rpc ?? { data: null, error: null };
    },
    from: (table: string) => ({
      insert: async (payload: unknown) => {
        calls.table = table;
        calls.payload = payload;
        return opts.insert ?? { error: null };
      },
    }),
  } as never;
}

describe('generateToken', () => {
  it('gera token base64url com pelo menos 256 bits de entropia', () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(43);
  });

  it('dois tokens nunca são iguais', () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe('hashToken', () => {
  it('retorna SHA-256 em hex, igual ao que o banco calcula', () => {
    const esperado = createHash('sha256').update('token-valido', 'utf8').digest('hex');
    expect(hashToken('token-valido')).toBe(esperado);
    expect(hashToken('token-valido')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('tokens diferentes geram hashes diferentes', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

describe('createInvite', () => {
  it('grava só o hash, nunca o token em claro, e devolve o token', async () => {
    const supabase = fakeSupabase({});
    const { token, expiresAt } = await createInvite(supabase, {
      tripId: '21000000-0000-0000-0000-00000000000a',
      createdBy: 'a1000000-0000-0000-0000-000000000001',
    });

    const payload = (supabase as unknown as { calls: { payload: Record<string, unknown> } }).calls.payload;
    expect(payload.token_hash).toBe(hashToken(token));
    expect(JSON.stringify(payload)).not.toContain(token);

    const dias = (expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(6.9);
    expect(dias).toBeLessThan(7.1);
  });

  it('propaga erro de inserção (RLS negando a agência alheia)', async () => {
    const supabase = fakeSupabase({ insert: { error: { message: 'new row violates row-level security policy' } } });
    await expect(
      createInvite(supabase, {
        tripId: '21000000-0000-0000-0000-00000000000a',
        createdBy: 'b1000000-0000-0000-0000-000000000001',
      }),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('acceptInvite', () => {
  it('convite válido devolve o id da viagem', async () => {
    const supabase = fakeSupabase({
      rpc: { data: '21000000-0000-0000-0000-00000000000a', error: null },
    });
    const r = await acceptInvite(supabase, 'token-valido');
    expect(r).toEqual({ ok: true, tripId: '21000000-0000-0000-0000-00000000000a' });
  });

  it.each(['used', 'expired', 'invalid'] as const)('mapeia o motivo "%s" vindo do banco', async (motivo) => {
    const supabase = fakeSupabase({ rpc: { data: null, error: { message: motivo } } });
    const r = await acceptInvite(supabase, 'qualquer');
    expect(r).toEqual({ ok: false, reason: motivo });
  });
});
