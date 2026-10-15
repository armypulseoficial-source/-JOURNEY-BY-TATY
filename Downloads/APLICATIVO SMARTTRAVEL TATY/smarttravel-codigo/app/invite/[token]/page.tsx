import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { acceptInvite, type InviteFailure } from '@/lib/invites/token';

export const instant = false;

type Props = { params: Promise<{ token: string }> };

const MENSAGENS: Record<InviteFailure, string> = {
  expired: 'Este convite expirou. Peça um novo à sua consultora.',
  used: 'Este convite já foi usado. Se você já entrou, acesse a viagem pelo seu login.',
  invalid: 'Convite inválido. Confira o link que você recebeu.',
  not_authenticated: 'Entre com seu e-mail para abrir o convite.',
};

async function AceitarConvite({ token }: { token: string }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const supabase = await createSupabaseServerClient();
  const r = await acceptInvite(supabase, token);

  if (r.ok) redirect(`/trip/${r.tripId}`);
  return <p role="alert">{MENSAGENS[r.reason]}</p>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  return (
    <main>
      <Suspense fallback={<p>Abrindo convite…</p>}>
        <AceitarConvite token={token} />
      </Suspense>
    </main>
  );
}
