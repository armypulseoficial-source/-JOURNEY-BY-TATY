import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { countdownDays, formatTripDate, todayInTrip } from '@/lib/format/date';

export const instant = false;

type Props = { params: Promise<{ tripId: string }> };

async function Hoje({ tripId }: { tripId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: viagem } = await supabase
    .from('trips')
    .select('title, destination_city, start_date, end_date')
    .eq('id', tripId)
    .maybeSingle();
  if (!viagem) notFound();

  const hoje = todayInTrip();
  const faltam = countdownDays(viagem.start_date, hoje);

  const { data: itensHoje } = await supabase
    .from('itinerary_items')
    .select('title, start_time, category, location_name')
    .eq('trip_id', tripId)
    .eq('activity_date', hoje)
    .order('start_time', { ascending: true });

  const situacao =
    faltam > 0
      ? `Faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'} para a partida.`
      : faltam === 0
        ? 'A viagem começa hoje.'
        : 'Viagem em andamento.';

  return (
    <>
      <h1>{viagem.title}</h1>
      <p>{situacao}</p>
      <p>
        {formatTripDate(viagem.start_date)} a {formatTripDate(viagem.end_date)}
      </p>
      <h2>Hoje</h2>
      {itensHoje?.length ? (
        <ul>
          {itensHoje.map((it, i) => (
            <li key={i}>
              {it.start_time?.slice(0, 5) ?? ''} {it.title}
              {it.location_name ? <small> · {it.location_name}</small> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>Nada marcado para hoje.</p>
      )}
      <nav>
        <Link href={`/trip/${tripId}/roteiro`}>Roteiro</Link> ·{' '}
        <Link href={`/trip/${tripId}/documentos`}>Documentos</Link> ·{' '}
        <Link href={`/trip/${tripId}/cartao-celiaco`}>Cartão celíaco</Link>
      </nav>
    </>
  );
}

export default async function TripHome({ params }: Props) {
  const { tripId } = await params;
  return (
    <main>
      <Suspense fallback={<p>Carregando…</p>}>
        <Hoje tripId={tripId} />
      </Suspense>
    </main>
  );
}
