import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '../../../lib/auth/access';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

// Destino do link mágico: troca o código por sessão e segue para "next".
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const destino = safeNext(searchParams.get('next'));

  const falha = () =>
    NextResponse.redirect(
      new URL(`/login?erro=link&next=${encodeURIComponent(destino)}`, origin),
    );

  if (!code) return falha();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return falha();

  return NextResponse.redirect(new URL(destino, origin));
}
