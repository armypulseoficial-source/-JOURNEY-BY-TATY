import { redirect } from 'next/navigation';

// O app não tem página pública de entrada: quem chega na raiz vai para o login.
export default function Home() {
  redirect('/login');
}
