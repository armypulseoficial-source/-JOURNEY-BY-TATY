-- Shim de Supabase Auth para o banco de teste local. NÃO é aplicado em produção.
-- Replica só o que as políticas usam: schema auth, auth.users, auth.uid(),
-- e os papéis anon/authenticated. O JWT é simulado por
-- set_config('request.jwt.claim.sub', '<uuid>', false), que é o mesmo GUC que o
-- Supabase usa.

create schema if not exists auth;

create table if not exists auth.users (
    id uuid primary key,
    email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
    end if;
end
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;

-- Shim mínimo do Supabase Storage: só o necessário para a migração 0003 compilar.
-- O comportamento real de storage.objects NÃO é testado aqui (ver a migração).
create schema if not exists storage;

create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false
);

create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name text
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql immutable
as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$$;

grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
