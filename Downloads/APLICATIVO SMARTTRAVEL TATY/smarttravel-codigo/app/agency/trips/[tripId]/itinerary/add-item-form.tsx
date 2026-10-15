'use client';

import { useState, type FormEvent } from 'react';

export function AddItemForm({
  tripId,
  dayNumber,
  activityDate,
}: {
  tripId: string;
  dayNumber: number;
  activityDate: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    const form = new FormData(event.currentTarget);

    const res = await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        dayNumber,
        activityDate,
        title: form.get('title'),
        category: form.get('category'),
        pacingType: form.get('pacingType') || null,
      }),
    });

    setEnviando(false);
    if (res.ok) {
      event.currentTarget.reset();
      window.location.reload();
      return;
    }
    const body = await res.json().catch(() => ({}));
    setErro(body.reason ?? 'Não foi possível salvar o item.');
  }

  return (
    <form onSubmit={enviar}>
      <label>
        Atividade
        <input name="title" required />
      </label>
      <label>
        Categoria
        <select name="category" defaultValue="Atração">
          <option>Atração</option>
          <option>Gastronomia</option>
          <option>Compras</option>
          <option>Esporte</option>
        </select>
      </label>
      <label>
        Ritmo
        <select name="pacingType" defaultValue="">
          <option value="">—</option>
          <option value="intense">Intenso</option>
          <option value="moderate">Moderado</option>
          <option value="relaxed">Relaxado</option>
        </select>
      </label>
      <button type="submit" disabled={enviando}>
        {enviando ? 'Salvando…' : 'Adicionar'}
      </button>
      {erro && <p role="alert">{erro}</p>}
    </form>
  );
}
