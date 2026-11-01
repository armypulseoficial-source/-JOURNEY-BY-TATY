-- SmartTravel · setup do banco (ciclo 1)
-- Cole este arquivo inteiro no SQL Editor do projeto Supabase e clique em Run.
-- Ordem: núcleo (0001), convites (0002), bucket de vouchers e políticas (0003),
-- sincronização de perfis de autenticação (0004).

-- SmartTravel · Portal B2B · ciclo 1 · schema central e RLS.
-- Regra: em cada tabela, as políticas são criadas ANTES de
-- "enable row level security", na mesma migração.

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.organizations (
    id              uuid primary key default gen_random_uuid(),
    name            varchar(255) not null,
    slug            varchar(100) not null unique,
    logo_url        text,
    primary_color   varchar(7) default '#0F172A',
    secondary_color varchar(7) default '#4A5D4E',
    created_at      timestamptz not null default now()
);

create table public.users (
    id              uuid primary key references auth.users(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete set null,
    full_name       varchar(255) not null,
    email           varchar(255) not null unique,
    role            varchar(50) not null default 'traveler'
                    check (role in ('agency_admin', 'traveler')),
    avatar_url      text,
    created_at      timestamptz not null default now()
);

create table public.trips (
    id                  uuid primary key default gen_random_uuid(),
    organization_id     uuid not null references public.organizations(id) on delete cascade,
    title               varchar(255) not null,
    destination_city    varchar(100) not null,
    destination_country varchar(100) not null,
    start_date          date not null,
    end_date            date not null,
    budget_limit        numeric(12,2),
    base_currency       varchar(3) not null default 'USD',
    created_at          timestamptz not null default now(),
    constraint trips_dates_ordered check (end_date >= start_date)
);

create table public.trip_members (
    id         uuid primary key default gen_random_uuid(),
    trip_id    uuid not null references public.trips(id) on delete cascade,
    user_id    uuid not null references public.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint trip_members_unique unique (trip_id, user_id)
);

create table public.family_members (
    id                   uuid primary key default gen_random_uuid(),
    trip_id              uuid not null references public.trips(id) on delete cascade,
    user_id              uuid references public.users(id) on delete set null,
    name                 varchar(255) not null,
    relationship_role    varchar(50) not null,
    dietary_restrictions text,
    is_teen              boolean not null default false,
    created_at           timestamptz not null default now()
);

create table public.itinerary_items (
    id                 uuid primary key default gen_random_uuid(),
    trip_id            uuid not null references public.trips(id) on delete cascade,
    day_number         int not null,
    activity_date      date not null,
    title              varchar(255) not null,
    description        text,
    location_name      varchar(255),
    google_maps_url    text,
    start_time         time,
    end_time           time,
    pacing_type        varchar(20) check (pacing_type in ('intense', 'moderate', 'relaxed')),
    category           varchar(50),
    is_teen_highlight  boolean not null default false,
    created_at         timestamptz not null default now()
);

create table public.documents (
    id                    uuid primary key default gen_random_uuid(),
    trip_id               uuid not null references public.trips(id) on delete cascade,
    title                 varchar(255) not null,
    document_type         varchar(50) not null,
    file_url              text not null,
    is_offline_available  boolean not null default true,
    created_at            timestamptz not null default now()
);

-- Índices de chave estrangeira usados pelas políticas RLS.
create index trips_organization_id_idx on public.trips (organization_id);
create index users_organization_id_idx on public.users (organization_id);
create index trip_members_user_id_idx on public.trip_members (user_id);
create index family_members_trip_id_idx on public.family_members (trip_id);
create index itinerary_items_trip_id_idx on public.itinerary_items (trip_id);
create index documents_trip_id_idx on public.documents (trip_id);

-- ---------------------------------------------------------------------------
-- Privilégios de tabela (o RLS filtra as linhas; os grants liberam o acesso)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- users: o próprio usuário só altera o nome e o avatar. Papel e organização
-- nunca são alterados pelo cliente.
revoke update on public.users from authenticated;
grant update (full_name, avatar_url) on public.users to authenticated;

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer, search_path fixo, sem SQL dinâmico)
-- ---------------------------------------------------------------------------

-- Organização do usuário autenticado, somente se ele for agency_admin.
-- Usada nas políticas de organizations, users e trips, e evita recursão de RLS.
create or replace function public.current_agency_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select u.organization_id
    from public.users u
    where u.id = auth.uid()
      and u.role = 'agency_admin'
$$;

-- O usuário autenticado é agency_admin da organização dona da viagem.
create or replace function public.is_agency_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.trips t
        where t.id = p_trip_id
          and t.organization_id = public.current_agency_organization_id()
    )
$$;

-- O usuário autenticado está vinculado à viagem em trip_members.
create or replace function public.is_trip_traveler(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.trip_members tm
        where tm.trip_id = p_trip_id
          and tm.user_id = auth.uid()
    )
$$;

