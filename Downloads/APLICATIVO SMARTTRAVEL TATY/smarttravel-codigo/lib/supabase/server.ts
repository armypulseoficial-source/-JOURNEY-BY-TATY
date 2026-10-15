import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Usa somente a chave anon; a RLS é quem protege os dados.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de Server Component: a sessão é renovada pelo proxy.
          }
        },
      },
    },
  );
}
