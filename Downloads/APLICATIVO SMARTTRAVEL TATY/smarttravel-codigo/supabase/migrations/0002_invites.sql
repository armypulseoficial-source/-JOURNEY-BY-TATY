-- Convites de viagem (lacuna da spec: a tabela não estava no modelo do ciclo 1).
-- O token nunca é guardado em claro: só o SHA-256 em hex.
-- O cliente não lê a tabela; aceitar convite passa pela função accept_invite.

create table public.trip_invites (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index trip_invites_trip_id_idx on public.trip_invites (trip_id);

-- Políticas criadas antes de habilitar a RLS.
-- Só a consultora da agência da viagem vê e cria convites.
create policy trip_invites_select on public.trip_invites
    for select to authenticated
    using (public.is_agency_member(trip_id));

create policy trip_invites_insert on public.trip_invites
    for insert to authenticated
    with check (public.is_agency_member(trip_id) and created_by = auth.uid());

create policy trip_invites_delete on public.trip_invites
    for delete to authenticated
    using (public.is_agency_member(trip_id));

alter table public.trip_invites enable row level security;

grant select, insert, delete on public.trip_invites to authenticated;

-- Aceitar convite: roda como dono da função (ignora RLS só para vincular o usuário).
-- Erros possíveis: not_authenticated, invalid, used, expired.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_invite public.trip_invites%rowtype;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    select * into v_invite
    from public.trip_invites
    where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    for update;

    if not found then
        raise exception 'invalid';
    end if;
    if v_invite.used_at is not null then
        raise exception 'used';
    end if;
    if v_invite.expires_at < now() then
        raise exception 'expired';
    end if;

    insert into public.trip_members (trip_id, user_id)
    values (v_invite.trip_id, auth.uid())
    on conflict (trip_id, user_id) do nothing;

    update public.trip_invites set used_at = now() where id = v_invite.id;

    return v_invite.trip_id;
end;
$$;

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;
