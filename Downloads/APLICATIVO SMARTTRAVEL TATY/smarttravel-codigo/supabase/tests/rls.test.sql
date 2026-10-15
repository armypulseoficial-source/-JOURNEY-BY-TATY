-- Testes de RLS do ciclo 1 (SmartTravel portal B2B).
--
-- AMBIENTE: Postgres 16 real (não pgTAP, não PGlite). Motivo: o Postgres real
-- tem o comportamento de RLS que vai para produção. Não há Supabase CLI nem
-- pgTAP instalados. O shim de auth (supabase/tests/auth_shim.sql) replica
-- auth.uid() e os papéis anon/authenticated. A sessão de cada caso assume o
-- papel "authenticated" com set role e fixa o JWT com
-- set_config('request.jwt.claim.sub', ...).
--
-- Execução: npm run test:db (scripts/test-rls.mjs), que sobe e derruba o próprio cluster.

\set ON_ERROR_STOP on
begin;

-- ---------------------------------------------------------------------------
-- Fixtures (como superusuário, sem RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
    ('a0000000-0000-0000-0000-000000000001', 'admin-a@teste.local'),
    ('b0000000-0000-0000-0000-000000000001', 'admin-b@teste.local'),
    ('c0000000-0000-0000-0000-000000000001', 'familia@teste.local'),
    ('d0000000-0000-0000-0000-000000000001', 'sem-vinculo@teste.local');

insert into public.organizations (id, name, slug) values
    ('10000000-0000-0000-0000-00000000000a', 'Agência A', 'agencia-a'),
    ('10000000-0000-0000-0000-00000000000b', 'Agência B', 'agencia-b');

insert into public.users (id, organization_id, full_name, email, role) values
    ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', 'Consultora A', 'admin-a@teste.local', 'agency_admin'),
    ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000b', 'Consultora B', 'admin-b@teste.local', 'agency_admin'),
    ('c0000000-0000-0000-0000-000000000001', null, 'Família', 'familia@teste.local', 'traveler'),
    ('d0000000-0000-0000-0000-000000000001', null, 'Sem vínculo', 'sem-vinculo@teste.local', 'traveler');

insert into public.trips (id, organization_id, title, destination_city, destination_country, start_date, end_date) values
    ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Cancún · Agência A', 'Cancún', 'México', '2026-12-05', '2026-12-15'),
    ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Viagem · Agência B', 'Lisboa', 'Portugal', '2026-12-05', '2026-12-15');

-- A família (traveler) está vinculada só à viagem da agência A.
insert into public.trip_members (trip_id, user_id) values
    ('20000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001');

insert into public.itinerary_items (id, trip_id, day_number, activity_date, title, pacing_type, category) values
    ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 2, '2026-12-06', 'Atividade original A', 'intense', 'Esporte');

-- ---------------------------------------------------------------------------
-- (a) agency_admin da agência A vê a viagem da A e NÃO vê a da B
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);

do $$
declare
    n int;
begin
    select count(*) into n from public.trips where id = '20000000-0000-0000-0000-00000000000a';
    if n <> 1 then
        raise exception 'FAIL (a): agência A não vê a própria viagem (linhas=%)', n;
    end if;

    select count(*) into n from public.trips where id = '20000000-0000-0000-0000-00000000000b';
    if n <> 0 then
        raise exception 'FAIL (a): agência A vê a viagem da agência B (linhas=%)', n;
    end if;

    raise notice 'PASS (a): agency_admin da agência A vê a viagem da A e não vê a da B';
end
$$;

-- ---------------------------------------------------------------------------
-- (b) traveler vinculado vê a viagem e NÃO consegue UPDATE em itinerary_items
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', false);

do $$
declare
    n int;
