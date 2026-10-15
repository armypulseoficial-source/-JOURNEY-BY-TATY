// Regra da spec: no máximo 3 atrações principais por dia.
// Refeições ("Gastronomia") não contam para o limite.

export const MAX_ATTRACTIONS_PER_DAY = 3;
const MEAL_CATEGORY = 'Gastronomia';

export type ItineraryItem = {
  title: string;
  category: string;
  pacing_type: 'intense' | 'moderate' | 'relaxed' | null;
};

export type DayResult = { ok: true } | { ok: false; reason: string };

export function validateDay(items: ItineraryItem[]): DayResult {
  const atracoes = items.filter((item) => item.category !== MEAL_CATEGORY).length;

  if (atracoes > MAX_ATTRACTIONS_PER_DAY) {
    return {
      ok: false,
      reason: `Um dia aceita no máximo ${MAX_ATTRACTIONS_PER_DAY} atrações principais; este tem ${atracoes}.`,
    };
  }
  return { ok: true };
}
