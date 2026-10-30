-- Dados de teste: Organização ARMY Pulse e viagem para Cancún/Riviera Maya

-- Inserir organização ARMY Pulse
insert into public.organizations (name, slug, primary_color, secondary_color)
values (
  'ARMY Pulse',
  'army-pulse',
  '#7c3aed',
  '#4f46e5'
)
on conflict (slug) do nothing;

-- Inserir viagem de teste (Cancún, Riviera Maya, Tulum - 26/12/2026 a 05/01/2027)
insert into public.trips (
  organization_id,
  title,
  destination_city,
  destination_country,
  start_date,
  end_date,
  budget_limit,
  base_currency
)
select
  id,
  'Cancún · Riviera Maya · Tulum',
  'Cancún',
  'México',
  '2026-12-26'::date,
  '2027-01-05'::date,
  5000.00,
  'USD'
from public.organizations
where slug = 'army-pulse'
on conflict do nothing;

-- Inserir itinerários de teste (11 dias de viagem)
insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 1, '2026-12-26'::date, 'Chegada em Cancún', 'Recepção e traslado para hotel Xcaret em Tulum', 'Xcaret Hotel', 'relaxed', 'transfer', false
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 2, '2026-12-27'::date, 'Xcaret - Parque Ecoarqueológico', 'Cenotes, rio subterrâneo, shows e praias privadas', 'Xcaret Park', 'intense', 'adventure', true
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 3, '2026-12-28'::date, 'Ruínas de Tulum', 'Ruínas maias com vista para o Caribe', 'Ruínas de Tulum', 'moderate', 'culture', true
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 4, '2026-12-29'::date, 'Cenote Ik Kil', 'Mergulho e nado em cenote natural subterrâneo', 'Cenote Ik Kil', 'moderate', 'adventure', true
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 5, '2026-12-30'::date, 'Xel-Há - Parque Natural', 'Parque de conservação com rios, praias e vida selvagem', 'Xel-Há', 'moderate', 'nature', false
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 6, '2026-12-31'::date, 'Dia Livre · Celebração de Ano Novo', 'Descanso e preparação para celebração no hotel', 'Xcaret Hotel', 'relaxed', 'leisure', false
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 7, '2027-01-01'::date, 'Praia e Descanso', 'Dia de praia e lazer após Ano Novo', 'Xcaret Hotel Beach', 'relaxed', 'leisure', false
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 8, '2027-01-02'::date, 'Cozumel - Mergulho', 'Passeio para Cozumel com mergulho em recife', 'Cozumel Reef', 'intense', 'adventure', true
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 9, '2027-01-03'::date, 'Xplor - Parque de Aventura', 'Tirolesas, cavernas submersas e UTV entre cenotes', 'Xplor Park', 'intense', 'adventure', true
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 10, '2027-01-04'::date, 'Chichen Itzá - Maravilha do Mundo', 'Ruínas maias com guia arqueológico', 'Chichen Itza', 'moderate', 'culture', true
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;

insert into public.itinerary_items (trip_id, day_number, activity_date, title, description, location_name, pacing_type, category, is_teen_highlight)
select t.id, 11, '2027-01-05'::date, 'Retorno para o Brasil', 'Traslado para aeroporto e voo de retorno para Goiânia', 'Cancun Airport', 'relaxed', 'transfer', false
from public.trips t where t.title = 'Cancún · Riviera Maya · Tulum' on conflict do nothing;
