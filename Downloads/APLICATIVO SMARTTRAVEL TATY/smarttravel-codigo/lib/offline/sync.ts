import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { SIGNED_URL_TTL_SECONDS, VOUCHERS_BUCKET } from '@/lib/documents/signedUrl';
import { getOfflineSavedAt, saveDocumentOffline } from './store';

// Telas da família. Cada uma é buscada em duas formas: HTML (para abrir por
// recarregamento) e RSC (para navegação interna). O Service Worker guarda as duas.
const TELAS = ['', '/roteiro', '/documentos', '/cartao-celiaco'];

// Cópia local com menos de 6 horas não é baixada de novo (evita gastar dados a
// cada recarregamento). Documento trocado pela agência entra na próxima janela.
const IDADE_MAXIMA_COPIA_MS = 6 * 60 * 60 * 1000;

// Roda ao reconectar. Nunca lança: falha de rede é esperada e o app segue offline.
export async function syncTrip(tripId: string): Promise<void> {
  await Promise.allSettled([atualizarTelas(tripId), atualizarDocumentos(tripId)]);
}

async function buscar(url: string, headers: Record<string, string>): Promise<void> {
  const res = await fetch(url, { cache: 'no-store', headers });
  await res.arrayBuffer();
}

async function atualizarTelas(tripId: string): Promise<void> {
  await Promise.allSettled(
    TELAS.flatMap((tela) => {
      const url = `/trip/${tripId}${tela}`;
      return [
        buscar(url, { accept: 'text/html' }),
        buscar(url, { RSC: '1', accept: 'text/x-component' }),
      ];
    }),
  );
}

async function atualizarDocumentos(tripId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, file_url')
    .eq('trip_id', tripId)
    .eq('is_offline_available', true);
  if (error || !docs) return;

  for (const doc of docs) {
    const savedAt = await getOfflineSavedAt(doc.id);
    if (savedAt && Date.now() - Date.parse(savedAt) < IDADE_MAXIMA_COPIA_MS) continue;

    const { data, error: erroAssinatura } = await supabase.storage
      .from(VOUCHERS_BUCKET)
      .createSignedUrl(doc.file_url, SIGNED_URL_TTL_SECONDS);
    if (erroAssinatura || !data) continue;

    // Resultado não é tratado aqui: a tela do documento mostra "não salvo" e
    // o botão "Salvar offline", que informa cota ou falha de rede ao usuário.
    await saveDocumentOffline(doc.id, data.signedUrl);
  }
}
