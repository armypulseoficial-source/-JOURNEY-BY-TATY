import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../supabase/server';

export type Role = 'agency_admin' | 'traveler';

export type CurrentUser = {
  id: string;
  role: Role;
  organizationId: string | null;
};

// Resolve o usuário autenticado a partir de um cliente já criado.
// Usa getUser() (valida o JWT no Supabase), e não getSession() (lê só o cookie).
// Quem protege a linha de users é a RLS: o cliente só enxerga o próprio registro.
export async function loadCurrentUser(supabase: SupabaseClient): Promise<CurrentUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: row, error: rowError } = await supabase
    .from('users')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (rowError || !row) return null;

  return {
    id: row.id,
    role: row.role,
    organizationId: row.organization_id,
  };
}

// Usado por Server Components e Route Handlers.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  return loadCurrentUser(supabase);
}