begin
    select count(*) into n from public.trips where id = '20000000-0000-0000-0000-00000000000a';
    if n <> 1 then
        raise exception 'FAIL (b): traveler vinculado não vê a viagem (linhas=%)', n;
    end if;

    select count(*) into n from public.trips where id = '20000000-0000-0000-0000-00000000000b';
    if n <> 0 then
        raise exception 'FAIL (b): traveler vê viagem à qual não está vinculado (linhas=%)', n;
    end if;

    update public.itinerary_items
       set title = 'Alterado pela família'
     where id = '30000000-0000-0000-0000-00000000000a';
    get diagnostics n = row_count;
    if n <> 0 then
        raise exception 'FAIL (b): traveler conseguiu UPDATE em itinerary_items (linhas=%)', n;
    end if;

    begin
        insert into public.itinerary_items (trip_id, day_number, activity_date, title)
        values ('20000000-0000-0000-0000-00000000000a', 3, '2026-12-07', 'Inserção pela família');
        raise exception 'FAIL (b): traveler conseguiu INSERT em itinerary_items';
    exception when insufficient_privilege then
        null; -- esperado: violação de RLS
    end;

    raise notice 'PASS (b): traveler vinculado vê a viagem e não altera itinerary_items (UPDATE afetou 0 linhas)';
end
$$;

-- ---------------------------------------------------------------------------
-- (c) usuário sem vínculo recebe zero linhas em trips
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000001', false);

do $$
declare
    n int;
begin
    select count(*) into n from public.trips;
    if n <> 0 then
        raise exception 'FAIL (c): usuário sem vínculo vê % viagem(ns)', n;
    end if;

    select count(*) into n from public.itinerary_items;
    if n <> 0 then
        raise exception 'FAIL (c): usuário sem vínculo vê % item(ns) de roteiro', n;
    end if;

    raise notice 'PASS (c): usuário sem vínculo recebe zero linhas em trips';
end
$$;

-- ---------------------------------------------------------------------------
-- (d) traveler vinculado não escreve em trip_members (INSERT/UPDATE/DELETE)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', false);

do $$
declare
    n int;
begin
    begin
        insert into public.trip_members (trip_id, user_id)
        values ('20000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001');
        raise exception 'FAIL (d): traveler conseguiu INSERT em trip_members';
    exception when insufficient_privilege then
        null; -- esperado: violação de RLS
    end;

    update public.trip_members
       set created_at = now()
     where trip_id = '20000000-0000-0000-0000-00000000000a'
       and user_id = 'c0000000-0000-0000-0000-000000000001';
    get diagnostics n = row_count;
    if n <> 0 then
        raise exception 'FAIL (d): traveler conseguiu UPDATE em trip_members (linhas=%)', n;
    end if;

    delete from public.trip_members
     where trip_id = '20000000-0000-0000-0000-00000000000a';
    get diagnostics n = row_count;
    if n <> 0 then
        raise exception 'FAIL (d): traveler conseguiu DELETE em trip_members (linhas=%)', n;
    end if;

    raise notice 'PASS (d): traveler não escreve em trip_members (INSERT/UPDATE/DELETE bloqueados)';
end
$$;

-- ---------------------------------------------------------------------------
-- (e) INSERT e DELETE em organizations e users são negados ao cliente
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);

do $$
declare
    n int;
begin
    begin
        insert into public.organizations (name, slug) values ('Agência Intrusa', 'agencia-intrusa');
        raise exception 'FAIL (e): agency_admin conseguiu INSERT em organizations';
    exception when insufficient_privilege then
        null;
    end;

    delete from public.organizations where id = '10000000-0000-0000-0000-00000000000a';
    get diagnostics n = row_count;
    if n <> 0 then
        raise exception 'FAIL (e): agency_admin conseguiu DELETE em organizations (linhas=%)', n;
    end if;

    begin
        insert into public.users (id, full_name, email, role)
        values ('e0000000-0000-0000-0000-000000000001', 'Intruso', 'intruso@teste.local', 'agency_admin');
        raise exception 'FAIL (e): agency_admin conseguiu INSERT em users';
    exception when insufficient_privilege then
        null;
    end;

    -- Próprio registro (visível pelo SELECT), para que só a política de DELETE decida.
    delete from public.users where id = 'a0000000-0000-0000-0000-000000000001';
    get diagnostics n = row_count;
    if n <> 0 then
        raise exception 'FAIL (e): agency_admin conseguiu DELETE do próprio registro em users (linhas=%)', n;
    end if;

    raise notice 'PASS (e): INSERT e DELETE em organizations e users são negados ao cliente';
