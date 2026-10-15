import { createBrowserClient } from '@supabase/ssr';

// Usa somente a chave anon. A service_role nunca vai para o front.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
