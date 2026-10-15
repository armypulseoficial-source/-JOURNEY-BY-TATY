import type { SupabaseClient } from '@supabase/supabase-js';
import { VOUCHERS_BUCKET } from './signedUrl';

// Limite por arquivo. Acima disso, o iPhone pode não ter espaço para guardar
// a cópia offline; a UI avisa antes de enviar.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function uploadDocument(
  supabase: SupabaseClient,
  tripId: string,
  file: File,
  offline: boolean,
): Promise<{ id: string; path: string }> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('too_large');

  const path = `${tripId}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(VOUCHERS_BUCKET)
    .upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      trip_id: tripId,
      title: file.name,
      document_type: 'Voucher',
      file_url: path,
      is_offline_available: offline,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'insert_failed');

  return { id: data.id as string, path };
}
