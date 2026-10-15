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
