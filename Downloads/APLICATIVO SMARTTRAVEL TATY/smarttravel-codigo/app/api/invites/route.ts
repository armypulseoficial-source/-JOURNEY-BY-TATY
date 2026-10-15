import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createInvite } from '@/lib/invites/token';

// Cria convite para uma viagem. Só a consultora da agência dona da viagem consegue:
// a RLS da tabela trip_invites recusa qualquer outra tentativa.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'agency_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.tripId !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  try {
    const { token, expiresAt } = await createInvite(supabase, {
      tripId: body.tripId,
      createdBy: user.id,
    });
    const origin = new URL(request.url).origin;
    return NextResponse.json(
      { url: `${origin}/invite/${token}`, expiresAt: expiresAt.toISOString() },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'create_failed' }, { status: 403 });
  }
}