end
$$;

-- ---------------------------------------------------------------------------
-- (f) UPDATE em users não altera role nem organization_id
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);

do $$
declare
    n int;
begin
    -- controle positivo: o próprio nome pode ser alterado (senão o teste seria vazio)
    update public.users
       set full_name = 'Consultora A (editada)'
     where id = 'a0000000-0000-0000-0000-000000000001';
    get diagnostics n = row_count;
    if n <> 1 then
        raise exception 'FAIL (f): agency_admin não conseguiu alterar o próprio nome (linhas=%)', n;
    end if;

    begin
        update public.users set role = 'traveler' where id = 'a0000000-0000-0000-0000-000000000001';
        raise exception 'FAIL (f): agency_admin conseguiu alterar o próprio role';
    exception when insufficient_privilege then
        null;
    end;

    begin
        update public.users set organization_id = '10000000-0000-0000-0000-00000000000b'
         where id = 'a0000000-0000-0000-0000-000000000001';
        raise exception 'FAIL (f): agency_admin conseguiu alterar a própria organization_id';
    exception when insufficient_privilege then
        null;
    end;

    raise notice 'PASS (f): UPDATE em users altera nome, mas não role nor organization_id';
end
$$;

select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', false);

do $$
begin
    begin
        update public.users set role = 'agency_admin' where id = 'c0000000-0000-0000-0000-000000000001';
        raise exception 'FAIL (f): traveler conseguiu promover o próprio role';
    exception when insufficient_privilege then
        null;
    end;
end
$$;

-- ---------------------------------------------------------------------------
-- Verificação final como superusuário: nenhuma escrita indevida persistiu.
-- ---------------------------------------------------------------------------
reset role;

do $$
declare
    t text;
    r text;
    o uuid;
    n int;
begin
    select title into t from public.itinerary_items where id = '30000000-0000-0000-0000-00000000000a';
    if t <> 'Atividade original A' then
        raise exception 'FAIL (b): título foi alterado por traveler: %', t;
    end if;

    select count(*) into n from public.trip_members
     where trip_id = '20000000-0000-0000-0000-00000000000a'
       and user_id = 'c0000000-0000-0000-0000-000000000001';
    if n <> 1 then
        raise exception 'FAIL (d): vínculo da família foi alterado ou removido (linhas=%)', n;
    end if;

    select count(*) into n from public.organizations;
    if n <> 2 then
        raise exception 'FAIL (e): organização removida ou inserida indevidamente (total=%)', n;
    end if;

    select count(*) into n from public.users where id in (
        'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001');
    if n <> 1 then
        raise exception 'FAIL (e): usuário removido ou inserido indevidamente (linhas=%)', n;
    end if;

    select role, organization_id into r, o from public.users where id = 'a0000000-0000-0000-0000-000000000001';
    if r is distinct from 'agency_admin' or o is distinct from '10000000-0000-0000-0000-00000000000a' then
        raise exception 'FAIL (f): role ou organization_id do agency_admin foi alterado ou removido (role=%, org=%)', r, o;
    end if;

    select role into r from public.users where id = 'c0000000-0000-0000-0000-000000000001';
    if r is distinct from 'traveler' then
        raise exception 'FAIL (f): role do traveler foi alterado (role=%)', r;
    end if;
end
$$;

rollback;
