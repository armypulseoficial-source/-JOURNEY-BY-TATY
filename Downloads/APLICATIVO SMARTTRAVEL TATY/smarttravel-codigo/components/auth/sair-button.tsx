'use client';

import type { FormEvent } from 'react';
import { limparDadosLocais } from '@/lib/offline/limpar';

// Sair apaga a cópia local (vouchers e páginas) antes de encerrar a sessão.
export function SairButton() {
  async function sair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await limparDadosLocais();
    form.submit();
  }

  return (
    <form method="post" action="/auth/signout" onSubmit={sair}>
      <button type="submit">Sair</button>
    </form>
  );
}
