import { Suspense } from 'react';
import { safeNext } from '../../lib/auth/access';
import { LoginForm } from './login-form';
import styles from './login.module.css';

type Props = {
  searchParams: Promise<{ next?: string; erro?: string }>;
};

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Entrar</h1>
      <p className={styles.lead}>
        Enviaremos um link de acesso para o seu e-mail. Não é preciso senha.
      </p>
      {/* Lê a query string: fica atrás de Suspense por causa de cacheComponents. */}
      <Suspense fallback={null}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginContent({ searchParams }: Props) {
  const { next, erro } = await searchParams;
  return (
    <>
      {erro === 'link' && (
        <p role="alert" className={styles.alert}>
          Este link não é válido ou já expirou. Peça um novo abaixo.
        </p>
      )}
      {erro === 'offline-cleanup' && (
        <p role="alert" className={styles.alert}>
          A sessão foi encerrada, mas não foi possível confirmar a remoção dos dados salvos neste dispositivo.
          Feche as outras abas do SmartTravel e tente limpar os dados do site nas configurações do navegador.
        </p>
      )}
      <LoginForm next={safeNext(next)} />
    </>
  );
}
