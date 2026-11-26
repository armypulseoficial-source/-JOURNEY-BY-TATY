import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Encerra a sessão no Supabase. A limpeza local (IndexedDB e caches) é feita antes
// pelo botão Sair, no navegador (lib/offline/limpar.ts).
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
