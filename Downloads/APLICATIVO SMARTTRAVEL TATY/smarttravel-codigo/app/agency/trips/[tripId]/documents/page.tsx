import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UploadForm } from './upload-form';

export const instant = false;

type Props = { params: Promise<{ tripId: string }> };

async function ListaDocumentos({ tripId }: { tripId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: viagem } = await supabase.from('trips').select('id').eq('id', tripId).maybeSingle();
  if (!viagem) notFound();

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, document_type, is_offline_available')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  return (
    <>
      {docs?.length ? (
        <ul>
          {docs.map((d) => (
            <li key={d.id}>
              {d.title} <small>({d.document_type})</small>
              {d.is_offline_available ? <small> · offline</small> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhum documento enviado.</p>
      )}
      <UploadForm tripId={tripId} />
    </>
  );
}

export default async function DocumentsPage({ params }: Props) {
  const { tripId } = await params;
  return (
    <main>
      <h1>Documentos</h1>
      <Suspense fallback={<p>Carregando documentos…</p>}>
        <ListaDocumentos tripId={tripId} />
      </Suspense>
    </main>
  );
}
