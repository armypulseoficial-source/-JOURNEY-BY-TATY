// Regras de acesso puras (sem rede): usadas pelo proxy.ts.
import { describe, it, expect } from 'vitest';
import { decideAccess, safeNext } from '../../lib/auth/access';

const admin = { id: 'a', role: 'agency_admin' as const, organizationId: 'org-1' };
const traveler = { id: 't', role: 'traveler' as const, organizationId: null };

describe('decideAccess', () => {
  it('sem usuário, /agency e /trip pedem login', () => {
    expect(decideAccess('/agency', null)).toEqual({ action: 'login' });
    expect(decideAccess('/agency/trips', null)).toEqual({ action: 'login' });
    expect(decideAccess('/trip/abc/roteiro', null)).toEqual({ action: 'login' });
  });

  it('agency_admin acessa /agency e /trip', () => {
    expect(decideAccess('/agency/trips', admin)).toEqual({ action: 'allow' });
    expect(decideAccess('/trip/abc', admin)).toEqual({ action: 'allow' });
  });

  it('traveler acessa /trip e não acessa /agency', () => {
    expect(decideAccess('/trip/abc', traveler)).toEqual({ action: 'allow' });
    expect(decideAccess('/agency', traveler)).toEqual({ action: 'sem-acesso' });
    expect(decideAccess('/agency/trips/x', traveler)).toEqual({ action: 'sem-acesso' });
  });

  it('agency_admin sem organização não acessa /agency', () => {
    expect(
      decideAccess('/agency', { id: 'a2', role: 'agency_admin', organizationId: null }),
    ).toEqual({ action: 'sem-acesso' });
  });

  it('prefixo parecido não conta como rota protegida', () => {
    expect(decideAccess('/agencyfake', traveler)).toEqual({ action: 'allow' });
    expect(decideAccess('/tripulacao', null)).toEqual({ action: 'allow' });
  });
});

describe('safeNext', () => {
  it('aceita caminho relativo interno', () => {
    expect(safeNext('/agency/trips')).toBe('/agency/trips');
  });

  it('recusa URL absoluta, protocol-relative e barra invertida', () => {
    expect(safeNext('https://evil.example/x')).toBe('/');
    expect(safeNext('//evil.example/x')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext('/\t/evil.example')).toBe('/');
  });

  it('usa / quando não há valor', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext('')).toBe('/');
  });
});