revoke execute on function public.current_agency_organization_id() from public;
revoke execute on function public.is_agency_member(uuid) from public;
revoke execute on function public.is_trip_traveler(uuid) from public;
grant execute on function public.current_agency_organization_id() to authenticated;
grant execute on function public.is_agency_member(uuid) to authenticated;
grant execute on function public.is_trip_traveler(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: políticas primeiro, depois enable, em cada tabela.
-- Política com "using (false)" ou "with check (false)" é deny explícito.
-- ---------------------------------------------------------------------------

-- organizations: a agência vê e edita só a própria. Criação e remoção
-- ficam fora do cliente (onboarding e admin via service role).
create policy organizations_select on public.organizations for select to authenticated
    using (id = public.current_agency_organization_id());
create policy organizations_insert on public.organizations for insert to authenticated
    with check (false);
create policy organizations_update on public.organizations for update to authenticated
    using (id = public.current_agency_organization_id())
    with check (id = public.current_agency_organization_id());
create policy organizations_delete on public.organizations for delete to authenticated
    using (false);
alter table public.organizations enable row level security;

-- users: cada um vê o próprio registro; agency_admin vê os usuários da
-- própria organização. Só o próprio registro pode ser alterado (colunas
-- liberadas acima).
create policy users_select on public.users for select to authenticated
    using (
        id = auth.uid()
        or (organization_id is not null
            and organization_id = public.current_agency_organization_id())
    );
create policy users_insert on public.users for insert to authenticated
    with check (false);
create policy users_update on public.users for update to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
create policy users_delete on public.users for delete to authenticated
    using (false);
alter table public.users enable row level security;

-- trips: agency_admin da organização: tudo. Traveler vinculado: só leitura.
create policy trips_select on public.trips for select to authenticated
    using (public.is_agency_member(id) or public.is_trip_traveler(id));
create policy trips_insert on public.trips for insert to authenticated
    with check (organization_id = public.current_agency_organization_id());
create policy trips_update on public.trips for update to authenticated
    using (public.is_agency_member(id))
    with check (organization_id = public.current_agency_organization_id());
create policy trips_delete on public.trips for delete to authenticated
    using (public.is_agency_member(id));
alter table public.trips enable row level security;

-- trip_members: só a agência escreve. O traveler lê o próprio vínculo.
create policy trip_members_select on public.trip_members for select to authenticated
    using (user_id = auth.uid() or public.is_agency_member(trip_id));
create policy trip_members_insert on public.trip_members for insert to authenticated
    with check (public.is_agency_member(trip_id));
create policy trip_members_update on public.trip_members for update to authenticated
    using (public.is_agency_member(trip_id))
    with check (public.is_agency_member(trip_id));
create policy trip_members_delete on public.trip_members for delete to authenticated
    using (public.is_agency_member(trip_id));
alter table public.trip_members enable row level security;

-- family_members: agência escreve; traveler vinculado lê.
create policy family_members_select on public.family_members for select to authenticated
    using (public.is_agency_member(trip_id) or public.is_trip_traveler(trip_id));
create policy family_members_insert on public.family_members for insert to authenticated
    with check (public.is_agency_member(trip_id));
create policy family_members_update on public.family_members for update to authenticated
    using (public.is_agency_member(trip_id))
    with check (public.is_agency_member(trip_id));
create policy family_members_delete on public.family_members for delete to authenticated
    using (public.is_agency_member(trip_id));
alter table public.family_members enable row level security;

-- itinerary_items: agência escreve; traveler vinculado lê.
create policy itinerary_items_select on public.itinerary_items for select to authenticated
    using (public.is_agency_member(trip_id) or public.is_trip_traveler(trip_id));
create policy itinerary_items_insert on public.itinerary_items for insert to authenticated
    with check (public.is_agency_member(trip_id));
create policy itinerary_items_update on public.itinerary_items for update to authenticated
    using (public.is_agency_member(trip_id))
    with check (public.is_agency_member(trip_id));
create policy itinerary_items_delete on public.itinerary_items for delete to authenticated
    using (public.is_agency_member(trip_id));
alter table public.itinerary_items enable row level security;

-- documents: agência escreve; traveler vinculado lê.
create policy documents_select on public.documents for select to authenticated
    using (public.is_agency_member(trip_id) or public.is_trip_traveler(trip_id));
create policy documents_insert on public.documents for insert to authenticated
    with check (public.is_agency_member(trip_id));
create policy documents_update on public.documents for update to authenticated
    using (public.is_agency_member(trip_id))
    with check (public.is_agency_member(trip_id));
create policy documents_delete on public.documents for delete to authenticated
    using (public.is_agency_member(trip_id));
alter table public.documents enable row level security;

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

-- Bucket privado de vouchers e políticas de acesso por viagem.
-- Caminho dos arquivos: {trip_id}/{uuid}.pdf. A primeira pasta é o id da viagem.
--
-- ATENÇÃO: estas políticas usam storage.objects do Supabase Storage. Não rodam
-- no teste de banco local (scripts/test-rls.mjs). Verificar no projeto real
-- antes de liberar a viagem.

insert into storage.buckets (id, name, public)
values ('vouchers-pdf', 'vouchers-pdf', false)
on conflict (id) do nothing;

create policy vouchers_agency_all on storage.objects
    for all to authenticated
    using (
        bucket_id = 'vouchers-pdf'
        and public.is_agency_member(((storage.foldername(name))[1])::uuid)
    )
    with check (
        bucket_id = 'vouchers-pdf'
        and public.is_agency_member(((storage.foldername(name))[1])::uuid)
    );

create policy vouchers_traveler_select on storage.objects
    for select to authenticated
    using (
        bucket_id = 'vouchers-pdf'
        and public.is_trip_traveler(((storage.foldername(name))[1])::uuid)
    );

-- Sincronização de usuários do Supabase Auth (migração 0004).
create or replace function public.handle_new_user()
returns trigger as $$
begin
    if new.email is null then
        return new;
    end if;

    insert into public.users (id, email, full_name)
    values (new.id, new.email, coalesce(new.user_metadata->>'full_name', new.email))
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer set search_path = '';

insert into public.users (id, email, full_name)
select id, email, coalesce(user_metadata->>'full_name', email)
from auth.users
where email is not null
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
