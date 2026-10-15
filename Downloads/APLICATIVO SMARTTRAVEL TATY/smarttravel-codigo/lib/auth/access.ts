import type { CurrentUser } from './session';

// Regras de acesso das áreas protegidas. Sem rede e sem Next: fácil de testar.
// Usado pelo proxy.ts. Verificação otimista: não substitui a RLS.

export type AccessDecision =
  | { action: 'allow' }
  | { action: 'login' }
  | { action: 'sem-acesso' };

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function decideAccess(pathname: string, user: CurrentUser | null): AccessDecision {
  const inAgency = isUnder(pathname, '/agency');
  const inTrip = isUnder(pathname, '/trip');
  if (!inAgency && !inTrip) return { action: 'allow' };

  if (user === null) return { action: 'login' };

  if (inAgency) {
    const ok = user.role === 'agency_admin' && user.organizationId !== null;
    return ok ? { action: 'allow' } : { action: 'sem-acesso' };
  }

  // /trip: traveler vinculado ou agency_admin.
  const ok = user.role === 'traveler' || user.role === 'agency_admin';
  return ok ? { action: 'allow' } : { action: 'sem-acesso' };
}

// Aceita apenas caminho relativo interno, para não virar redirect aberto.
export function safeNext(value: string | null | undefined): string {
  if (!value) return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//') || value.startsWith('/\\')) return '/';
  if (/[\t\r\n]/.test(value)) return '/';
  return value;
}
