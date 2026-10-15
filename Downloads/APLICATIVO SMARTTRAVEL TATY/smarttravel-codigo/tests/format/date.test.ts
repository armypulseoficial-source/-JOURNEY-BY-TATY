import { describe, it, expect } from 'vitest';
import { formatTripDate, countdownDays, CANCUN_TZ } from '@/lib/format/date';

describe('formatTripDate', () => {
  it('formata a data do destino em português, sem deslocar o dia', () => {
    expect(formatTripDate('2026-12-05')).toBe('sábado, 5 de dezembro');
  });

  it('usa o fuso de Cancún por padrão', () => {
    expect(CANCUN_TZ).toBe('America/Cancun');
  });
});

describe('countdownDays', () => {
  it('conta dias corridos até a partida', () => {
    expect(countdownDays('2026-12-05', '2026-10-14')).toBe(52);
  });

  it('é zero no dia da partida e negativo depois dela', () => {
    expect(countdownDays('2026-12-05', '2026-12-05')).toBe(0);
    expect(countdownDays('2026-12-05', '2026-12-06')).toBe(-1);
  });
});
