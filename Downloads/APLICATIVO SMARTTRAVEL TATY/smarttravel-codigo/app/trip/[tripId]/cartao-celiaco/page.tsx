import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const instant = false;

type Props = { params: Promise<{ tripId: string }> };

// Texto para mostrar ao garçom. Não promete ausência de glúten: orienta o pedido.
const CARTAO_ES = [
  '¡Hola! Tengo ENFERMEDAD CELÍACA (restricción médica severa).',
  'Mi salud depende de que mi comida esté libre de gluten.',
  'NO PUEDO COMER: trigo, centeno, cebada, avena, harina, pan, salsa de soya, cerveza o empanizados.',
  'Por favor, prepare mi plato sin gluten: utensilios limpios, sin aceite compartido y sin tablas o cuchillos usados con gluten.',
];

async function Cartao({ tripId }: { tripId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: viagem } = await supabase.from('trips').select('id').eq('id', tripId).maybeSingle();
  if (!viagem) notFound();

  const { data: integrantes } = await supabase
    .from('family_members')
    .select('name, dietary_restrictions')
    .eq('trip_id', tripId)
    .not('dietary_restrictions', 'is', null);

  return (
    <article lang="es" style={{ fontSize: '1.25rem', lineHeight: 1.5 }}>
      <h1>Tarjeta digital de atención médica y dietética</h1>
      {CARTAO_ES.map((linha) => (
        <p key={linha}>{linha}</p>
      ))}
      {integrantes?.length ? (
        <section lang="pt-BR">
          <h2>Quem tem restrição</h2>
          <ul>
            {integrantes.map((i, n) => (
              <li key={n}>
                {i.name}: {i.dietary_restrictions}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export default async function CartaoPage({ params }: Props) {
  const { tripId } = await params;
  return (
    <main>
      <Suspense fallback={<p>Carregando…</p>}>
        <Cartao tripId={tripId} />
      </Suspense>
    </main>
  );
}
