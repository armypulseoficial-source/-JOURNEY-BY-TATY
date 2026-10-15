import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateDay, type ItineraryItem } from '@/lib/itinerary/validate';

type NovoItem = {
  tripId: string;
  dayNumber: number;
  activityDate: string;
  title: string;
  category: string;
  pacingType: 'intense' | 'moderate' | 'relaxed' | null;
  locationName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

function parseBody(body: unknown): NovoItem | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (
    typeof b.tripId !== 'string' ||
    typeof b.dayNumber !== 'number' ||
    typeof b.activityDate !== 'string' ||
    typeof b.title !== 'string' ||
    typeof b.category !== 'string'
  ) {
    return null;
  }
  return {
    tripId: b.tripId,
    dayNumber: b.dayNumber,
    activityDate: b.activityDate,
    title: b.title,
    category: b.category,
    pacingType: (b.pacingType as NovoItem['pacingType']) ?? null,
    locationName: (b.locationName as string | undefined) ?? null,
    startTime: (b.startTime as string | undefined) ?? null,
    endTime: (b.endTime as string | undefined) ?? null,
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'agency_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const item = parseBody(await request.json().catch(() => null));
  if (!item) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // A RLS limita a leitura às viagens da agência. Viagem de outra agência retorna vazio.
  const { data: existentes, error: readError } = await supabase
    .from('itinerary_items')
    .select('title, category, pacing_type')
    .eq('trip_id', item.tripId)
    .eq('day_number', item.dayNumber);

  if (readError) {
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }

  const dia: ItineraryItem[] = [
    ...(existentes ?? []).map((e) => ({
      title: e.title,
      category: e.category,
      pacing_type: e.pacing_type,
    })),
    { title: item.title, category: item.category, pacing_type: item.pacingType },
  ];

  const check = validateDay(dia);
  if (!check.ok) {
    return NextResponse.json({ error: 'day_limit', reason: check.reason }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('itinerary_items')
    .insert({
      trip_id: item.tripId,
      day_number: item.dayNumber,
      activity_date: item.activityDate,
      title: item.title,
      category: item.category,
      pacing_type: item.pacingType,
      location_name: item.locationName,
      start_time: item.startTime,
      end_time: item.endTime,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
