import { describe, it, expect } from 'vitest';
import { validateDay, type ItineraryItem } from '@/lib/itinerary/validate';

const atracao = (title: string): ItineraryItem => ({
  title,
  category: 'Atração',
  pacing_type: 'intense',
});

const refeicao: ItineraryItem = {
  title: 'Almoço',
  category: 'Gastronomia',
  pacing_type: 'moderate',
};

describe('validateDay', () => {
  it('aceita três atrações no mesmo dia', () => {
    const itens = [atracao('A'), atracao('B'), atracao('C')];
    expect(validateDay(itens)).toEqual({ ok: true });
  });

  it('recusa a quarta atração e explica o limite', () => {
    const itens = [atracao('A'), atracao('B'), atracao('C'), atracao('D')];
    const r = validateDay(itens);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('máximo 3');
  });

  it('refeições não contam para o limite de atrações', () => {
    const itens = [atracao('A'), atracao('B'), atracao('C'), refeicao, refeicao];
    expect(validateDay(itens)).toEqual({ ok: true });
  });

  it('dia sem itens é válido', () => {
    expect(validateDay([])).toEqual({ ok: true });
  });
});
