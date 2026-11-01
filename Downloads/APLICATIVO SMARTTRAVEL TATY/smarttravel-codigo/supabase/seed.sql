-- Dados de demonstração para desenvolvimento. Não é uma migração de produção.
do $$
declare
    v_organization_id uuid;
    v_trip_id uuid;
begin
    insert into public.organizations (name, slug, primary_color, secondary_color)
    values ('ARMY Pulse', 'army-pulse', '#7c3aed', '#4f46e5')
    on conflict (slug) do nothing;

    select id into strict v_organization_id
    from public.organizations
    where slug = 'army-pulse';

    select id into v_trip_id
    from public.trips
    where organization_id = v_organization_id
      and title = 'Cancún · Riviera Maya · Tulum'
      and start_date = '2026-12-26'::date
      and end_date = '2027-01-05'::date;

    if v_trip_id is null then
        insert into public.trips (
            organization_id, title, destination_city, destination_country,
            start_date, end_date, budget_limit, base_currency
        )
        values (
            v_organization_id, 'Cancún · Riviera Maya · Tulum', 'Cancún', 'México',
            '2026-12-26', '2027-01-05', 5000.00, 'USD'
        )
        returning id into v_trip_id;
    end if;

    insert into public.itinerary_items (
        trip_id, day_number, activity_date, title, description, location_name,
        pacing_type, category, is_teen_highlight
    )
    select v_trip_id, item.day_number, item.activity_date, item.title, item.description,
           item.location_name, item.pacing_type, item.category, item.is_teen_highlight
    from (values
        (1,  '2026-12-26'::date, 'Chegada em Cancún', 'Recepção e traslado para hotel Xcaret em Tulum', 'Xcaret Hotel', 'relaxed', 'transfer', false),
        (2,  '2026-12-27'::date, 'Xcaret - Parque Ecoarqueológico', 'Cenotes, rio subterrâneo, shows e praias privadas', 'Xcaret Park', 'intense', 'adventure', true),
        (3,  '2026-12-28'::date, 'Ruínas de Tulum', 'Ruínas maias com vista para o Caribe', 'Ruínas de Tulum', 'moderate', 'culture', true),
        (4,  '2026-12-29'::date, 'Cenote Ik Kil', 'Mergulho e nado em cenote natural subterrâneo', 'Cenote Ik Kil', 'moderate', 'adventure', true),
        (5,  '2026-12-30'::date, 'Xel-Há - Parque Natural', 'Parque de conservação com rios, praias e vida selvagem', 'Xel-Há', 'moderate', 'nature', false),
        (6,  '2026-12-31'::date, 'Dia Livre · Celebração de Ano Novo', 'Descanso e preparação para celebração no hotel', 'Xcaret Hotel', 'relaxed', 'leisure', false),
        (7,  '2027-01-01'::date, 'Praia e Descanso', 'Dia de praia e lazer após Ano Novo', 'Xcaret Hotel Beach', 'relaxed', 'leisure', false),
        (8,  '2027-01-02'::date, 'Cozumel - Mergulho', 'Passeio para Cozumel com mergulho em recife', 'Cozumel Reef', 'intense', 'adventure', true),
        (9,  '2027-01-03'::date, 'Xplor - Parque de Aventura', 'Tirolesas, cavernas submersas e UTV entre cenotes', 'Xplor Park', 'intense', 'adventure', true),
        (10, '2027-01-04'::date, 'Chichen Itzá - Maravilha do Mundo', 'Ruínas maias com guia arqueológico', 'Chichen Itza', 'moderate', 'culture', true),
        (11, '2027-01-05'::date, 'Retorno para o Brasil', 'Traslado para aeroporto e voo de retorno para Goiânia', 'Cancun Airport', 'relaxed', 'transfer', false)
    ) as item(day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
    where not exists (
        select 1
        from public.itinerary_items existing
        where existing.trip_id = v_trip_id
          and existing.day_number = item.day_number
          and existing.title = item.title
    );
end;
$$;
