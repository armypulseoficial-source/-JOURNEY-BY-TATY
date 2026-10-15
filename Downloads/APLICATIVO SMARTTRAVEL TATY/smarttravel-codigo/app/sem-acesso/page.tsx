import Link from 'next/link';
import styles from '../login/login.module.css';

// Página neutra para papel sem permissão. Não mostra dados nem detalhes da conta.
export default function SemAcesso() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Acesso indisponível</h1>
      <p className={styles.lead}>
        Esta área não está disponível para este acesso. Se você recebeu um link novo, use-o.
        Caso contrário, fale com a agência.
      </p>
      <Link href="/login" className={styles.button}>
        Entrar com outro e-mail
      </Link>
    </main>
  );
}
