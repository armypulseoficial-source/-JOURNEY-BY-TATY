-- Testes de convites (ciclo 1). Casos (g) a (j).
-- Fixtures próprias, porque cada arquivo roda em transação separada.
-- Execução: npm run test:db (scripts/test-rls.mjs).

\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
    ('a1000000-0000-0000-0000-000000000001', 'admin-a@convite.local'),
    ('b1000000-0000-0000-0000-000000000001', 'admin-b@convite.local'),
    ('e1000000-0000-0000-0000-000000000001', 'familia@convite.local');

insert into public.organizations (id, name, slug) values
    ('11000000-0000-0000-0000-00000000000a', 'Agência A', 'convite-a'),
    ('11000000-0000-0000-0000-00000000000b', 'Agência B', 'convite-b');

insert into public.users (id, organization_id, full_name, email, role) values
    ('a1000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-00000000000a', 'Consultora A', 'admin-a@convite.local', 'agency_admin'),
    ('b1000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-00000000000b', 'Consultora B', 'admin-b@convite.local', 'agency_admin'),
    ('e1000000-0000-0000-0000-000000000001', null, 'Família', 'familia@convite.local', 'traveler');

insert into public.trips (id, organization_id, title, destination_city, destination_country, start_date, end_date) values
    ('21000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-00000000000a', 'Cancún · Convite A', 'Cancún', 'México', '2026-12-05', '2026-12-15');

insert into public.trip_invites (id, trip_id, token_hash, expires_at, used_at, created_by) values
    ('31000000-0000-0000-0000-00000000000a', '21000000-0000-0000-0000-00000000000a',
     encode(sha256(convert_to('token-valido', 'UTF8')), 'hex'), now() + interval '7 days', null, 'a1000000-0000-0000-0000-000000000001'),
    ('31000000-0000-0000-0000-00000000000b', '21000000-0000-0000-0000-00000000000a',
     encode(sha256(convert_to('token-usado', 'UTF8')), 'hex'), now() + interval '7 days', now(), 'a1000000-0000-0000-0000-000000000001'),
    ('31000000-0000-0000-0000-00000000000c', '21000000-0000-0000-0000-00000000000a',
     encode(sha256(convert_to('token-expirado', 'UTF8')), 'hex'), now() - interval '1 day', null, 'a1000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------------
-- (g) convite válido vira vínculo do traveler
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', false);

do $$
declare
    trip uuid;
    n int;
begin
    trip := public.accept_invite('token-valido');
    if trip <> '21000000-0000-0000-0000-00000000000a' then
        raise exception 'FAIL (g): accept_invite retornou viagem errada (%)', trip;
    end if;
    select count(*) into n from public.trip_members
    where trip_id = trip and user_id = 'e1000000-0000-0000-0000-000000000001';
    if n <> 1 then
        raise exception 'FAIL (g): vínculo não foi criado (linhas=%)', n;
    end if;
    raise notice 'PASS (g): convite válido vira vínculo do traveler';
end
$$;

-- ---------------------------------------------------------------------------
-- (h) convite já usado é recusado com motivo "used"
-- ---------------------------------------------------------------------------
do $$
begin
    perform public.accept_invite('token-usado');
    raise exception 'FAIL (h): convite usado foi aceito';
exception when others then
    if sqlerrm = 'used' then
        raise notice 'PASS (h): convite usado é recusado (used)';
    elsif sqlerrm like 'FAIL%' then
        raise;
    else
        raise exception 'FAIL (h): erro inesperado: %', sqlerrm;
    end if;
end
$$;

-- ---------------------------------------------------------------------------
-- (i) convite expirado é recusado com motivo "expired"
-- ---------------------------------------------------------------------------
do $$
begin
    perform public.accept_invite('token-expirado');
    raise exception 'FAIL (i): convite expirado foi aceito';
exception when others then
    if sqlerrm = 'expired' then
        raise notice 'PASS (i): convite expirado é recusado (expired)';
    elsif sqlerrm like 'FAIL%' then
        raise;
    else
        raise exception 'FAIL (i): erro inesperado: %', sqlerrm;
    end if;
end
$$;

-- ---------------------------------------------------------------------------
-- (j) consultora de outra agência não cria convite para viagem alheia
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', false);

do $$
begin
    insert into public.trip_invites (trip_id, token_hash, expires_at, created_by)
    values ('21000000-0000-0000-0000-00000000000a', 'hash-intruso', now() + interval '1 day', 'b1000000-0000-0000-0000-000000000001');
    raise exception 'FAIL (j): agência B criou convite para viagem da agência A';
exception when insufficient_privilege or others then
    if sqlerrm like 'FAIL%' then
        raise;
    end if;
    raise notice 'PASS (j): agência B não cria convite para viagem alheia';
end
$$;

reset role;
rollback;
