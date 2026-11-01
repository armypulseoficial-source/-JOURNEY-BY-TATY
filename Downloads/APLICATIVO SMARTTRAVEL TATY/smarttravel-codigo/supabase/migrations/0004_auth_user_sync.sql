-- Sincronização automática: quando um novo usuário é criado em auth.users
-- (via magic link ou outro método), criar o registro em public.users automaticamente.

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

-- Backfill de contas existentes que ainda não têm perfil público.
insert into public.users (id, email, full_name)
select
  id,
  email,
  coalesce(user_metadata->>'full_name', email)
from auth.users
where email is not null
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
