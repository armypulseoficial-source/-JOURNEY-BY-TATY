import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSignedUrl } from '@/lib/documents/signedUrl';
import { DocumentoItem } from './documento-item';

export const instant = false;

type Props = { params: Promise<{ tripId: string }> };

async function Documentos({ tripId }: { tripId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: viagem } = await supabase.from('trips').select('id').eq('id', tripId).maybeSingle();
  if (!viagem) notFound();

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, document_type, file_url, is_offline_available')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (!docs?.length) return <p>Nenhum documento disponível.</p>;

  // URL assinada de 60 minutos. Se o aparelho já tem a cópia, a tela usa ela.
  const itens = await Promise.all(
    docs.map(async (d) => ({ ...d, url: await getSignedUrl(supabase, d.file_url) })),
  );

  return (
    <ul>
      {itens.map((d) => (
        <DocumentoItem
          key={d.id}
          id={d.id}
          title={d.title}
          documentType={d.document_type}
          offlineAvailable={d.is_offline_available}
          url={d.url}
        />
      ))}
    </ul>
  );
}

export default async function DocumentosPage({ params }: Props) {
  const { tripId } = await params;
  return (
    <main>
      <h1>Documentos</h1>
      <Suspense fallback={<p>Carregando documentos…</p>}>
        <Documentos tripId={tripId} />
      </Suspense>
    </main>
  );
}
