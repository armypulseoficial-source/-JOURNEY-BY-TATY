import { createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Convite: validade de 7 dias, uso único. O token em claro só existe na resposta
// da criação; o banco guarda apenas o SHA-256.

export const INVITE_TTL_DAYS = 7;

export type InviteFailure = 'expired' | 'used' | 'invalid' | 'not_authenticated';

export function generateToken(): string {
  // 32 bytes = 256 bits de entropia, em base64url.
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function createInvite(
  supabase: SupabaseClient,
  params: { tripId: string; createdBy: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);

  const { error } = await supabase.from('trip_invites').insert({
    trip_id: params.tripId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
    created_by: params.createdBy,
  });
  if (error) throw new Error(error.message);

  return { token, expiresAt };
}

const FAILURES: readonly InviteFailure[] = ['expired', 'used', 'invalid', 'not_authenticated'];

export async function acceptInvite(
  supabase: SupabaseClient,
  token: string,
): Promise<{ ok: true; tripId: string } | { ok: false; reason: InviteFailure }> {
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token });

  if (error) {
    const motivo = FAILURES.find((f) => error.message === f);
    if (motivo) return { ok: false, reason: motivo };
    throw new Error(error.message);
  }
  return { ok: true, tripId: data as string };
}
