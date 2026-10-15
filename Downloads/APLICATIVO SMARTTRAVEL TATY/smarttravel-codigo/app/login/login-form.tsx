'use client';

import { useState, type FormEvent } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase/browser';
import styles from './login.module.css';

type Estado = 'parado' | 'enviando' | 'enviado' | 'erro';

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<Estado>('parado');

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstado('enviando');
    try {
      const supabase = createSupabaseBrowserClient();
      const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callback },
      });
      setEstado(error ? 'erro' : 'enviado');
    } catch {
      setEstado('erro');
    }
  }

  // Mesma mensagem para e-mail cadastrado ou não, para não revelar quem tem conta.
  if (estado === 'enviado') {
    return (
      <p role="status" className={styles.status}>
        Se o e-mail estiver cadastrado, você receberá um link de acesso em instantes.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className={styles.form}>
      <label htmlFor="email" className={styles.label}>
        E-mail
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={styles.input}
      />
      <button type="submit" disabled={estado === 'enviando'} className={styles.button}>
        {estado === 'enviando' ? 'Enviando…' : 'Enviar link de acesso'}
      </button>
      {estado === 'erro' && (
        <p role="alert" className={styles.alert}>
          Não foi possível enviar o link agora. Tente de novo em instantes.
        </p>
      )}
    </form>
  );
}
