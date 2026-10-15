'use client';

import { useState, type FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { uploadDocument, MAX_UPLOAD_BYTES } from '@/lib/documents/upload';

const MENSAGENS: Record<string, string> = {
  too_large: 'Arquivo acima de 25 MB. Envie uma versão menor do PDF.',
};

export function UploadForm({ tripId }: { tripId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    const offline = form.get('offline') === 'on';
    if (!(file instanceof File) || file.size === 0) {
      setErro('Escolha um arquivo PDF.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setErro(MENSAGENS.too_large);
      return;
    }

    setEnviando(true);
    try {
      await uploadDocument(createSupabaseBrowserClient(), tripId, file, offline);
      event.currentTarget.reset();
      window.location.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setErro(MENSAGENS[msg] ?? 'Não foi possível enviar o arquivo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar}>
      <input name="file" type="file" accept="application/pdf" required />
      <label>
        <input name="offline" type="checkbox" defaultChecked /> Disponível offline
      </label>
      <button type="submit" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar voucher'}
      </button>
      {erro && <p role="alert">{erro}</p>}
    </form>
  );
}
