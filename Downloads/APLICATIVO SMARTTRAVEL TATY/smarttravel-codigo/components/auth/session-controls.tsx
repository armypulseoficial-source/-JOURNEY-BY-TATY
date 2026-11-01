'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clearPrivateOfflineData } from '@/lib/offline/clear-private-data';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import styles from './session-controls.module.css';

const USER_STORAGE_KEY = 'smarttravel:offline-user';

export function SessionControls() {
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const cleanupInProgress = useRef<Promise<void> | null>(null);

  const limparDadosOffline = useCallback((): Promise<void> => {
    if (!cleanupInProgress.current) {
      cleanupInProgress.current = clearPrivateOfflineData().finally(() => {
        cleanupInProgress.current = null;
      });
    }
    return cleanupInProgress.current;
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null;

      try {
        const previousUserId = localStorage.getItem(USER_STORAGE_KEY);
        const mustClear = !userId || userId !== previousUserId || event === 'SIGNED_OUT';
        if (mustClear) {
          void limparDadosOffline().catch((cause: unknown) => {
            console.error('Não foi possível limpar os dados offline privados.', cause);
          });
        }

        if (userId) localStorage.setItem(USER_STORAGE_KEY, userId);
        else localStorage.removeItem(USER_STORAGE_KEY);
      } catch (cause) {
        console.error('Não foi possível atualizar a sessão offline.', cause);
        void limparDadosOffline().catch((clearCause: unknown) => {
          console.error('Não foi possível limpar os dados offline privados.', clearCause);
        });
      }

      setAuthenticated(userId !== null);
      setError(null);
    });

    return () => subscription.unsubscribe();
  }, [limparDadosOffline]);

  async function sair() {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      try {
        await limparDadosOffline();
      } catch (cause) {
        console.error('Não foi possível limpar os dados offline privados ao sair.', cause);
        window.location.replace('/login?erro=offline-cleanup');
        return;
      }

      try {
        localStorage.removeItem(USER_STORAGE_KEY);
      } catch (cause) {
        console.error('Não foi possível remover a identificação offline da sessão.', cause);
      }
      window.location.replace('/login');
    } catch (cause) {
      console.error('Não foi possível encerrar a sessão.', cause);
      setError('Não foi possível encerrar a sessão. Tente novamente quando estiver online.');
      setSigningOut(false);
    }
  }

  if (!authenticated && !signingOut) return null;

  return (
    <>
      {authenticated && (
        <div className={styles.controls}>
          <button type="button" onClick={sair} disabled={signingOut} className={styles.button}>
            {signingOut ? 'Saindo…' : 'Sair'}
          </button>
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </div>
      )}
      {signingOut && (
        <div className={styles.logoutOverlay} role="status" aria-live="polite">
          Encerrando sessão e removendo dados privados…
        </div>
      )}
    </>
  );
}
