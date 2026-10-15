// Teste unitário de lib/auth/session.ts.
// ATENÇÃO: o cliente Supabase é MOCKADO de propósito. O objetivo aqui é verificar
// a lógica de resolução de papel (sem sessão, sessão sem linha em users, sessão
// com linha em users), não o comportamento do Supabase. O comportamento real
// fica para o teste E2E e para a verificação com projeto Supabase real.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fake = vi.hoisted(() => ({
  user: null as null | { id: string },
  authError: null as null | Error,
  row: null as null | Record<string, unknown>,
  eqArgs: [] as unknown[][],
}));

vi.mock('../../lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: fake.user }, error: fake.authError }),
    },
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          fake.eqArgs.push(args);
          return { maybeSingle: async () => ({ data: fake.row, error: null }) };
        },
      }),
    }),
  }),
}));

import { getCurrentUser } from '../../lib/auth/session';

beforeEach(() => {
  fake.user = null;
  fake.authError = null;
  fake.row = null;
  fake.eqArgs = [];
});

describe('getCurrentUser', () => {
  it('retorna null sem sessão', async () => {
    fake.user = null;
    expect(await getCurrentUser()).toBeNull();
  });

  it('retorna null quando o Supabase devolve erro de autenticação', async () => {
    fake.user = { id: 'u-1' };
    fake.authError = new Error('invalid jwt');
    expect(await getCurrentUser()).toBeNull();
  });

  it('retorna null quando há sessão mas não há linha em users', async () => {
    fake.user = { id: 'u-2' };
    fake.row = null;
    expect(await getCurrentUser()).toBeNull();
  });

  it('retorna id, role e organizationId quando há sessão e linha em users', async () => {
    fake.user = { id: 'u-3' };
    fake.row = { id: 'u-3', role: 'agency_admin', organization_id: 'org-1' };
    expect(await getCurrentUser()).toEqual({
      id: 'u-3',
      role: 'agency_admin',
      organizationId: 'org-1',
    });
  });

  it('traveler sem organização retorna organizationId null', async () => {
    fake.user = { id: 'u-4' };
    fake.row = { id: 'u-4', role: 'traveler', organization_id: null };
    expect(await getCurrentUser()).toEqual({
      id: 'u-4',
      role: 'traveler',
      organizationId: null,
    });
  });

  it('busca a linha de users pelo id do usuário autenticado', async () => {
    fake.user = { id: 'u-5' };
    fake.row = { id: 'u-5', role: 'traveler', organization_id: null };
    await getCurrentUser();
    expect(fake.eqArgs).toEqual([['id', 'u-5']]);
  });
});
