// Datas da viagem sempre no fuso do destino (Cancún, UTC-5, sem horário de verão),
// nunca no fuso do aparelho. Meio-dia UTC evita que a data mude de dia na conversão.

export const CANCUN_TZ = 'America/Cancun';

export function formatTripDate(iso: string, timeZone: string = CANCUN_TZ): string {
  const instante = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(instante);
}

// Dias corridos entre "hoje" e a data alvo, ambos em YYYY-MM-DD.
export function countdownDays(targetIso: string, todayIso: string): number {
  const diff = Date.parse(`${targetIso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`);
  return Math.round(diff / 86_400_000);
}

// Data de hoje no destino, em YYYY-MM-DD.
export function todayInTrip(timeZone: string = CANCUN_TZ, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
