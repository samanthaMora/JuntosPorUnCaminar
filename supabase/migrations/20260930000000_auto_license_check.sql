-- La cédula se verifica sola (función verify-license) comparando el nombre del
-- doctor con el de la SEP. Si cambia su nombre, hay que volver a verificarla.
create or replace function public.reset_license_on_name_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.full_name is distinct from old.full_name then
    update doctors set license_verified_at = null where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists profiles_reset_license_on_name_change on public.profiles;
create trigger profiles_reset_license_on_name_change
  after update of full_name on public.profiles
  for each row execute function public.reset_license_on_name_change();
