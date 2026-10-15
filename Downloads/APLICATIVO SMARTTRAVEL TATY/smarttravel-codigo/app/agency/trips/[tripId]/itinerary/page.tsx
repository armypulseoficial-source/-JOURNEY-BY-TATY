import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AddItemForm } from './add-item-form';

export const instant = false;

type Props = { params: Promise<{ tripId: string }> };

function datasDoPeriodo(inicio: string, fim: string): string[] {
  const datas: string[] = [];
  const cursor = new Date(`${inicio}T00:00:00Z`);
  const limite = new Date(`${fim}T00:00:00Z`);
  while (cursor <= limite) {
    datas.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return datas;
}

async function Editor({ tripId }: { tripId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: viagem } = await supabase
    .from('trips')
    .select('id, title, start_date, end_date')
    .eq('id', tripId)
    .maybeSingle();

  // Viagem de outra agência chega aqui vazia pela RLS: resposta 404, sem dados.
  if (!viagem) notFound();

  const { data: itens } = await supabase
    .from('itinerary_items')
    .select('id, day_number, activity_date, title, category, pacing_type, start_time')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true })
    .order('start_time', { ascending: true });

  const datas = datasDoPeriodo(viagem.start_date, viagem.end_date);

  return (
    <>
      <h1>{viagem.title}</h1>
      {datas.map((data, i) => {
        const diaNumero = i + 1;
        const doDia = (itens ?? []).filter((it) => it.day_number === diaNumero);
        return (
          <section key={data}>
            <h2>
              Dia {diaNumero} · {data}
            </h2>
            <ul>
              {doDia.map((it) => (
                <li key={it.id}>
                  {it.start_time ?? ''} {it.title} <small>({it.category})</small>
                </li>
              ))}
            </ul>
            <AddItemForm tripId={tripId} dayNumber={diaNumero} activityDate={data} />
          </section>
        );
      })}
    </>
  );
}

export default async function ItineraryPage({ params }: Props) {
  const { tripId } = await params;
  return (
    <main>
      <Suspense fallback={<p>Carregando roteiro…</p>}>
        <Editor tripId={tripId} />
      </Suspense>
    </main>
  );
}
