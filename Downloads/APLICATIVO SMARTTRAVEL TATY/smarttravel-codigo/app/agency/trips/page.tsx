import { Suspense } from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function ListaDeViagens() {
  const supabase = await createSupabaseServerClient();
  const { data: viagens, error } = await supabase
    .from('trips')
    .select('id, title, destination_city, start_date, end_date')
    .order('start_date', { ascending: true });

  if (error) return <p role="alert">Não foi possível carregar as viagens.</p>;
  if (!viagens?.length) return <p>Nenhuma viagem cadastrada.</p>;

  return (
    <ul>
      {viagens.map((v) => (
        <li key={v.id}>
          <Link href={`/agency/trips/${v.id}/itinerary`}>{v.title}</Link>
          <span> · {v.destination_city} · {v.start_date} a {v.end_date}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AgencyTripsPage() {
  return (
    <main>
      <h1>Viagens</h1>
      <Suspense fallback={<p>Carregando viagens…</p>}>
        <ListaDeViagens />
      </Suspense>
    </main>
  );
}
