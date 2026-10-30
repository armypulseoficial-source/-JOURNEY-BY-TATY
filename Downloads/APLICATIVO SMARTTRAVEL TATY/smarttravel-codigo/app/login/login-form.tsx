'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabase/browser';
import styles from './login.module.css';

type Estado = 'parado' | 'enviando' | 'enviado' | 'erro' | 'teste';

// FIXED: Modo Teste: Bypassa autenticação por email para testes locais
// Usuários disponíveis: Taty, Gabi Diniz, Heitor Sky

const TEST_USERS = [
  { id: '10000000-0000-0000-0000-000000000001', nome: 'Taty (Teste)', email: 'teste.taty@example.com' },
  { id: '10000000-0000-0000-0000-000000000002', nome: 'Gabi Diniz', email: 'gabi.diniz.medeiros@gmail.com' },
  { id: '10000000-0000-0000-0000-000000000003', nome: 'Heitor Sky', email: 'heitorsky@gmail.com' },
];

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<Estado>('parado');
  const [testMode, setTestMode] = useState(false);

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

  function loginAsTestUser(userId: string) {
    sessionStorage.setItem('test_user_id', userId);
    router.push(next || '/dashboard');
  }

  if (estado === 'enviado') {
    return (
      <p role="status" className={styles.status}>
        Se o e-mail estiver cadastrado, você receberá um link de acesso em instantes.
      </p>
    );
  }

  return (
    <div className={styles.container}>
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

      <div className={styles.divider}>ou</div>

      <div className={styles.testSection}>
        <button
          type="button"
          onClick={() => setTestMode(!testMode)}
          className={styles.testToggle}
          aria-expanded={testMode}
        >
          {testMode ? '✓ Modo Teste Ativo' : '+ Entrar em Modo Teste'}
        </button>

        {testMode && (
          <div className={styles.testUsers}>
            <p className={styles.testLabel}>Selecione um usuário de teste:</p>
            {TEST_USERS.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => loginAsTestUser(user.id)}
                className={styles.testUserButton}
              >
                {user.nome}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
