import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatTripDate } from '@/lib/format/date';

export const instant = false;

type Props = { params: Promise<{ tripId: string }> };

async function Roteiro({ tripId }: { tripId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: viagem } = await supabase.from('trips').select('id').eq('id', tripId).maybeSingle();
  if (!viagem) notFound();

  const { data: itens } = await supabase
    .from('itinerary_items')
    .select('day_number, activity_date, title, start_time, end_time, category, location_name')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true })
    .order('start_time', { ascending: true });

  type Linha = NonNullable<typeof itens>[number];
  const porDia = new Map<number, { data: string; itens: Linha[] }>();
  for (const it of itens ?? []) {
    const dia = porDia.get(it.day_number) ?? { data: it.activity_date, itens: [] as Linha[] };
    dia.itens.push(it);
    porDia.set(it.day_number, dia);
  }

  if (!porDia.size) return <p>O roteiro ainda não foi publicado.</p>;

  return (
    <>
      {[...porDia.entries()].map(([dia, { data, itens: lista }]) => (
        <section key={dia}>
          <h2>
            Dia {dia} · {formatTripDate(data)}
          </h2>
          <ul>
            {lista.map((it, i) => (
              <li key={i}>
                {it.start_time?.slice(0, 5) ?? ''}
                {it.end_time ? `–${it.end_time.slice(0, 5)}` : ''} {it.title}
                {it.location_name ? <small> · {it.location_name}</small> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export default async function RoteiroPage({ params }: Props) {
  const { tripId } = await params;
  return (
    <main>
      <h1>Roteiro</h1>
      <Suspense fallback={<p>Carregando roteiro…</p>}>
        <Roteiro tripId={tripId} />
      </Suspense>
    </main>
  );
}
