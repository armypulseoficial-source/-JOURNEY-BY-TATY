import type { SupabaseClient } from '@supabase/supabase-js';

// Vouchers ficam no bucket privado "vouchers-pdf". O acesso é sempre por URL
// assinada de curta duração (60 minutos). Quem já baixou o PDF usa a cópia local.
export const SIGNED_URL_TTL_SECONDS = 3600;
export const VOUCHERS_BUCKET = 'vouchers-pdf';

export async function getSignedUrl(supabase: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(VOUCHERS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) throw new Error(error?.message ?? 'signed_url_failed');
  return data.signedUrl;
}
